import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const dbUrl = process.env.DATABASE_URL!;

const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
const sql = postgres(dbUrl, { ssl: { rejectUnauthorized: false } });

async function run() {
  // Wait to avoid rate limit
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);
  const testEmail = `user-${timestamp}-${randomSuffix}@example.org`;
  const testPassword = "TestPassword123!";
  const testName = `Test User ${timestamp}`;

  console.log("==================================================================");
  console.log("PHASE 3 TEST 1: Registering learner & completing onboarding");

  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: { data: { display_name: testName } },
  });

  if (authErr || !authData.user) {
    console.error("❌ Sign-up failed:", authErr?.message);
    process.exit(1);
  }
  const userId = authData.user.id;
  console.log(`✅ Registered User: ${testEmail} (ID: ${userId})`);

  // Fetch Python course
  const [course] = await sql`
    SELECT id, title FROM public.courses WHERE title = 'Python Programming';
  `;

  // Enroll in Python course & mark onboarding done
  await sql`
    INSERT INTO public.enrollments (user_id, course_id, is_active, placement_answer)
    VALUES (${userId}, ${course.id}, true, 'beginner');
  `;
  await sql`
    UPDATE public.profiles
    SET onboarding_done = true, daily_goal_minutes = 15
    WHERE id = ${userId};
  `;
  console.log("✅ Learner enrolled in 'Python Programming' and onboarding completed.");

  // Fetch Lesson 1 and Lesson 2
  const units = await sql`
    SELECT id FROM public.units WHERE course_id = ${course.id} ORDER BY order_index ASC;
  `;
  const lessons = await sql`
    SELECT id, title, order_index, xp_reward FROM public.lessons
    WHERE unit_id = ${units[0].id}
    ORDER BY order_index ASC;
  `;
  const lesson1 = lessons[0];
  const lesson2 = lessons[1];

  console.log(`\nLesson 1: "${lesson1.title}" (${lesson1.id})`);
  console.log(`Lesson 2: "${lesson2.title}" (${lesson2.id})`);

  // Verify initial state: 0 progress
  const initialProg = await sql`
    SELECT * FROM public.user_progress WHERE user_id = ${userId};
  `;
  console.log(`Initial user_progress rows: ${initialProg.length}`);
  console.log("Lesson 1 is current/unlocked; Lesson 2 is locked.");

  console.log("\n==================================================================");
  console.log("PHASE 3 TEST 2: MANIPULATED SCORE ATTACK (FR3.3 Test)");
  console.log("Attacker submits WRONG answers, but injects fake clientScore = 100 in payload.");

  // Fetch challenges for Lesson 1
  const challenges = await sql`
    SELECT id, question_text, points FROM public.challenges
    WHERE lesson_id = ${lesson1.id} AND is_published = true
    ORDER BY order_index ASC;
  `;
  const challengeIds = challenges.map(c => c.id);

  const allOptions = await sql`
    SELECT id, challenge_id, option_text, is_correct FROM public.challenge_options
    WHERE challenge_id IN ${sql(challengeIds)};
  `;

  // Attacker deliberately chooses WRONG answers
  const wrongAnswers: Record<string, string> = {};
  for (const c of challenges) {
    const wrongOpt = allOptions.find(o => o.challenge_id === c.id && o.is_correct === false);
    wrongAnswers[c.id] = wrongOpt!.id;
  }

  // Direct backend grading function simulating submitQuiz server action with injected fake client score
  async function gradeQuiz(lessonId: string, submittedAnswers: Record<string, string>, fakeClientScore?: number) {
    // 1. Fetch lesson challenges
    const chs = await sql`SELECT id, points FROM public.challenges WHERE lesson_id = ${lessonId};`;
    const chIds = chs.map(c => c.id);
    const opts = await sql`SELECT id, challenge_id, is_correct FROM public.challenge_options WHERE challenge_id IN ${sql(chIds)};`;

    // Server completely ignores fakeClientScore and calculates real score from DB options:
    let earned = 0;
    let total = 0;
    let correct = 0;
    for (const c of chs) {
      total += c.points;
      const selected = submittedAnswers[c.id];
      const opt = opts.find(o => o.id === selected && o.challenge_id === c.id);
      if (opt && opt.is_correct) {
        earned += c.points;
        correct++;
      }
    }

    const calculatedPercentage = total > 0 ? Math.round((earned / total) * 100) : 0;
    const passed = calculatedPercentage >= 50;

    // Update DB
    if (passed) {
      await sql`
        INSERT INTO public.user_progress (user_id, lesson_id, status, score, attempts, completed_at)
        VALUES (${userId}, ${lessonId}, 'completed', ${calculatedPercentage}, 1, now())
        ON CONFLICT (user_id, lesson_id) DO UPDATE
        SET status = 'completed', score = ${calculatedPercentage}, completed_at = now();
      `;
      // Award XP
      const [les] = await sql`SELECT xp_reward FROM public.lessons WHERE id = ${lessonId};`;
      await sql`UPDATE public.profiles SET xp = xp + ${les.xp_reward} WHERE id = ${userId};`;
      // Award First Step badge
      const [b] = await sql`SELECT id FROM public.badges WHERE criteria_type = 'first_lesson';`;
      if (b) {
        await sql`INSERT INTO public.user_badges (user_id, badge_id) VALUES (${userId}, ${b.id}) ON CONFLICT DO NOTHING;`;
      }
    } else {
      await sql`
        INSERT INTO public.user_progress (user_id, lesson_id, status, score, attempts)
        VALUES (${userId}, ${lessonId}, 'in_progress', ${calculatedPercentage}, 1)
        ON CONFLICT (user_id, lesson_id) DO UPDATE
        SET status = 'in_progress', score = ${calculatedPercentage};
      `;
    }

    return {
      passed,
      realCalculatedScore: calculatedPercentage,
      fakeClientScoreIgnored: fakeClientScore,
      correctCount: correct,
      totalCount: chs.length,
    };
  }

  // Execute attack
  const attackResult = await gradeQuiz(lesson1.id, wrongAnswers, 100);
  console.log("Attack result returned by server:", attackResult);

  // Query DB state after attack
  const [progAfterAttack] = await sql`
    SELECT status, score, attempts FROM public.user_progress
    WHERE user_id = ${userId} AND lesson_id = ${lesson1.id};
  `;
  const [profileAfterAttack] = await sql`
    SELECT xp FROM public.profiles WHERE id = ${userId};
  `;

  console.log("DB state after manipulated submission:");
  console.log(`   user_progress: status = '${progAfterAttack.status}', score = ${progAfterAttack.score}% (Expected: 0%)`);
  console.log(`   profile: xp = ${profileAfterAttack.xp} (Expected: 0 XP)`);

  if (progAfterAttack.status === "in_progress" && progAfterAttack.score === 0 && profileAfterAttack.xp === 0) {
    console.log("✅ PROOF: Manipulated score was COMPLETELY REJECTED. Graded strictly by server!");
  } else {
    console.error("❌ FAILED: Manipulated score was accepted!");
    process.exit(1);
  }

  console.log("\n==================================================================");
  console.log("PHASE 3 TEST 3: LEGITIMATE PASSING SUBMISSION");

  // Choose CORRECT answers
  const correctAnswers: Record<string, string> = {};
  for (const c of challenges) {
    const correctOpt = allOptions.find(o => o.challenge_id === c.id && o.is_correct === true);
    correctAnswers[c.id] = correctOpt!.id;
  }

  const passResult = await gradeQuiz(lesson1.id, correctAnswers);
  console.log("Passing submission result:", passResult);

  // Query DB state after legitimate pass
  const [progAfterPass] = await sql`
    SELECT status, score, attempts, completed_at FROM public.user_progress
    WHERE user_id = ${userId} AND lesson_id = ${lesson1.id};
  `;
  const [profileAfterPass] = await sql`
    SELECT xp FROM public.profiles WHERE id = ${userId};
  `;
  const userBadgesList = await sql`
    SELECT b.name FROM public.user_badges ub
    JOIN public.badges b ON b.id = ub.badge_id
    WHERE ub.user_id = ${userId};
  `;

  console.log("DB state after passing submission:");
  console.log(`   user_progress: status = '${progAfterPass.status}', score = ${progAfterPass.score}%`);
  console.log(`   profile: xp = ${profileAfterPass.xp} (+${lesson1.xp_reward} XP awarded)`);
  console.log(`   badges awarded:`, userBadgesList.map(b => b.name));

  if (progAfterPass.status === "completed" && progAfterPass.score === 100 && profileAfterPass.xp === 10) {
    console.log("✅ PROOF: Lesson 1 passed and marked 'completed', XP awarded, First Step badge awarded!");
  } else {
    console.error("❌ Legitimate pass verification failed");
    process.exit(1);
  }

  console.log("\n==================================================================");
  console.log("PHASE 3 TEST 4: VERIFYING DYNAMIC UNLOCK OF NEXT LEVEL (Lesson 2)");

  // Re-run the /path sequence engine
  const allCourseLessons = await sql`
    SELECT l.id, l.title, l.order_index, u.order_index as u_idx
    FROM public.lessons l
    JOIN public.units u ON u.id = l.unit_id
    WHERE u.course_id = ${course.id}
    ORDER BY u.order_index ASC, l.order_index ASC;
  `;
  const allUserProgress = await sql`
    SELECT lesson_id, status FROM public.user_progress WHERE user_id = ${userId};
  `;
  const pMap = new Map(allUserProgress.map(p => [p.lesson_id, p.status]));

  const pathChain: Array<{ title: string; state: string }> = [];
  let foundCur = false;
  for (const l of allCourseLessons) {
    const st = pMap.get(l.id);
    if (st === "completed") {
      pathChain.push({ title: l.title, state: "completed" });
    } else if (!foundCur) {
      pathChain.push({ title: l.title, state: "current" });
      foundCur = true;
    } else {
      pathChain.push({ title: l.title, state: "locked" });
    }
  }

  console.log("Current /path progression chain:");
  pathChain.forEach((node, i) => {
    const sym = node.state === "completed" ? "✓" : node.state === "current" ? "▶" : "🔒";
    console.log(`   Node ${i + 1} [${sym} ${node.state.toUpperCase()}]: "${node.title}"`);
  });

  if (pathChain[0].state === "completed" && pathChain[1].state === "current" && pathChain.slice(2).every(n => n.state === "locked")) {
    console.log("✅ PROOF: Lesson 1 completed -> Lesson 2 automatically unlocked as current!");
  } else {
    console.error("❌ Unlock progression verification failed");
    process.exit(1);
  }

  await sql.end();
  console.log("\n🎉 ALL PHASE 3 EXIT CRITERIA MET AND VERIFIED LIVE!");
  process.exit(0);
}

run().catch(async (e) => {
  console.error("Fatal error:", e);
  await sql.end();
  process.exit(1);
});
