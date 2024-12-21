import Adw from "gi://Adw";
import GObject from "gi://GObject";
import Gio from "gi://Gio";

export const EggheadPreferencesDialog = GObject.registerClass(
  {
    GTypeName: "EggheadPreferencesDialog",
    Template: "resource:///io/github/josephmawa/Egghead/preferences.ui",
    InternalChildren: ["system", "dark", "light"],
    Properties: {
      theme: GObject.ParamSpec.string(
        "theme",
        "Theme",
        "Preferred theme",
        GObject.ParamFlags.READWRITE,
        ""
      ),
    },
  },
  class EggheadPreferencesDialog extends Adw.PreferencesDialog {
    constructor(options = {}) {
      super(options);

      this.settings = Gio.Settings.new("io.github.josephmawa.Egghead");
      this.settings.bind(
        "preferred-theme",
        this,
        "theme",
        Gio.SettingsBindFlags.DEFAULT
      );

      this.bind_property_full(
        "theme",
        this._system,
        "active",
        GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
        (_, theme) => [true, theme === "system"],
        (_, theme) => [theme, "system"]
      );

      this.bind_property_full(
        "theme",
        this._light,
        "active",
        GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
        (_, theme) => [true, theme === "light"],
        (_, theme) => [theme, "light"]
      );

      this.bind_property_full(
        "theme",
        this._dark,
        "active",
        GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
        (_, theme) => [true, theme === "dark"],
        (_, theme) => [theme, "dark"]
      );
    }
  }
);
