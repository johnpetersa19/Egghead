import GObject from "gi://GObject";
import Adw from "gi://Adw";
import Gio from "gi://Gio";

import { Category } from "./category.js";
import { triviaCategories } from "./util/data.js";
import { parseTriviaCategories } from "./util/utils.js";

export const EggheadWindow = GObject.registerClass(
  {
    GTypeName: "EggheadWindow",
    Template: "resource:///io/github/josephmawa/Egghead/window.ui",
    Properties: {
      categories: GObject.ParamSpec.object(
        "categories",
        "Categories",
        "Trivia Categories",
        GObject.ParamFlags.READWRITE,
        Gio.ListStore
      ),
    },
    InternalChildren: ["split_view", "search_bar"],
  },
  class EggheadWindow extends Adw.ApplicationWindow {
    constructor(application) {
      super({ application });

      this.createCategoryListStore();
      this.createActions();
      this.triviaCategories = parseTriviaCategories(triviaCategories);
    }
    createCategoryListStore = () => {
      this.categories = Gio.ListStore.new(Category);

      for (const category of triviaCategories) {
        this.categories.append(new Category(category));
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

      this.add_action(toggleSidebar);
      this.add_action(enableSearchMode);
    };

    activateCategory(listView, position) {
      console.log(position);
    }
  }
);
