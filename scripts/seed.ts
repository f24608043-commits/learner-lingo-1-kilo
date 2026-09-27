import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function seed() {
  console.log("🌱 Seeding Python Programming course...");

  // Clean existing course if any
  const existingCourses = await sql`
    SELECT id FROM public.courses WHERE title = 'Python Programming';
  `;
  if (existingCourses.length > 0) {
    console.log("Cleaning existing Python course...");
    await sql`DELETE FROM public.courses WHERE title = 'Python Programming';`;
  }

  // 1. Insert Course
  const [course] = await sql`
    INSERT INTO public.courses (title, description, cover_url, is_published)
    VALUES (
      'Python Programming',
      'Master the world’s most versatile programming language from scratch. Learn syntax, logic, data structures, and functions through interactive video lessons and quizzes.',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5',
      true
    )
    RETURNING id, title;
  `;
  console.log(`✅ Created Course: ${course.title} (${course.id})`);

  // 2. Insert Unit 1: Python Fundamentals
  const [unit1] = await sql`
    INSERT INTO public.units (course_id, title, description, order_index)
    VALUES (
      ${course.id},
      'Python Fundamentals',
      'Get started with basic syntax, variables, and decision-making logic.',
      0
    )
    RETURNING id, title;
  `;
  console.log(`  ✅ Unit 1: ${unit1.title}`);

  // Lessons for Unit 1
  const [u1l1] = await sql`
    INSERT INTO public.lessons (unit_id, title, description, youtube_video_id, order_index, xp_reward, is_published)
    VALUES (
      ${unit1.id},
      'Introduction to Python',
      'What is Python, how does it run, and why is it used everywhere from web development to AI?',
      'kqtD5dpn9C8',
      0,
      10,
      true
    )
    RETURNING id, title;
  `;

  const [u1l2] = await sql`
    INSERT INTO public.lessons (unit_id, title, description, youtube_video_id, order_index, xp_reward, is_published)
    VALUES (
      ${unit1.id},
      'Variables & Data Types',
      'Understand strings, integers, floats, and booleans in Python.',
      'cKxRvEZd3Mw',
      1,
      15,
      true
    )
    RETURNING id, title;
  `;

  const [u1l3] = await sql`
    INSERT INTO public.lessons (unit_id, title, description, youtube_video_id, order_index, xp_reward, is_published)
    VALUES (
      ${unit1.id},
      'Conditionals & Logic',
      'Control program flow using if, elif, and else statements.',
      'AWek49wXGzI',
      2,
      20,
      true
    )
    RETURNING id, title;
  `;

  // 3. Insert Unit 2: Data Structures & Functions
  const [unit2] = await sql`
    INSERT INTO public.units (course_id, title, description, order_index)
    VALUES (
      ${course.id},
      'Data Structures & Functions',
      'Organize collections of data and write reusable modular code.',
      1
    )
    RETURNING id, title;
  `;
  console.log(`  ✅ Unit 2: ${unit2.title}`);

  // Lessons for Unit 2
  const [u2l1] = await sql`
    INSERT INTO public.lessons (unit_id, title, description, youtube_video_id, order_index, xp_reward, is_published)
    VALUES (
      ${unit2.id},
      'Working with Lists',
      'Create, index, slice, and manipulate dynamic lists.',
      'W8KRzm-HUcc',
      0,
      20,
      true
    )
    RETURNING id, title;
  `;

  const [u2l2] = await sql`
    INSERT INTO public.lessons (unit_id, title, description, youtube_video_id, order_index, xp_reward, is_published)
    VALUES (
      ${unit2.id},
      'Defining Functions',
      'Learn how to write def functions, pass arguments, and return values.',
      'u-OmVr_fTKA',
      1,
      25,
      true
    )
    RETURNING id, title;
  `;

  const [u2l3] = await sql`
    INSERT INTO public.lessons (unit_id, title, description, youtube_video_id, order_index, xp_reward, is_published)
    VALUES (
      ${unit2.id},
      'Building Your First Script',
      'Assemble everything together to build a complete interactive CLI program.',
      '_uQrJ0TkZlc',
      2,
      30,
      true
    )
    RETURNING id, title;
  `;

  console.log(`  ✅ 6 Lessons created across 2 units.`);

  // 4. Seed sample quiz questions for Lesson 1
  const [ch1] = await sql`
    INSERT INTO public.challenges (lesson_id, question_text, points, order_index, is_published)
    VALUES (
      ${u1l1.id},
      'Which symbol is used for comments in Python?',
      1,
      0,
      true
    )
    RETURNING id;
  `;
  await sql`
    INSERT INTO public.challenge_options (challenge_id, option_text, is_correct, order_index)
    VALUES
      (${ch1.id}, '//', false, 0),
      (${ch1.id}, '/* */', false, 1),
      (${ch1.id}, '#', true, 2),
      (${ch1.id}, '<!-- -->', false, 3);
  `;

  const [ch2] = await sql`
    INSERT INTO public.challenges (lesson_id, question_text, points, order_index, is_published)
    VALUES (
      ${u1l1.id},
      'What is the standard file extension for Python scripts?',
      1,
      1,
      true
    )
    RETURNING id;
  `;
  await sql`
    INSERT INTO public.challenge_options (challenge_id, option_text, is_correct, order_index)
    VALUES
      (${ch2.id}, '.pt', false, 0),
      (${ch2.id}, '.py', true, 1),
      (${ch2.id}, '.pyt', false, 2),
      (${ch2.id}, '.python', false, 3);
  `;

  console.log("  ✅ Sample challenges and options seeded for Lesson 1.");

  // Also seed a second published course for multi-course onboarding picker testing
  const [course2] = await sql`
    INSERT INTO public.courses (title, description, cover_url, is_published)
    VALUES (
      'Web Development with JavaScript',
      'Learn modern JavaScript, DOM manipulation, and asynchronous programming for interactive web applications.',
      'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a',
      true
    )
    ON CONFLICT DO NOTHING
    RETURNING id, title;
  `;
  if (course2) {
    console.log(`✅ Created second Course: ${course2.title}`);
  }

  await sql.end();
  console.log("\n🎉 SEED COMPLETED SUCCESSFULLY!");
  process.exit(0);
}

seed().catch(async (e) => {
  console.error("Seed error:", e);
  await sql.end();
  process.exit(1);
});
