"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Mascot from "@/components/Mascot";

export default function TestSetupPage() {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [speakerPlaying, setSpeakerPlaying] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [speakerError, setSpeakerError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCamera();
      cleanupMic();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const cleanupCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const cleanupMic = () => {
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      setMicStream(null);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error: any) {
      setCameraError(error.message || "Camera access denied or not available");
    }
  };

  const stopCamera = () => {
    cleanupCamera();
  };

  const startMic = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      micSourceRef.current = source;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMicLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setMicLevel(average);
        animationFrameRef.current = requestAnimationFrame(updateMicLevel);
      };

      updateMicLevel();
    } catch (error: any) {
      setMicError(error.message || "Microphone access denied or not available");
    }
  };

  const stopMic = () => {
    cleanupMic();
    setMicLevel(0);
  };

  const testSpeaker = () => {
    setSpeakerError(null);
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 440; // A4 note
      gainNode.gain.value = 0.3;

      oscillator.start();
      setSpeakerPlaying(true);

      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
        setSpeakerPlaying(false);
      }, 1000);
    } catch (error: any) {
      setSpeakerError(error.message || "Speaker test failed");
    }
  };

  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-blue-50 to-cyan-50 min-h-screen">
      {/* Header */}
      <div className="relative w-full bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-3xl p-1 shadow-2xl overflow-hidden mb-6">
        <div className="absolute inset-0 rounded-3xl border-4 border-dashed border-white/40 pointer-events-none"></div>
        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-4">
            <Link href="/tutoring" className="text-gray-500 hover:text-gray-700">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </Link>
            <div className="flex-1">
              <h1 className="font-headline-xl text-headline-xl text-on-secondary-container font-extrabold">
                Live Class Setup Test
              </h1>
              <p className="font-body-sm text-on-surface-variant">
                Test your camera, microphone, and speakers before joining a live session
              </p>
            </div>
            <div className="w-16 h-16 shrink-0">
              <Mascot pose="idle" size={64} />
            </div>
          </div>
        </div>
      </div>

      {/* Test Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Camera Test */}
        <div className="rounded-2xl bg-gradient-to-br from-white to-blue-50 p-6 shadow-xl border-4 border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-blue-500 text-[24px]">videocam</span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">Camera</h2>
          </div>
          
          <div className="relative bg-black rounded-xl overflow-hidden mb-4 aspect-video">
            {cameraStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <span className="material-symbols-outlined text-[48px]">videocam_off</span>
              </div>
            )}
          </div>

          {cameraError && (
            <p className="text-red-500 text-sm mb-3">{cameraError}</p>
          )}

          <div className="flex gap-2">
            {!cameraStream ? (
              <button
                onClick={startCamera}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
              >
                Start Camera
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex-1 rounded-xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-rose-50 text-red-600 px-4 py-2 font-label-md font-bold shadow-lg hover:from-red-100 hover:to-rose-100 transition-all"
              >
                Stop Camera
              </button>
            )}
          </div>
        </div>

        {/* Microphone Test */}
        <div className="rounded-2xl bg-gradient-to-br from-white to-green-50 p-6 shadow-xl border-4 border-green-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-green-500 text-[24px]">mic</span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">Microphone</h2>
          </div>

          <div className="bg-gray-100 rounded-xl p-6 mb-4">
            <div className="flex items-end gap-1 h-24">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-green-500 to-emerald-400 rounded-t transition-all"
                  style={{
                    height: `${Math.max(4, (micLevel / 255) * 100)}px`,
                  }}
                />
              ))}
            </div>
          </div>

          {micError && (
            <p className="text-red-500 text-sm mb-3">{micError}</p>
          )}

          <div className="flex gap-2">
            {!micStream ? (
              <button
                onClick={startMic}
                className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
              >
                Start Mic
              </button>
            ) : (
              <button
                onClick={stopMic}
                className="flex-1 rounded-xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-rose-50 text-red-600 px-4 py-2 font-label-md font-bold shadow-lg hover:from-red-100 hover:to-rose-100 transition-all"
              >
                Stop Mic
              </button>
            )}
          </div>
        </div>

        {/* Speaker Test */}
        <div className="rounded-2xl bg-gradient-to-br from-white to-purple-50 p-6 shadow-xl border-4 border-purple-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-purple-500 text-[24px]">volume_up</span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">Speaker</h2>
          </div>

          <div className="bg-gray-100 rounded-xl p-6 mb-4 flex items-center justify-center">
            {speakerPlaying ? (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 bg-gradient-to-t from-purple-500 to-indigo-400 rounded-full animate-pulse"
                    style={{
                      height: `${20 + Math.random() * 40}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <span className="material-symbols-outlined text-gray-400 text-[48px]">speaker_notes_off</span>
            )}
          </div>

          {speakerError && (
            <p className="text-red-500 text-sm mb-3">{speakerError}</p>
          )}

          <button
            onClick={testSpeaker}
            disabled={speakerPlaying}
            className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Test Speaker
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 p-6 shadow-xl border-4 border-yellow-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-[24px]">tips_and_updates</span>
          </div>
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface font-extrabold mb-2">
              Tips for Better Experience
            </h3>
            <ul className="font-body-sm text-on-surface-variant space-y-1">
              <li>• Use a wired connection for stable video/audio</li>
              <li>• Ensure good lighting for your camera</li>
              <li>• Use headphones to prevent echo</li>
              <li>• Close other apps that might use your camera/mic</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
