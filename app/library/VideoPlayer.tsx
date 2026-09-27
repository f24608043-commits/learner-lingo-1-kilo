"use client";

import { useState } from "react";

interface VideoPlayerProps {
  videoUrl: string;
  lessonId: string;
}

export default function VideoPlayer({ videoUrl, lessonId }: VideoPlayerProps) {
  const [hasPlayed, setHasPlayed] = useState(false);

  const handlePlay = async () => {
    if (!hasPlayed) {
      setHasPlayed(true);
      try {
        const { recordLibraryView } = await import("./actions");
        await recordLibraryView(lessonId);
      } catch (error) {
        console.error("Failed to record library view:", error);
      }
    }
  };

  return (
    <div className="aspect-video bg-black rounded-xl overflow-hidden">
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${videoUrl}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={handlePlay}
      />
    </div>
  );
}
