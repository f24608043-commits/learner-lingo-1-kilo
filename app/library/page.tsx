import { getLibraryLessons } from "./actions";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import VideoPlayer from "./VideoPlayer";
import Mascot from "@/components/Mascot";

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const libraryLessons = await getLibraryLessons();

  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-purple-50 to-pink-50 min-h-screen">
      {/* Header with Mascot - Stitch Frame Style */}
      <div className="relative w-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-1 shadow-2xl overflow-hidden mb-6">
        <div className="absolute inset-0 rounded-3xl border-4 border-dashed border-white/40 pointer-events-none"></div>
        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 md:p-8">
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Header info */}
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-label-sm text-label-sm tracking-wider uppercase font-bold shadow-lg border-2 border-white/30">📚 Content Library</span>
              <span className="text-outline text-label-sm">•</span>
              <span className="px-4 py-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-label-sm text-label-sm font-bold shadow-lg border-2 border-white/30">Video Only</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-text-primary tracking-tight leading-none">
              Video Library 🎬
            </h1>
            <p className="font-body-lg text-body-lg text-text-muted leading-relaxed">
              Watch lesson videos without completing quizzes. Progress is not tracked in the Library.
            </p>
          </div>

          {/* Right: Mascot */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center lg:items-end justify-center gap-4 shrink-0 self-center lg:self-auto">
            <div className="relative max-w-xs bg-gradient-to-br from-yellow-100 to-orange-100 p-4 rounded-2xl shadow-xl border-4 border-white/50 order-2 sm:order-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-orange-500 text-[18px]" style={{ fontVariationSettings: 'FILL 1' }}>play_circle</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-orange-600 font-bold">Browse Freely</span>
              </div>
              <p className="font-headline-md text-label-md text-text-primary font-bold leading-snug">
                "Watch any lesson video anytime. No quizzes, no pressure!"
              </p>
            </div>
            <div className="relative w-28 h-28 md:w-32 md:h-32 shrink-0 order-1 sm:order-2">
              <Mascot pose="idle" size={128} />
            </div>
          </div>
        </div>
        </div>
      </div>

      {libraryLessons.length === 0 ? (
        <div className="rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 p-8 text-center shadow-xl border-4 border-white/50">
          <div className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center overflow-hidden shadow-xl mx-auto mb-4 border-4 border-white/30">
            <Mascot pose="empty" size={64} />
          </div>
          <p className="font-body-md text-text-muted font-bold">
            No lessons available. Enroll in a course to access the library.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {libraryLessons.map((lesson: any) => (
            <div key={lesson.id} className="rounded-2xl bg-gradient-to-br from-white to-purple-50 p-6 shadow-xl border-4 border-purple-100">
              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-label-sm text-label-sm font-bold shadow-lg border-2 border-white/30">
                      {lesson.courseName}
                    </span>
                    <span className="text-outline text-label-sm">•</span>
                    <span className="font-label-sm text-text-muted font-bold">
                      {lesson.unitName}
                    </span>
                  </div>
                  <h2 className="font-headline-md text-headline-md text-text-primary">{lesson.title}</h2>
                  <p className="font-body-sm text-text-muted mt-2">{lesson.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="material-symbols-outlined text-yellow-500 text-[16px]" style={{ fontVariationSettings: 'FILL 1' }}>stars</span>
                    <span className="font-label-sm text-yellow-600 font-bold">{lesson.xpReward} XP (if completed via quiz)</span>
                  </div>
                </div>
              </div>

              {lesson.videoUrl ? (
                <VideoPlayer videoUrl={lesson.videoUrl} lessonId={lesson.id} />
              ) : (
                <div className="rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 p-8 text-center border-4 border-white/50">
                  <div className="text-4xl mb-3">🎬</div>
                  <p className="font-body-sm text-text-muted font-bold">No video available for this lesson</p>
                </div>
              )}

              <div className="mt-4 rounded-xl border-4 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 p-4 text-sm text-yellow-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[18px] text-yellow-600">info</span>
                  <span className="font-label-md font-bold text-yellow-800">Library Mode:</span>
                </div>
                <p className="font-body-sm text-yellow-700">
                  Watching here does not track progress or award XP. Complete the quiz in the lesson page to earn XP and track progress.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
