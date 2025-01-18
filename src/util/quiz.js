import GObject from "gi://GObject";

export const initialQuiz = {
  type: "",
  difficulty: "",
  category: "",
  question: "",
  correct_answer: "",
  answers: ["", "", "", ""],
};


const Answers = GObject.registerClass(
  {
    GTypeName: "Answers",
    Properties: {
      answer_1: GObject.ParamSpec.string(
        "answer_1",
        "answer1",
        "First answer",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      answer_2: GObject.ParamSpec.string(
        "answer_2",
        "answer2",
        "Second answer",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      answer_3: GObject.ParamSpec.string(
        "answer_3",
        "answer3",
        "Third answer",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      answer_4: GObject.ParamSpec.string(
        "answer_4",
        "answer4",
        "Fourth answer",
        GObject.ParamFlags.READWRITE,
        ""
      ),
    },
  },
  class Answers extends GObject.Object {
    constructor(answers) {
      super();
      this.answer_1 = answers[0];
      this.answer_2 = answers[1];
      if (answers.length > 2) {
        this.answer_3 = answers[2];
        this.answer_4 = answers[3];
      } else {
        this.answer_3 = "";
        this.answer_4 = "";
      }
    }
  }
);

export const Quiz = GObject.registerClass(
  {
    GTypeName: "Quiz",
    Properties: {
      type: GObject.ParamSpec.string(
        "type",
        "Type",
        "Type of quiz",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      difficulty: GObject.ParamSpec.string(
        "difficulty",
        "Difficulty",
        "Quiz difficulty",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      category: GObject.ParamSpec.string(
        "category",
        "Category",
        "Quiz category",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      question: GObject.ParamSpec.string(
        "question",
        "Question",
        "Current Question",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      correct_answer: GObject.ParamSpec.string(
        "correct_answer",
        "correctAnswer",
        "Correct answer",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      answers: GObject.ParamSpec.object(
        "answers",
        "Answers",
        "Possible answers",
        GObject.ParamFlags.READWRITE,
        GObject.Object
      ),
    },
  },
  class Quiz extends GObject.Object {
    constructor(quiz) {
      super();
      this.type = quiz.type;
      this.difficulty = quiz.difficulty;
      this.category = quiz.category;
      this.question = quiz.question;
      this.correct_answer = quiz.correct_answer;
      this.answers = new Answers(quiz.answers);
    }
  }
);
