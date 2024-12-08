import GObject from "gi://GObject";

export const Category = GObject.registerClass(
  {
    GTypeName: "Category",
    Properties: {
      id: GObject.ParamSpec.int(
        "id",
        "Id",
        "Category Id",
        GObject.ParamFlags.READWRITE,
        0
      ),
      name: GObject.ParamSpec.string(
        "name",
        "Name",
        "Category Name",
        GObject.ParamFlags.READWRITE,
        ""
      ),
    },
  },
  class Category extends GObject.Object {
    constructor({ id, name }) {
      super();
      this.id = id;
      this.name = name;
    }
  }
);
