import GObject from "gi://GObject";

export const initialQuiz = {
  type: "",
  difficulty: "",
  category: "multiple",
  question: "",
  correct_answer: "",
  answers: [
    { answer: "", active: false, sensitive: true, css_classes: [""] },
    { answer: "", active: false, sensitive: true, css_classes: [""] },
    { answer: "", active: false, sensitive: true, css_classes: [""] },
    { answer: "", active: false, sensitive: true, css_classes: [""] },
  ],
};

const Answer = GObject.registerClass(
  {
    GTypeName: "Answer",
    Properties: {
      answer: GObject.ParamSpec.string(
        "answer",
        "Answer",
        "One of the possible answers",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      active: GObject.ParamSpec.boolean(
        "active",
        "Active",
        "Is this CheckButton active",
        GObject.ParamFlags.READWRITE,
        false
      ),
      sensitive: GObject.ParamSpec.boolean(
        "sensitive",
        "Sensitive",
        "Is this CheckButton sensitive",
        GObject.ParamFlags.READWRITE,
        true
      ),
      css_classes: GObject.ParamSpec.boxed(
        "css-classes",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        GObject.type_from_name("GStrv")
      ),
    },
  },
  class extends GObject.Object {
    constructor({ answer, active, sensitive, css_classes }) {
      super();
      this.answer = answer;
      this.active = active;
      this.sensitive = sensitive;
      this.css_classes = css_classes;
    }
  }
);

const Answers = GObject.registerClass(
  {
    GTypeName: "Answers",
    Properties: {
      answer_1: GObject.ParamSpec.object(
        "answer_1",
        "answer1",
        "First answer",
        GObject.ParamFlags.READWRITE,
        new Answer({ answer: "", active: false, sensitive: true })
      ),
      answer_2: GObject.ParamSpec.object(
        "answer_2",
        "answer2",
        "Second answer",
        GObject.ParamFlags.READWRITE,
        new Answer({ answer: "", active: false, sensitive: true })
      ),
      answer_3: GObject.ParamSpec.object(
        "answer_3",
        "answer3",
        "Third answer",
        GObject.ParamFlags.READWRITE,
        new Answer({ answer: "", active: false, sensitive: true })
      ),
      answer_4: GObject.ParamSpec.object(
        "answer_4",
        "answer4",
        "Fourth answer",
        GObject.ParamFlags.READWRITE,
        new Answer({ answer: "", active: false, sensitive: true })
      ),
    },
  },
  class Answers extends GObject.Object {
    constructor(answers) {
      super();
      this.answer_1 = new Answer(answers[0]);
      this.answer_2 = new Answer(answers[1]);
      this.answer_3 = new Answer(answers[2]);
      this.answer_4 = new Answer(answers[3]);
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
