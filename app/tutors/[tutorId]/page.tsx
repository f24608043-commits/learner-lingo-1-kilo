import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { profiles, tutorProfiles, tutorEnrollments, tutorAvailability, badges, learnerBadges, userRanks } from "@/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import TutorProfileClient from "./TutorProfileClient";
import { notFound } from "next/navigation";
import { getTutorReviews } from "@/app/groups/actions";

export default async function TutorProfilePage({ params }: { params: Promise<{ tutorId: string }> }) {
  const { tutorId } = await params;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, tutorId))
    .limit(1);

  if (!profile) {
    notFound();
  }

  const safeProfile = {
    id: profile.id,
    displayName: profile.displayName || "Tutor",
    avatarUrl: profile.avatarUrl,
  };

  const [tutorProfile] = await db
    .select()
    .from(tutorProfiles)
    .where(eq(tutorProfiles.tutorId, tutorId))
    .limit(1);

  if (!tutorProfile) {
    notFound();
  }

  // Get enrollment stats
  // Get enrollment stats
  const [enrollmentStatsRow] = await db
    .select({
      total: count(),
      enrolled: sql<number>`count(*) filter (where ${tutorEnrollments.status} = 'enrolled')`,
      pending: sql<number>`count(*) filter (where ${tutorEnrollments.status} = 'pending')`,
    })
    .from(tutorEnrollments)
    .where(eq(tutorEnrollments.tutorId, tutorId));

  const enrollmentStats = {
    total: Number(enrollmentStatsRow?.total ?? 0),
    enrolled: Number(enrollmentStatsRow?.enrolled ?? 0),
    pending: Number(enrollmentStatsRow?.pending ?? 0),
  };

  // Get average rating from the tutor profile
  const ratingStats = {
    avgRating: tutorProfile.rating ? Number(tutorProfile.rating) : null,
    totalRatings: tutorProfile.totalSessions ?? 0,
  };

  // Get availability
  const availability = await db
    .select()
    .from(tutorAvailability)
    .where(and(eq(tutorAvailability.tutorId, tutorId), eq(tutorAvailability.isActive, true)))
    .orderBy(tutorAvailability.dayOfWeek);

  // Get badges this tutor commonly awards
  const awardedBadges = await db
    .select({
      badge: {
        id: badges.id,
        name: badges.name,
        iconUrl: badges.iconUrl,
        category: badges.category,
      },
      count: count(),
    })
    .from(learnerBadges)
    .innerJoin(badges, eq(learnerBadges.badgeId, badges.id))
    .innerJoin(tutorEnrollments, and(
      eq(tutorEnrollments.learnerId, learnerBadges.learnerId),
      eq(tutorEnrollments.tutorId, tutorId),
      eq(tutorEnrollments.status, "enrolled")
    ))
    .where(eq(learnerBadges.awardedByTutorId, tutorId))
    .groupBy(badges.id, badges.name, badges.iconUrl, badges.category)
    .orderBy(desc(count()))
    .limit(5);

  // Get tutor's rank
  const [rank] = await db
    .select()
    .from(userRanks)
    .where(eq(userRanks.userId, tutorId))
    .limit(1);

  const reviewsData = await getTutorReviews(tutorId);

  // Only a learner actually enrolled with this tutor may leave a review.
  const { data: { user: viewer } } = await createClient().then((c) => c.auth.getUser());

  let canReview = false;
  if (viewer && viewer.id !== tutorId) {
    const [viewerEnrollment] = await db
      .select({ id: tutorEnrollments.id })
      .from(tutorEnrollments)
      .where(
        and(
          eq(tutorEnrollments.tutorId, tutorId),
          eq(tutorEnrollments.learnerId, viewer.id),
          eq(tutorEnrollments.status, "enrolled")
        )
      )
      .limit(1);
    canReview = Boolean(viewerEnrollment);
  }

  return (
    <TutorProfileClient
      profile={safeProfile}
      tutorProfile={tutorProfile}
      enrollmentStats={enrollmentStats}
      ratingStats={ratingStats}
      availability={availability}
      awardedBadges={awardedBadges}
      rank={rank}
      reviews={reviewsData.reviews}
      reviewAverage={reviewsData.average}
      reviewTotal={reviewsData.total}
      canReview={canReview}
      currentUserId={viewer?.id ?? ""}
    />
  );
}