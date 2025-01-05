export function parseTriviaCategories(categories) {
  const categoriesMap = new Map();

  for (const categoryObject of categories) {
    if (categoryObject.name.includes(":")) {
      let [category, name] = categoryObject.name.split(":");

      category = category.replaceAll("&", "And").trim();
      name = name.replaceAll("&", "And").trim();

      categoryObject.name = name;
      categoryObject.hasChildren = false;
      categoryObject.children = [];

      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, [categoryObject]);
        continue;
      }

      categoriesMap.get(category).push(categoryObject);
      continue;
    }

    categoryObject.hasChildren = false;
    categoryObject.children = [];
    categoryObject.name = categoryObject.name.replaceAll("&", "And");
    categoriesMap.set(categoryObject.name, categoryObject);
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

export function clamp(minimum, maximum, value) {
  if (value < minimum) value = minimum;
  if (value > maximum) value = maximum;

  return value;
}
