import GObject from "gi://GObject";
import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";

import { Category } from "./category.js";
import { triviaCategories } from "./util/data.js";
import { parseTriviaCategories } from "./util/utils.js";

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
    },
    InternalChildren: [
      "main_stack",
      "split_view",
      "search_bar",
      "list_view",
      "difficulty_level_stack",
    ],
  },
  class EggheadWindow extends Adw.ApplicationWindow {
    constructor(application) {
      super({ application });

      this.createActions();
      this.createSidebar();

      this.loadStyles();
      this.bindSettings();
      this.setPreferredColorScheme();
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
      startQuiz.connect("activate", () => {
        this._main_stack.visible_child_name = "download_view";
        this._is_downloading = true;
      });

      const goBack = new Gio.SimpleAction({
        name: "go-back",
      });
      goBack.connect("activate", () => {
        if (this._is_downloading) {
          const alertDialog = new Adw.AlertDialog({
            heading: _("Cancel Download"),
            body: _(
              "Downloading quiz. Are you sure you want to cancel this download?"
            ),
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
            // Cancel download and switch view
            this._main_stack.visible_child_name = "quiz_view";
          });

          alertDialog.present(this);
        }
      });

      this.add_action(toggleSidebar);
      this.add_action(enableSearchMode);
      this.add_action(startQuiz);
      this.add_action(goBack);
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
  }
);
