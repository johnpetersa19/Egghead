import GObject from "gi://GObject";
import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import Soup from "gi://Soup";
import GLib from "gi://GLib";

import { Category } from "./category.js";
import { triviaCategories, quiz } from "./util/data.js";
import {
  parseTriviaCategories,
  shuffle,
  fetchData,
  getQuestionCount,
} from "./util/utils.js";
import { Quiz, initialQuiz } from "./util/quiz.js";
import { Page } from "./util/page.js";

Gio._promisify(
  Soup.Session.prototype,
  "send_and_read_async",
  "send_and_read_finish"
);

const httpSession = new Soup.Session();
const BASE_URL = "https://opentdb.com";

export const EggheadWindow = GObject.registerClass(
  {
    GTypeName: "EggheadWindow",
    Template: __getResourceUri__("window.ui"),
    Properties: {
      category_name: GObject.ParamSpec.string(
        "category_name",
        "categoryName",
        "Selected Category Name",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      category_id: GObject.ParamSpec.int(
        "category_id",
        "categoryId",
        "Selected Category ID",
        GObject.ParamFlags.READWRITE,
        0
      ),
      is_downloading: GObject.ParamSpec.boolean(
        "is_downloading",
        "isDownloading",
        "Is downloading quiz",
        GObject.ParamFlags.READWRITE,
        false
      ),
      selected: GObject.ParamSpec.int(
        "selected",
        "Selected",
        "Selected quiz index",
        GObject.ParamFlags.READWRITE,
        0
      ),
      current_question: GObject.ParamSpec.string(
        "current_question",
        "currentQuestion",
        "Current question",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      quiz: GObject.ParamSpec.object(
        "quiz",
        "Quiz",
        "Current Quiz",
        GObject.ParamFlags.READWRITE,
        new Quiz(initialQuiz)
      ),
    },
    InternalChildren: [
      "main_stack",
      "split_view",
      "search_bar",
      "list_view",
      "pagination_list_view",
      "single_selection",
      "difficulty_level_stack",
      "solutions",
      "question",
      "go_to_first_page_btn",
      "go_to_prev_page_btn",
      "go_to_last_page_btn",
      "go_to_next_page_btn",
      "mixed",
      "easy",
      "medium",
      "hard",
      "solution_1",
      "solution_2",
      "solution_3",
      "solution_4",
    ],
  },
  class EggheadWindow extends Adw.ApplicationWindow {
    constructor(application) {
      super({ application });
      this.data = [initialQuiz];
      this.createActions();
      this.createPaginationActions();
      this.createSidebar();

      this.loadStyles();
      this.bindSettings();
      this.setPreferredColorScheme();
      this.setDefaultDifficultyLevel();
      this.setListViewModel();
      this.bindPaginationBtns();
      this.bindQuiz();
    }

    setSelectedCategory = (category) => {
      this.category_name = category.name;
      this.category_id = category.id;

      if (category.hasChildren) {
        this._difficulty_level_stack.visible_child_name = "category_view";
      } else {
        this._difficulty_level_stack.visible_child_name = "sub_category_view";
      }
    };

    createActions = () => {
      const toggleSidebar = new Gio.SimpleAction({ name: "toggle-sidebar" });
      toggleSidebar.connect("activate", (action) => {
        this._split_view.show_sidebar = !this._split_view.show_sidebar;
      });

      const enableSearchMode = new Gio.SimpleAction({
        name: "enable-search-mode",
      });
      enableSearchMode.connect("activate", (action) => {
        this._search_bar.search_mode_enabled =
          !this._search_bar.search_mode_enabled;
      });

      const startQuiz = new Gio.SimpleAction({
        name: "start-quiz",
      });
      startQuiz.connect("activate", async () => {
        try {
          this._main_stack.visible_child_name = "download_view";
          this._is_downloading = true;

          const questionCountUrl = `${BASE_URL}/api_count.php?category=${this.category_id}`;
          const questionCountObject = await fetchData(questionCountUrl);
          const difficultyLevel = this.settings.get_string("difficulty");
          const questionCount = getQuestionCount(
            questionCountObject,
            difficultyLevel
          );

          let quizUrl;
          if (questionCount > 50) {
            quizUrl = `${BASE_URL}/api.php?amount=50&category=${this.category_id}`;
          } else {
            quizUrl = `${BASE_URL}/api.php?amount=${questionCount}&category=${this.category_id}`;
          }

          const data = await fetchData(quizUrl);
          this.data = this.formatData(data.results);
          this.setListViewModel();
          this.initQuiz();
          this._main_stack.visible_child_name = "quiz_view";
          this._difficulty_level_stack.visible_child_name = "quiz_session_view";
          this._is_downloading = false;
        } catch (error) {
          console.error(err);
          // Switch to error view. Be sure to implement it
        }
      });

      const goBack = new Gio.SimpleAction({
        name: "go-back",
      });
      goBack.connect("activate", () => {
        if (this._is_downloading) {
          const alertDialog = new Adw.AlertDialog({
            heading: _("Cancel Download"),
            body: _("Are you sure you want to cancel this download?"),
            default_response: "cancel_download",
            close_response: "close_dialog",
            presentation_mode: "floating",
          });

          alertDialog.add_response("cancel_download", _("Cancel"));
          alertDialog.add_response("close_dialog", _("Close"));

          alertDialog.set_response_appearance(
            "cancel_download",
            Adw.ResponseAppearance.DESTRUCTIVE
          );
          alertDialog.set_response_appearance(
            "close_dialog",
            Adw.ResponseAppearance.SUGGESTED
          );

          alertDialog.connect("response", (_alertDialog, response) => {
            if (response === "close_dialog") return;
            this._main_stack.visible_child_name = "quiz_view";
            this._is_downloading = false;
          });

          alertDialog.present(this);
        }
      });

      const selectDifficulty = new Gio.SimpleAction({
        name: "select-difficulty",
        parameter_type: GLib.VariantType.new("s"),
      });
      selectDifficulty.connect("activate", (_selectDifficulty, param) => {
        this.settings.set_value("difficulty", param);
      });

      this.add_action(toggleSidebar);
      this.add_action(enableSearchMode);
      this.add_action(startQuiz);
      this.add_action(goBack);
      this.add_action(selectDifficulty);
    };

    createPaginationActions = () => {
      const goToFirstPage = new Gio.SimpleAction({
        name: "go-to-first-page",
      });
      goToFirstPage.connect("activate", () => {
        this.selected = 0;
        this.scrollTo(this.selected);
      });

      const goToLastPage = new Gio.SimpleAction({
        name: "go-to-last-page",
      });
      goToLastPage.connect("activate", () => {
        const numItems = this._pagination_list_view.model.get_n_items();
        this.selected = numItems - 1;
        this.scrollTo(this.selected);
      });

      const goToPreviousPage = new Gio.SimpleAction({
        name: "go-to-previous-page",
      });
      goToPreviousPage.connect("activate", () => {
        if (this.selected === 0) return;

        this.scrollTo(--this.selected);
      });

      const goToNextPage = new Gio.SimpleAction({
        name: "go-to-next-page",
      });
      goToNextPage.connect("activate", () => {
        const numItems = this._pagination_list_view.model.get_n_items();
        if (this.selected === numItems - 1) {
          return;
        }

        this.scrollTo(++this.selected);
      });

      this.add_action(goToFirstPage);
      this.add_action(goToLastPage);
      this.add_action(goToPreviousPage);
      this.add_action(goToNextPage);
    };

    activateCategory(listView, position) {
      const model = listView.model;
      const selectedItem = model?.selected_item?.item;

      if (selectedItem) {
        this.setSelectedCategory(selectedItem);
      }
    }

    handleSearch(searchEntry) {
      this.stringFilter.set_search(searchEntry.text);
    }

    createSidebar = () => {
      this.triviaCategories = parseTriviaCategories(triviaCategories);

      const store = Gio.ListStore.new(Category);
      for (const category of this.triviaCategories) {
        store.append(new Category(category));
      }

      const propExpression = Gtk.PropertyExpression.new(Category, null, "name");
      const stringFilter = Gtk.StringFilter.new(propExpression);
      const filter = Gtk.FilterListModel.new(store, stringFilter);

      this.stringFilter = stringFilter;

      const tree = Gtk.TreeListModel.new(filter, false, false, (item) => {
        if (!item.hasChildren) return null;

        const store = Gio.ListStore.new(Category);
        for (const category of item.children) {
          store.append(new Category(category));
        }

        return store;
      });

      const selection = Gtk.SingleSelection.new(tree);
      const factory = new Gtk.SignalListItemFactory();

      factory.connect("setup", (_, listItem) => {
        listItem.child = new Gtk.TreeExpander({ child: new Gtk.Label() });
      });

      factory.connect("bind", (_, listItem) => {
        const listRow = listItem.item;
        const expander = listItem.child;

        expander.list_row = listRow;

        const label = expander.child;
        const object = listRow.item;

        label.label = object.name;
      });

      this._list_view.model = selection;
      this._list_view.factory = factory;

      this.setSelectedCategory(this.triviaCategories[0]);
    };

    bindSettings = () => {
      this.settings = Gio.Settings.new(pkg.name);
      this.settings.bind(
        "window-width",
        this,
        "default-width",
        Gio.SettingsBindFlags.DEFAULT
      );
      this.settings.bind(
        "window-height",
        this,
        "default-height",
        Gio.SettingsBindFlags.DEFAULT
      );
      this.settings.bind(
        "window-maximized",
        this,
        "maximized",
        Gio.SettingsBindFlags.DEFAULT
      );

      this.settings.connect(
        "changed::preferred-theme",
        this.setPreferredColorScheme
      );

      this.settings.connect(
        "changed::difficulty",
        this.setDefaultDifficultyLevel
      );
    };

    bindPaginationBtns = () => {
      this.bind_property_full(
        "selected",
        this._go_to_first_page_btn,
        "sensitive",
        GObject.BindingFlags.DEFAULT || GObject.BindingFlags.SYNC_CREATE,
        (_, selected) => {
          if (selected > 0) return [true, true];
          return [true, false];
        },
        null
      );

      this.bind_property_full(
        "selected",
        this._go_to_prev_page_btn,
        "sensitive",
        GObject.BindingFlags.DEFAULT || GObject.BindingFlags.SYNC_CREATE,
        (_, selected) => {
          if (selected > 0) return [true, true];
          return [true, false];
        },
        null
      );

      this.bind_property_full(
        "selected",
        this._go_to_last_page_btn,
        "sensitive",
        GObject.BindingFlags.DEFAULT || GObject.BindingFlags.SYNC_CREATE,
        (_, selected) => {
          const numItems = this._pagination_list_view.model.get_n_items();
          if (selected < numItems - 1) return [true, true];
          return [true, false];
        },
        null
      );

      this.bind_property_full(
        "selected",
        this._go_to_next_page_btn,
        "sensitive",
        GObject.BindingFlags.DEFAULT || GObject.BindingFlags.SYNC_CREATE,
        (_, selected) => {
          const numItems = this._pagination_list_view.model.get_n_items();
          if (selected < numItems - 1) return [true, true];
          return [true, false];
        },
        null
      );
    };

    bindQuiz = () => {
      this.bind_property_full(
        "selected",
        this,
        "quiz",
        GObject.BindingFlags.DEFAULT || GObject.BindingFlags.SYNC_CREATE,
        (_, selected) => {
          const quizObject = this.data[selected];

          return [true, new Quiz(quizObject)];
        },
        null
      );
    };

    loadStyles = () => {
      const cssProvider = new Gtk.CssProvider();
      cssProvider.load_from_resource(__getResourcePath__("index.css"));

      Gtk.StyleContext.add_provider_for_display(
        this.display,
        cssProvider,
        Gtk.STYLE_PROVIDER_PRIORITY_USER
      );
    };

    setPreferredColorScheme = () => {
      const preferredColorScheme = this.settings.get_string("preferred-theme");
      const { DEFAULT, FORCE_LIGHT, FORCE_DARK } = Adw.ColorScheme;
      let colorScheme = DEFAULT;

      if (preferredColorScheme === "system") {
        colorScheme = DEFAULT;
      }

      if (preferredColorScheme === "light") {
        colorScheme = FORCE_LIGHT;
      }

      if (preferredColorScheme === "dark") {
        colorScheme = FORCE_DARK;
      }

      this.application.get_style_manager().color_scheme = colorScheme;
    };

    setDefaultDifficultyLevel = () => {
      const difficulty = this.settings.get_string("difficulty");

      switch (difficulty) {
        case "mixed":
          this._mixed.active = true;
          break;

        case "easy":
          this._easy.active = true;
          break;

        case "medium":
          this._medium.active = true;
          break;

        case "hard":
          this._hard.active = true;
          break;

        default:
          throw new Error(`${difficulty} is an invalid difficulty level`);
      }
    };

    setListViewModel = () => {
      const store = Gio.ListStore.new(Page);

      for (let i = 0; i < this.data.length; i++) {
        store.append(new Page(i.toString()));
      }

      this._single_selection.model = store;
      this.selected = 0;

      this._pagination_list_view.connect("activate", (listView, position) => {
        this.selected = position;
        this.scrollTo(position);
      });
    };

    initQuiz = () => {
      this.quiz = new Quiz(this.data[this.selected]);
    };

    scrollTo = (position) => {
      this._pagination_list_view.scroll_to(
        position,
        Gtk.ListScrollFlags.FOCUS,
        null
      );
    };

    formatData = (data) => {
      for (let i = 0; i < data.length; i++) {
        const { correct_answer, incorrect_answers, question } = data[i];
        incorrect_answers.push(correct_answer);

        const answers = incorrect_answers.map((answer) => {
          return __LIB__.decode(answer);
        });

        data[i].answers = shuffle(answers);
        data[i].question = __LIB__.decode(question);
      }

      return shuffle(data);
    };
  }
);
