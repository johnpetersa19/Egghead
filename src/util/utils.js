import Gio from "gi://Gio";
import Soup from "gi://Soup";
import GLib from "gi://GLib";

const BASE_URL = "https://opentdb.com";

Gio._promisify(
  Soup.Session.prototype,
  "send_and_read_async",
  "send_and_read_finish"
);

const httpSession = new Soup.Session();

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

export function shuffle(array) {
  let currIdx = array.length,
    tempVal,
    randIdx;
  while (0 !== currIdx) {
    randIdx = Math.floor(Math.random() * currIdx);
    currIdx -= 1;
    tempVal = array[currIdx];
    array[currIdx] = array[randIdx];
    array[randIdx] = tempVal;
  }

  return array;
}

export async function fetchData(url) {
  try {
    const message = Soup.Message.new("GET", url);

    const bytes = await httpSession.send_and_read_async(
      message,
      GLib.PRIORITY_DEFAULT,
      null
    );

    if (message.get_status() !== Soup.Status.OK) {
      console.error(`HTTP Status ${message.get_status()}`);
      throw new Error("Failed to fetch data");
    }

    const textDecoder = new TextDecoder("utf-8");
    const decodedText = textDecoder.decode(bytes.toArray());
    const data = JSON.parse(decodedText);

    return data;
  } catch (error) {
    console.error(error);
  }
}

export function getQuestionCount(data, difficulty) {
  switch (difficulty) {
    case "mixed":
      return data?.category_question_count?.total_question_count;
    case "easy":
      return data?.category_question_count?.total_easy_question_count;
    case "medium":
      return data?.category_question_count?.total_medium_question_count;
    case "hard":
      return data?.category_question_count?.total_hard_question_count;
    default:
      throw new Error("An error occurred while retrivieving question count");
  }
}

function getQuizCountForEachReq(totalQuiz) {
  const quizCountPerBatch = [];
  while (totalQuiz >= 50) {
    quizCountPerBatch.push(50);
    totalQuiz -= 50;
  }
  if (totalQuiz > 0) {
    quizCountPerBatch.push(totalQuiz);
  }
  return quizCountPerBatch;
}

export async function fetchQuiz(category, difficulty) {
  const tokenUrl = `${BASE_URL}/api_token.php?command=request`;
  const quizCountUrl = `${BASE_URL}/api_count.php?category=${category}`;
  console.log("fetching data");

  const [tokenData, quizCount] = await Promise.all(
    [tokenUrl, quizCountUrl].map(async (url) => {
      const responseData = await fetchData(url);
      return responseData;
    })
  );

  if (!tokenData || !quizCount) {
    throw new Error("An error occurred while fetching token and quiz count");
  }

  const count = getQuestionCount(quizCount, difficulty);
  // Get maximum of 50 questions for the start
  const quizCountForEachReq = getQuizCountForEachReq(count > 50 ? 50 : count);
  const quizUrl = `${BASE_URL}/api.php?category=${category}&difficulty=${difficulty}&token=${tokenData.token}`;

  const urls = quizCountForEachReq.map((c) => `${quizUrl}&amount=${c}`);

  const data = await Promise.all(
    urls.map(async (url) => {
      const data = await fetchData(url);
      return data?.results ?? [];
    })
  );

  return data.flat(1);
}
