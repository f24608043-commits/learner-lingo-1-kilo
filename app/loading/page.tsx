"use client";

import { useEffect, useState } from "react";
import Mascot from "@/components/Mascot";

const loadingStages = [
  { text: "Waking up the LEGO mascot...", progress: 20 },
  { text: "Loading your learning path...", progress: 40 },
  { text: "Gathering your XP and streak...", progress: 60 },
  { text: "Almost there...", progress: 80 },
  { text: "Ready to learn!", progress: 100 },
];

export default function LoadingPage() {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate through loading stages
    const stageInterval = setInterval(() => {
      setStage((prev) => {
        if (prev < loadingStages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 800);

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const targetProgress = loadingStages[stage].progress;
        if (prev < targetProgress) {
          return prev + 2;
        }
        return prev;
      });
    }, 30);

    // Redirect after all stages complete
    const redirectTimer = setTimeout(() => {
      window.location.href = "/path";
    }, 4500);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
      clearTimeout(redirectTimer);
    };
  }, [stage]);

  const currentStage = loadingStages[stage];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-blue-50 to-purple-50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-surface p-8 shadow-clay-surface border-4 border-surface-border text-center">
        {/* Animated Mascot */}
        <div className="mb-6 flex flex-col items-center">
          <div className="relative w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden shadow-clay-primary mb-4">
            <Mascot pose="thinking" size={96} />
          </div>
          <h1 className="font-headline-lg text-text-primary tracking-tight font-extrabold">Loading LEGO</h1>
          <p className="mt-2 font-body-md text-text-muted animate-pulse">{currentStage.text}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stage Indicators */}
        <div className="flex justify-center gap-2">
          {loadingStages.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                index <= stage ? 'bg-primary' : 'bg-surface-border'
              }`}
            />
          ))}
        </div>

        {/* Fun Fact */}
        <div className="mt-6 p-4 rounded-2xl bg-surface-container border border-surface-border">
          <p className="font-label-sm text-text-muted">
            💡 Did you know? Consistent learning boosts retention by up to 60%!
          </p>
        </div>
      </div>
    </div>
  );
}
