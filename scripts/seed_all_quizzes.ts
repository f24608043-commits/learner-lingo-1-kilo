import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function seedQuizzes() {
  console.log("Seeding challenges and options for all 6 lessons in Python Programming...");

  const [course] = await sql`
    SELECT id FROM public.courses WHERE title = 'Python Programming';
  `;
  if (!course) {
    console.error("Course not found!");
    process.exit(1);
  }

  const units = await sql`
    SELECT id, order_index FROM public.units WHERE course_id = ${course.id} ORDER BY order_index ASC;
  `;

  const lessons = await sql`
    SELECT id, unit_id, order_index, title FROM public.lessons
    WHERE unit_id IN ${sql(units.map(u => u.id))}
    ORDER BY unit_id, order_index ASC;
  `;

  const quizData = [
    // Lesson 1: Introduction to Python
    [
      {
        question: "Which symbol is used for single-line comments in Python?",
        options: [
          { text: "//", correct: false },
          { text: "/* */", correct: false },
          { text: "#", correct: true },
          { text: "<!-- -->", correct: false },
        ],
      },
      {
        question: "What is the standard file extension for Python files?",
        options: [
          { text: ".py", correct: true },
          { text: ".pt", correct: false },
          { text: ".pyt", correct: false },
          { text: ".python", correct: false },
        ],
      },
    ],
    // Lesson 2: Variables & Data Types
    [
      {
        question: "What data type is 3.14159 in Python?",
        options: [
          { text: "int", correct: false },
          { text: "float", correct: true },
          { text: "str", correct: false },
          { text: "boolean", correct: false },
        ],
      },
      {
        question: "Which is a valid variable assignment in Python?",
        options: [
          { text: "let x = 10", correct: false },
          { text: "var x = 10", correct: false },
          { text: "x = 10", correct: true },
          { text: "int x = 10", correct: false },
        ],
      },
    ],
    // Lesson 3: Conditionals & Logic
    [
      {
        question: "Which keyword is used for 'else if' conditions in Python?",
        options: [
          { text: "else if", correct: false },
          { text: "elseif", correct: false },
          { text: "elif", correct: true },
          { text: "case", correct: false },
        ],
      },
      {
        question: "What does the expression (5 > 2 and 3 == 3) evaluate to?",
        options: [
          { text: "True", correct: true },
          { text: "False", correct: false },
          { text: "None", correct: false },
          { text: "Error", correct: false },
        ],
      },
    ],
    // Lesson 4: Working with Lists
    [
      {
        question: "How do you access the first element in a Python list named 'items'?",
        options: [
          { text: "items(0)", correct: false },
          { text: "items[0]", correct: true },
          { text: "items[1]", correct: false },
          { text: "items.first()", correct: false },
        ],
      },
      {
        question: "Which list method adds a single item to the end of the list?",
        options: [
          { text: "items.push('item')", correct: false },
          { text: "items.add('item')", correct: false },
          { text: "items.append('item')", correct: true },
          { text: "items.insert('item')", correct: false },
        ],
      },
    ],
    // Lesson 5: Defining Functions
    [
      {
        question: "Which keyword is used to define a function in Python?",
        options: [
          { text: "function", correct: false },
          { text: "def", correct: true },
          { text: "func", correct: false },
          { text: "fn", correct: false },
        ],
      },
      {
        question: "Which keyword is used to return a result from a function?",
        options: [
          { text: "send", correct: false },
          { text: "yield", correct: false },
          { text: "output", correct: false },
          { text: "return", correct: true },
        ],
      },
    ],
    // Lesson 6: Building Your First Script
    [
      {
        question: "Which built-in function is used to take text input from a user in the console?",
        options: [
          { text: "read()", correct: false },
          { text: "scan()", correct: false },
          { text: "input()", correct: true },
          { text: "prompt()", correct: false },
        ],
      },
      {
        question: "How do you convert the user input string '25' into an integer?",
        options: [
          { text: "Integer('25')", correct: false },
          { text: "int('25')", correct: true },
          { text: "parse('25')", correct: false },
          { text: "'25'.toInt()", correct: false },
        ],
      },
    ],
  ];

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    const qSet = quizData[i];

    // Clean existing challenges for this lesson
    await sql`DELETE FROM public.challenges WHERE lesson_id = ${lesson.id};`;

    for (let qIdx = 0; qIdx < qSet.length; qIdx++) {
      const q = qSet[qIdx];
      const [challenge] = await sql`
        INSERT INTO public.challenges (lesson_id, question_text, points, order_index, is_published)
        VALUES (${lesson.id}, ${q.question}, 1, ${qIdx}, true)
        RETURNING id;
      `;

      for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
        const opt = q.options[oIdx];
        await sql`
          INSERT INTO public.challenge_options (challenge_id, option_text, is_correct, order_index)
          VALUES (${challenge.id}, ${opt.text}, ${opt.correct}, ${oIdx});
        `;
      }
    }
    console.log(`✅ Seeded ${qSet.length} questions for: ${lesson.title}`);
  }

  await sql.end();
  console.log("\n🎉 ALL 6 LESSON QUIZZES SEEDED SUCCESSFULLY!");
  process.exit(0);
}

seedQuizzes().catch(async (e) => {
  console.error("Error:", e);
  await sql.end();
  process.exit(1);
});
