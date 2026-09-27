"use server";

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { courses, profiles, units, lessons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function createCourse(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // NFR5: re-validate admin role server-side, independent of layout gate
  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized: admin role required");
  }

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const coverUrl = (formData.get("coverUrl") as string)?.trim() || null;
  const isPublished = formData.get("isPublished") === "on";
  const youtubeUrl = (formData.get("youtubeUrl") as string)?.trim() || null;
  const youtubeVideoIds = (formData.get("youtubeVideoIds") as string)?.trim() || null;

  if (!title) throw new Error("Course title is required");

  const [newCourse] = await db
    .insert(courses)
    .values({
      title,
      description,
      coverUrl,
      isPublished,
      createdBy: user.id,
    })
    .returning({ id: courses.id });

  // Import YouTube content if provided
  if (youtubeVideoIds) {
    await importYouTubeVideos(newCourse.id, youtubeVideoIds);
  } else if (youtubeUrl) {
    // For playlist URLs, we'd need to use YouTube API to fetch video IDs
    // For now, we'll extract playlist ID and note that manual video IDs are preferred
    const playlistId = extractPlaylistId(youtubeUrl);
    if (playlistId) {
      // TODO: Implement YouTube API integration to fetch playlist videos
      console.log("Playlist import not yet implemented:", playlistId);
    }
  }

  redirect(`/admin/courses/${newCourse.id}`);
}

// Helper function to import YouTube videos as lessons
async function importYouTubeVideos(courseId: string, videoIdsString: string) {
  const videoIds = videoIdsString.split(',').map(id => id.trim()).filter(id => id);
  
  // Create a default unit for imported videos
  const [newUnit] = await db
    .insert(units)
    .values({
      courseId,
      title: "Imported Videos",
      description: "Lessons imported from YouTube",
      orderIndex: 0,
    })
    .returning({ id: units.id });

  // Create lessons for each video
  for (let i = 0; i < videoIds.length; i++) {
    const videoId = videoIds[i];
    await db.insert(lessons).values({
      unitId: newUnit.id,
      title: `Lesson ${i + 1}`,
      description: `Imported from YouTube`,
      youtubeVideoId: videoId,
      orderIndex: i,
      xpReward: 10,
      isPublished: true,
    });
  }
}

// Helper function to extract playlist ID from YouTube URL
function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([^&]+)/);
  return match ? match[1] : null;
}
