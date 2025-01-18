import GObject from "gi://GObject";

export const Page = GObject.registerClass(
  {
    GTypeName: "Page",
    Properties: {
      page: GObject.ParamSpec.string(
        "page",
        "Page",
        "Page number",
        GObject.ParamFlags.READWRITE,
        "0"
      ),
    },
  },
  class Page extends GObject.Object {
    constructor(page) {
      super();
      this.page = page;
    }
  }
);
