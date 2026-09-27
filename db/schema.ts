import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  smallint,
  jsonb,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── 1. ENUMS ──────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["learner", "tutor", "admin"]);
export const lessonStatusEnum = pgEnum("lesson_status", ["locked", "in_progress", "completed"]);
export const badgeCriteriaEnum = pgEnum("badge_criteria_type", [
  "first_lesson",
  "lessons_completed",
  "course_complete",
  "streak_days",
  "xp_earned",
]);
export const friendshipStatusEnum = pgEnum("friendship_status", [
  "pending",
  "accepted",
  "rejected",
  "blocked",
]);
export const sessionStatusEnum = pgEnum("session_status", [
  "requested",
  "confirmed",
  "declined",
  "cancelled",
  "completed",
  "no_show",
]);

// ── 2. PROFILES (Extends Supabase auth.users) ─────────────
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: userRoleEnum("role").notNull().default("learner"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  xp: integer("xp").notNull().default(0),
  streakCount: integer("streak_count").notNull().default(0),
  lastActiveDate: date("last_active_date"),
  onboardingDone: boolean("onboarding_done").notNull().default(false),
  dailyGoalMinutes: integer("daily_goal_minutes").notNull().default(15),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 3. COURSES ────────────────────────────────────────────
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  isPublished: boolean("is_published").notNull().default(false),
  createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 4. UNITS ──────────────────────────────────────────────
export const units = pgTable(
  "units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    orderIndex: integer("order_index").notNull().default(0),
    badgeId: uuid("badge_id").references(() => badges.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.courseId, t.orderIndex)]
);

// ── 5. LESSONS ────────────────────────────────────────────
export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    youtubeVideoId: text("youtube_video_id").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    xpReward: integer("xp_reward").notNull().default(10),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.unitId, t.orderIndex)]
);

// ── 6. CHALLENGES ─────────────────────────────────────────
export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  points: integer("points").notNull().default(1),
  orderIndex: integer("order_index").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 7. CHALLENGE_OPTIONS ──────────────────────────────────
export const challengeOptions = pgTable("challenge_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "cascade" }),
  optionText: text("option_text").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 8. ENROLLMENTS ────────────────────────────────────────
export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").notNull().default(true),
    placementAnswer: text("placement_answer"),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.courseId)]
);

// ── 9. USER_PROGRESS ──────────────────────────────────────
export const userProgress = pgTable(
  "user_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    status: lessonStatusEnum("status").notNull().default("locked"),
    score: integer("score"),
    attempts: integer("attempts").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.lessonId)]
);

// ── 10. BADGES ────────────────────────────────────────────
export const badges = pgTable("badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  iconUrl: text("icon_url"),
  criteriaType: badgeCriteriaEnum("criteria_type").notNull(),
  criteriaValue: integer("criteria_value").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 11. USER_BADGES ───────────────────────────────────────
export const userBadges = pgTable(
  "user_badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    badgeId: uuid("badge_id")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.badgeId)]
);

// ── 12. DAILY_ACTIVITY_LOG ────────────────────────────────
export const dailyActivityLog = pgTable(
  "daily_activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    activityDate: date("activity_date").notNull().default(sql`CURRENT_DATE`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.activityDate)]
);

// ── 13. FRIENDSHIPS ───────────────────────────────────────
export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: friendshipStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.requesterId, t.addresseeId)]
);

// ── 14. FRIEND_STREAKS ────────────────────────────────────
export const friendStreaks = pgTable("friend_streaks", {
  id: uuid("id").primaryKey().defaultRandom(),
  friendshipId: uuid("friendship_id")
    .notNull()
    .unique()
    .references(() => friendships.id, { onDelete: "cascade" }),
  streakCount: integer("streak_count").notNull().default(0),
  lastSharedDate: date("last_shared_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 15. TUTOR_PROFILES ────────────────────────────────────
export const tutorProfiles = pgTable("tutor_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tutorId: uuid("tutor_id")
    .notNull()
    .unique()
    .references(() => profiles.id, { onDelete: "cascade" }),
  bio: text("bio"),
  subjects: text("subjects").array(), // Array of subjects/units they teach
  hourlyRate: integer("hourly_rate"), // Nullable if free
  timezone: text("timezone").notNull().default("UTC"),
  isActive: boolean("is_active").notNull().default(true),
  rating: integer("rating").default(0), // 0-5 scale
  totalSessions: integer("total_sessions").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 16. TUTOR_AVAILABILITY ────────────────────────────────
export const tutorAvailability = pgTable("tutor_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  tutorId: uuid("tutor_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  dayOfWeek: smallint("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 17. TUTOR_SESSIONS ────────────────────────────────────
export const tutorSessions = pgTable("tutor_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  tutorId: uuid("tutor_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  durationMins: integer("duration_mins").notNull().default(60),
  status: sessionStatusEnum("status").notNull().default("requested"),
  jitsiRoomId: text("jitsi_room_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 18. SESSION_NOTES ──────────────────────────────────────
export const sessionNotesEnum = pgEnum("session_notes_visibility", ["private_tutor", "shared"]);

export const sessionNotes = pgTable("session_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => tutorSessions.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  noteText: text("note_text").notNull(),
  visibility: sessionNotesEnum("visibility").notNull().default("shared"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 19. SESSION_REQUESTS ───────────────────────────────────
export const sessionRequestStatusEnum = pgEnum("session_request_status", ["pending", "accepted", "declined"]);

export const sessionRequests = pgTable("session_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  tutorId: uuid("tutor_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  requestedSlots: jsonb("requested_slots").notNull(), // Array of requested time slots
  status: sessionRequestStatusEnum("status").notNull().default("pending"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 17. LIBRARY_VIEWS ─────────────────────────────────────
export const libraryViews = pgTable("library_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 18. AI_INTERACTIONS ───────────────────────────────────
export const aiInteractions = pgTable("ai_interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
  triggeredBy: uuid("triggered_by").references(() => profiles.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  prompt: text("prompt").notNull(),
  response: jsonb("response"),
  latencyMs: integer("latency_ms"),
  success: boolean("success").notNull().default(false),
  errorMsg: text("error_msg"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 19. NOTIFICATIONS ───────────────────────────────────────
export const notificationTypeEnum = pgEnum("notification_type", [
  "friend_request",
  "friend_accepted",
  "badge_earned",
  "streak_milestone",
  "lesson_completed",
  "leaderboard_rank",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    data: jsonb("data"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

// ── 20. CONVERSATIONS ───────────────────────────────────────
export const conversationTypeEnum = pgEnum("conversation_type", ["direct", "group"]);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: conversationTypeEnum("type").notNull().default("direct"),
    title: text("title"),
    createdBy: uuid("created_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    directKey: uuid("direct_key").unique(), // For direct conversations, ensures one thread per pair
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    jitsiRoomId: text("jitsi_room_id"), // For group live class rooms
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

// ── 21. CONVERSATION_MEMBERS ───────────────────────────────
export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // "admin" or "member"
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.conversationId, t.userId)]
);

// ── 22. MESSAGES ────────────────────────────────────────────
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  body: text("body").notNull(), // Max 2000 chars enforced by DB check
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 23. BLOCKS ──────────────────────────────────────────────
export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.blockerId, t.blockedId)]
);

// ── 24. MESSAGE_REPORTS ─────────────────────────────────────
export const messageReports = pgTable(
  "message_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("pending"), // "pending", "reviewed", "dismissed"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);
