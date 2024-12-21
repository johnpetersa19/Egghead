export function parseTriviaCategories(categories) {
  const categoriesMap = new Map();

  for (const category of categories) {
    if (category.name.includes(":")) {
      let [_category, _name] = category.name.split(":");

      _category = _category.replaceAll("&", "And").trim();
      _name = _name.replaceAll("&", "And").trim();

      category.name = _name;
      category.hasChildren = false;
      category.children = [];

      if (!categoriesMap.has(_category)) {
        categoriesMap.set(_category, [category]);
        continue;
      }

      categoriesMap.get(_category).push(category);
      continue;
    }

    category.hasChildren = false;
    category.children = [];
    category.name = category.name.replaceAll("&", "And");
    categoriesMap.set(category.name, category);
  }

  const parsedCategories = [];
  let id = 900;

  for (const [key, value] of categoriesMap.entries()) {
    if (Array.isArray(value)) {
      const categoryObject = {
        id: ++id,
        name: key,
        hasChildren: true,
        children: value,
      };
      parsedCategories.push(categoryObject);
      continue;
    }

    parsedCategories.push(value);
  }

  return parsedCategories;
}
