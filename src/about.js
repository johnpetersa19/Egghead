import Adw from "gi://Adw?version=1";
import Gtk from "gi://Gtk"

const aboutParams = {
  application_name: globalThis.__APPLICATION_NAME__,
  developer_name: "Joseph Mawa",
  application_icon: pkg.name,
  version: pkg.version,
  license_type: Gtk.License.LGPL_3_0,
  developers: ["Joseph Mawa"],
  copyright: "Copyright © 2024 Joseph Mawa",
};

export const AboutDialog = () => {
  return new Adw.AboutDialog(aboutParams);
};
