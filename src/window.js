import GObject from "gi://GObject";
import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import GLib from "gi://GLib";

import { Category } from "./category.js";
import { triviaCategories } from "./util/data.js";
import { parseTriviaCategories, fetchQuiz, formatData } from "./util/utils.js";
import { Quiz, initialQuiz } from "./util/quiz.js";
import { Page } from "./util/page.js";

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
        // This requires specifying min and max for binding to work
        0,
        5000,
        9
      ),
      is_downloading: GObject.ParamSpec.boolean(
        "is_downloading",
        "isDownloading",
        "Is downloading quiz",
        GObject.ParamFlags.READWRITE,
        false
      ),
      has_error: GObject.ParamSpec.boolean(
        "has_error",
        "hasError",
        "Has an error occurred?",
        GObject.ParamFlags.READWRITE,
        false
      ),
      game_on: GObject.ParamSpec.boolean(
        "game_on",
        "gameOn",
        "Has started quiz",
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
      quizStore: GObject.ParamSpec.object(
        "quizStore",
        "quiz_store",
        "Quiz list store",
        GObject.ParamFlags.READWRITE,
        GObject.Object
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
      // Pagination
      "go_to_first_page_btn",
      "go_to_prev_page_btn",
      "go_to_last_page_btn",
      "go_to_next_page_btn",
      // Difficulty
      "mixed",
      "easy",
      "medium",
      "hard",
      // Error
      "error_message_label",
    ],
  },
  class EggheadWindow extends Adw.ApplicationWindow {
    constructor(application) {
      super({ application });
      this.quizStore = new Gio.ListStore(Quiz);

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
      this.initCategoryNameProperty();
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
          this.is_downloading = true;

          const difficultyLevel = this.settings.get_string("difficulty");

          const data = await fetchQuiz(this.category_id, difficultyLevel);
          if (data.length === 0) {
            throw new Error("Failed to fetch data");
          }

          const formattedData = formatData(data);

          this.populateListStore(formattedData);
          this.setListViewModel();
          this.initQuiz();

          this._main_stack.visible_child_name = "quiz_view";
          this._difficulty_level_stack.visible_child_name = "quiz_session_view";
          this.is_downloading = false;
        } catch (error) {
          console.error(error);
          this.setError(error.message);
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

        if (this.has_error) {
          this.removeError();
        }
      });

      const selectDifficulty = new Gio.SimpleAction({
        name: "select-difficulty",
        parameter_type: GLib.VariantType.new("s"),
      });
      selectDifficulty.connect("activate", (_selectDifficulty, param) => {
        this.settings.set_value("difficulty", param);
      });

      const deleteSavedQuiz = new Gio.SimpleAction({
        name: "delete-saved-quiz",
      });
      deleteSavedQuiz.connect("activate", () => {
        console.log("deleted saved quiz");
      });

      const pickAnswer = new Gio.SimpleAction({
        name: "pick-answer",
        parameter_type: GLib.VariantType.new("s"),
      });
      pickAnswer.connect("activate", (_pickAnswer, param) => {
        const answerId = param.unpack();
        this.quiz.answers[answerId].active = true;

        const otherIds = [
          "answer_1",
          "answer_2",
          "answer_3",
          "answer_4",
        ].filter((id) => id !== answerId);

        for (const id of otherIds) {
          this.quiz.answers[id].active = false;
        }
        this.quiz.submit_button_sensitive = true;
      });

      const submitSolution = new Gio.SimpleAction({
        name: "submit-solution",
      });
      submitSolution.connect("activate", () => {
        try {
          const answerIds = ["answer_1", "answer_2", "answer_3", "answer_4"];
          let selectedAnswerId, correctAnswerId;
          for (const answerId of answerIds) {
            this.quiz.answers[answerId].sensitive = false;

            if (this.quiz.answers[answerId].active) {
              selectedAnswerId = answerId;
            }

            if (
              this.quiz.answers[answerId].answer === this.quiz.correct_answer
            ) {
              correctAnswerId = answerId;
            }
          }

          if (!selectedAnswerId || !correctAnswerId) {
            throw new Error(
              `Both ${selectedAnswerId} and ${correctAnswerId} should not be undefined`
            );
          }

          if (selectedAnswerId === correctAnswerId) {
            this.quiz.answers[selectedAnswerId].css_classes = ["success"];
          } else {
            this.quiz.answers[selectedAnswerId].css_classes = ["error"];
            this.quiz.answers[correctAnswerId].css_classes = ["success"];
          }

          this.quiz.submit_button_sensitive = false;
        } catch (error) {
          this.setError(error.message);
        }
      });

      this.add_action(toggleSidebar);
      this.add_action(enableSearchMode);
      this.add_action(startQuiz);
      this.add_action(goBack);
      this.add_action(selectDifficulty);
      this.add_action(deleteSavedQuiz);
      this.add_action(pickAnswer);
      this.add_action(submitSolution);
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
        const hBox = new Gtk.Box({
          orientation: Gtk.Orientation.HORIZONTAL,
          halign: Gtk.Align.FILL,
        });

        const hBoxInner1 = new Gtk.Box({
          orientation: Gtk.Orientation.HORIZONTAL,
          halign: Gtk.Align.START,
          hexpand: true,
        });
        const hBoxInner2 = new Gtk.Box({
          orientation: Gtk.Orientation.HORIZONTAL,
          halign: Gtk.Align.END,
          hexpand: true,
        });

        const label = new Gtk.Label();
        const icon = new Gtk.Image({
          icon_name: "egghead-object-select-symbolic",
          visible: false,
          pixel_size: 12,
        });

        hBoxInner1.append(label);
        hBoxInner2.append(icon);

        hBox.append(hBoxInner1);
        hBox.append(hBoxInner2);

        listItem.child = new Gtk.TreeExpander({ child: hBox });
      });

      factory.connect("bind", (_, listItem) => {
        const listRow = listItem.item;
        const expander = listItem.child;

        expander.list_row = listRow;

        const hBox = expander.child;
        const label = hBox?.get_first_child()?.get_first_child();
        const image = hBox?.get_last_child()?.get_first_child();
        const object = listRow.item;

        this.bind_property_full(
          "category_id",
          image,
          "visible",
          GObject.BindingFlags.DEFAULT || GObject.BindingFlags.SYNC_CREATE,
          (_, categoryId) => {
            return [true, object.id === categoryId];
          },
          null
        );

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

      this.settings.bind(
        "category-id",
        this,
        "category_id",
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
          const quizObject = this.quizStore.get_item(selected);
          return [true, quizObject];
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
      const numItems = this.quizStore.get_n_items();

      for (let i = 0; i < numItems; i++) {
        store.append(new Page((i + 1).toString()));
      }

      this._single_selection.model = store;
      this.selected = 0;

      this._pagination_list_view.connect("activate", (listView, position) => {
        this.selected = position;
        this.scrollTo(position);
      });
    };

    initQuiz = () => {
      this.quiz = this.quizStore.get_item(this.selected);
    };

    initCategoryNameProperty = () => {
      const categoryId = this.settings.get_value("category-id")?.unpack();

      for (const category of this.triviaCategories) {
        if (category.id === categoryId) {
          this.category_name = category.name;
          break;
        }

        if (category.hasChildren) {
          const childCategory = category.children.find(
            ({ id }) => id === categoryId
          );

          if (childCategory) {
            this.category_name = childCategory.name;
            break;
          }
        }
      }
    };

    scrollTo = (position) => {
      this._pagination_list_view.scroll_to(
        position,
        Gtk.ListScrollFlags.FOCUS,
        null
      );
    };

    populateListStore = (data) => {
      this.quizStore.remove_all();
      for (const object of data) {
        this.quizStore.append(new Quiz(object));
      }
    };

    setError = (errorMessage) => {
      this.has_error = true;
      this._error_message_label.label = errorMessage;
      this._main_stack.visible_child_name = "error_view";
    };

    removeError = () => {
      this.has_error = false;
      this._error_message_label.label = "";
      this._main_stack.visible_child_name = "quiz_view";
    };
  }
);
