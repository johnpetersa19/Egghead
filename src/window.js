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
    Template: "resource:///io/github/josephmawa/Egghead/window.ui",
    InternalChildren: ["split_view", "search_bar", "list_view"],
  },
  class EggheadWindow extends Adw.ApplicationWindow {
    constructor(application) {
      super({ application });

      this.createActions();
      this.createSidebar();
    }

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
      const model = listView.model;
      const selectedItem = model?.selected_item?.item;

    
    }

    createSidebar = () => {
      this.triviaCategories = parseTriviaCategories(triviaCategories);

      const store = Gio.ListStore.new(Category);
      for (const category of this.triviaCategories) {
        store.append(new Category(category));
      }

      const tree = Gtk.TreeListModel.new(store, false, false, (item) => {
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
    };
  }
);
