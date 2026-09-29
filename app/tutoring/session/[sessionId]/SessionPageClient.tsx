"use client";

import { useState, useEffect, useRef } from "react";

interface Session {
  id: string;
  tutorId: string;
  learnerId: string;
  scheduledAt: string;
  durationMins: number;
  status: string;
  jitsiRoomId: string | null;
}

interface SessionNote {
  id: string;
  noteText: string;
  visibility: "private_tutor" | "shared";
  createdAt: string;
  authorId: string;
}

interface SessionPageClientProps {
  session: Session;
  notes: SessionNote[];
  isTutor: boolean;
  currentUserId: string;
}

// Native date formatting
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) + 
    " at " + date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const formatNoteDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + 
    " at " + date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

export default function SessionPageClient({ 
  session, 
  notes, 
  isTutor, 
  currentUserId 
}: SessionPageClientProps) {
  const [activeTab, setActiveTab] = useState<"video" | "whiteboard" | "notes" | "chat">("video");
  const [whiteboardHistory, setWhiteboardHistory] = useState<ImageData[]>([]);
  const [whiteboardIndex, setWhiteboardIndex] = useState(-1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{id: string, senderId: string, senderName: string, message: string, timestamp: string}>>([]);
  const [newMessage, setNewMessage] = useState("");
  const [whiteboardColor, setWhiteboardColor] = useState("#000000");
  const [whiteboardTool, setWhiteboardTool] = useState<"pen" | "eraser" | "text" | "shape">("pen");
  const [whiteboardLineWidth, setWhiteboardLineWidth] = useState(3);

  const videoRef = useRef<HTMLDivElement>(null);
  const whiteboardRef = useRef<HTMLCanvasElement>(null);
  const whiteboardCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const now = new Date();
  const sessionStart = new Date(session.scheduledAt);
  const sessionEnd = new Date(sessionStart.getTime() + session.durationMins * 60000);
  const canJoin = now >= new Date(sessionStart.getTime() - 10 * 60000) && now <= sessionEnd;
  const isPast = now > sessionEnd;
  const isFuture = now < new Date(sessionStart.getTime() - 10 * 60000);

  // Initialize whiteboard
  useEffect(() => {
    const canvas = whiteboardRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        whiteboardCtxRef.current = ctx;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = whiteboardColor;
        ctx.lineWidth = whiteboardLineWidth;
        
        // Initialize with blank state
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setWhiteboardHistory([imageData]);
        setWhiteboardIndex(0);
      }
    }
  }, [whiteboardColor, whiteboardLineWidth]);

  // Drawing handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!whiteboardCtxRef.current) return;
    isDrawingRef.current = true;
    const canvas = whiteboardRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    whiteboardCtxRef.current!.beginPath();
    whiteboardCtxRef.current!.moveTo(x, y);
    
    // Save state for undo
    const imageData = whiteboardCtxRef.current!.getImageData(0, 0, canvas.width, canvas.height);
    setWhiteboardHistory(prev => [...prev.slice(0, whiteboardIndex + 1), imageData]);
    setWhiteboardIndex(prev => prev + 1);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !whiteboardCtxRef.current) return;
    const canvas = whiteboardRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    whiteboardCtxRef.current!.lineTo(x, y);
    whiteboardCtxRef.current!.strokeStyle = whiteboardTool === "eraser" ? "#ffffff" : whiteboardColor;
    whiteboardCtxRef.current!.lineWidth = whiteboardTool === "eraser" ? 20 : whiteboardLineWidth;
    whiteboardCtxRef.current!.stroke();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const undoWhiteboard = () => {
    if (whiteboardIndex > 0 && whiteboardCtxRef.current) {
      setWhiteboardIndex(prev => prev - 1);
      const prevState = whiteboardHistory[whiteboardIndex - 1];
      whiteboardCtxRef.current!.putImageData(prevState, 0, 0);
    }
  };

  const redoWhiteboard = () => {
    if (whiteboardIndex < whiteboardHistory.length - 1 && whiteboardCtxRef.current) {
      setWhiteboardIndex(prev => prev + 1);
      const nextState = whiteboardHistory[whiteboardIndex + 1];
      whiteboardCtxRef.current!.putImageData(nextState, 0, 0);
    }
  };

  const clearWhiteboard = () => {
    if (whiteboardCtxRef.current && whiteboardRef.current) {
      whiteboardCtxRef.current.clearRect(0, 0, whiteboardRef.current.width, whiteboardRef.current.height);
      const imageData = whiteboardCtxRef.current.getImageData(0, 0, whiteboardRef.current.width, whiteboardRef.current.height);
      setWhiteboardHistory([imageData]);
      setWhiteboardIndex(0);
    }
  };

  // Recording handlers
  const startRecording = async () => {
    if (!videoRef.current) return;
    
    try {
      const stream = await (videoRef.current as any).captureStream?.() || 
        await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `session-${session.id}-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };
      
      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Failed to start recording. Please check browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Chat handlers
  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const message = {
      id: `msg-${Date.now()}`,
      senderId: currentUserId,
      senderName: isTutor ? "Tutor" : "Learner",
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, message]);
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Simulate welcome message
  useEffect(() => {
    if (activeTab === "chat" && chatMessages.length === 0) {
      const timer = setTimeout(() => {
        setChatMessages([{
          id: "welcome",
          senderId: "system",
          senderName: "System",
          message: "Welcome to the session! Use the tabs above to switch between video, whiteboard, notes, and chat.",
          timestamp: new Date().toISOString(),
        }]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  return (
    <div className="w-full px-6 py-6">
      {/* Header */}
      <div className="relative w-full rounded-3xl bg-surface-container-lowest p-6 md:p-8 shadow-xl overflow-hidden mb-6">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-secondary-fixed/25 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-tertiary-fixed/30 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-lg bg-surface-container-highest text-on-surface-variant font-label-sm tracking-wider uppercase">Tutoring</span>
              <span className="text-outline text-label-sm">•</span>
              <span className={`px-3 py-0.5 rounded-lg font-label-sm tracking-wider uppercase font-bold ${
                session.status === "confirmed" ? "bg-primary-container/20 text-primary" :
                session.status === "completed" ? "bg-tertiary-fixed text-on-tertiary-fixed" :
                session.status === "cancelled" ? "bg-error-container text-on-error-container" :
                "bg-surface-container-high text-on-surface-variant"
              }`}>
                {session.status}
              </span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight leading-none">
              Live Learning Session
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
              {format(new Date(session.scheduledAt), "EEEE, MMMM d, yyyy 'at' h:mm a")} • {session.durationMins} minutes
            </p>
          </div>

          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center lg:items-end justify-center gap-4 shrink-0">
            <div className={`relative max-w-xs p-4 rounded-2xl shadow-lg border-4 border-white/50 order-2 sm:order-1 ${isFuture ? "bg-tertiary-fixed" : isPast ? "bg-surface-container" : "bg-primary-container/20"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`material-symbols-outlined text-[18px] ${isFuture ? "text-tertiary" : isPast ? "text-on-surface-variant" : "text-primary"}`} style={{ fontVariationSettings: 'FILL 1' }}>
                  {isFuture ? "schedule" : isPast ? "history" : "videocam"}
                </span>
                <span className={`font-label-sm uppercase tracking-wider font-bold ${isFuture ? "text-tertiary" : isPast ? "text-on-surface-variant" : "text-primary"}`}>
                  {isFuture ? "Upcoming" : isPast ? "Ended" : "Live Now"}
                </span>
              </div>
              <p className={`font-headline-md font-bold leading-snug ${isFuture ? "text-tertiary" : isPast ? "text-on-surface-variant" : "text-primary"}`}>
                {isFuture ? `Starts in ${Math.ceil((sessionStart.getTime() - now.getTime()) / 60000)} min` : 
                 isPast ? "Session has ended" : 
                 "Live session in progress"}
              </p>
            </div>
            <div className="relative w-28 h-28 md:w-32 md:h-32 shrink-0 order-1 sm:order-2">
              <div className={`w-full h-full rounded-full bg-gradient-to-br ${isFuture ? "from-tertiary to-tertiary" : isPast ? "from-gray-400 to-gray-500" : "from-primary to-secondary"} flex items-center justify-center animate-pulse`}>
                <span className="text-4xl md:text-5xl">{isFuture ? "⏰" : isPast ? "✅" : "🎥"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="rounded-2xl bg-white shadow-clay-surface border border-surface-border mb-6 overflow-hidden">
        <div className="flex border-b border-surface-border">
          {[
            { id: "video", label: "Video", icon: "videocam" },
            { id: "whiteboard", label: "Whiteboard", icon: "draw" },
            { id: "notes", label: "Notes", icon: "note" },
            { id: "chat", label: "Chat", icon: "chat" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-label-md font-semibold transition-all relative ${
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-muted hover:text-text-primary hover:bg-gray-50"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Video Tab */}
        {activeTab === "video" && (
          <div className="p-6">
            {session.status === "confirmed" && session.jitsiRoomId && canJoin && (
              <div className="rounded-2xl bg-black overflow-hidden">
                <div className="bg-gray-900 px-4 py-2 flex items-center justify-between border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-white font-bold">LIVE</span>
                    <span className="text-gray-400 text-sm">Jitsi Meet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isRecording && (
                      <span className="flex items-center gap-1 text-red-400 text-sm font-mono">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        REC {formatTime(recordingTime)}
                      </span>
                    )}
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isRecording 
                          ? "bg-red-600 text-white hover:bg-red-700" 
                          : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{isRecording ? "stop_circle" : "fiber_manual_record"}</span>
                      <span>{isRecording ? "Stop" : "Record"}</span>
                    </button>
                  </div>
                </div>
                <div className="aspect-video relative" ref={videoRef}>
                  <iframe
                    src={`https://meet.jit.si/${session.jitsiRoomId}`}
                    allow="camera; microphone; fullscreen; display-capture; autoplay"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Jitsi Video Session"
                  />
                </div>
                <div className="p-4 bg-gray-900 border-t border-gray-700 flex flex-wrap gap-2 justify-center">
                  <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined">mic</span>
                    Mute
                  </button>
                  <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined">videocam_off</span>
                    Camera
                  </button>
                  <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined">screen_share</span>
                    Share Screen
                  </button>
                  <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined">more_vert</span>
                    More
                  </button>
                </div>
              </div>
            )}
            
            {isFuture && (
              <div className="rounded-2xl bg-tertiary-fixed p-8 text-center">
                <span className="material-symbols-outlined text-tertiary text-[48px] mb-4 block">schedule</span>
                <p className="font-body-lg text-on-tertiary-fixed mb-2">
                  Session starts in {Math.ceil((sessionStart.getTime() - now.getTime()) / 60000)} minutes
                </p>
                <p className="font-body-md text-on-tertiary-fixed/80">
                  The video session will be available 10 minutes before the scheduled start time.
                </p>
              </div>
            )}

            {isPast && (
              <div className="rounded-2xl bg-surface-container p-8 text-center">
                <span className="material-symbols-outlined text-on-surface-variant text-[48px] mb-4 block">history</span>
                <p className="font-body-lg text-on-surface-variant mb-2">Session has ended</p>
                <p className="font-body-md text-on-surface-variant/80">
                  You can review notes and whiteboard content from the other tabs.
                </p>
              </div>
            )}

            {!session.jitsiRoomId && session.status === "confirmed" && (
              <div className="rounded-2xl bg-yellow-50 border-2 border-yellow-200 p-8 text-center">
                <span className="material-symbols-outlined text-yellow-600 text-[48px] mb-4 block">warning</span>
                <p className="font-body-lg text-yellow-800 mb-2">No video room configured</p>
                <p className="font-body-md text-yellow-700">Contact your tutor to set up the video session.</p>
              </div>
            )}
          </div>
        )}

        {/* Whiteboard Tab */}
        {activeTab === "whiteboard" && (
          <div className="p-4 h-[600px] flex flex-col">
            <div className="flex items-center justify-between gap-4 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Tool:</label>
                <select 
                  value={whiteboardTool}
                  onChange={(e) => setWhiteboardTool(e.target.value as typeof whiteboardTool)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary"
                >
                  <option value="pen">✏️ Pen</option>
                  <option value="eraser">🧽 Eraser</option>
                  <option value="text">📝 Text</option>
                  <option value="shape">🔷 Shape</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Color:</label>
                <input
                  type="color"
                  value={whiteboardColor}
                  onChange={(e) => setWhiteboardColor(e.target.value)}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Width:</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={whiteboardLineWidth}
                  onChange={(e) => setWhiteboardLineWidth(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-gray-600 w-8">{whiteboardLineWidth}px</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={undoWhiteboard}
                  disabled={whiteboardIndex <= 0}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">undo</span>
                  Undo
                </button>
                <button
                  onClick={redoWhiteboard}
                  disabled={whiteboardIndex >= whiteboardHistory.length - 1}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">redo</span>
                  Redo
                </button>
                <button
                  onClick={clearWhiteboard}
                  className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1 text-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                  Clear
                </button>
              </div>
            </div>
            <div className="flex-1 relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-inner">
              <canvas
                ref={whiteboardRef}
                className="w-full h-full cursor-crosshair touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
              {whiteboardTool === "text" && (
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg border border-gray-200 text-xs text-gray-600">
                  Click anywhere to add text (feature coming soon)
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500">
              <span className="material-symbols-outlined text-[16px]">touch_app</span>
              <span>Draw with mouse, touch, or stylus</span>
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div className="p-6">
            {isTutor && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const noteText = formData.get("noteText") as string;
                const visibility = formData.get("visibility") as "private_tutor" | "shared";
                // In real app, call addSessionNote action
                alert("Note added! (Implement server action)");
              }} className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200"
              >
                <h3 className="font-label-md text-on-surface font-semibold mb-3">Add Session Note</h3>
                <div className="mb-3">
                  <textarea
                    name="noteText"
                    className="w-full p-3 border border-gray-300 rounded-xl bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-body-sm text-on-surface"
                    rows={3}
                    placeholder="Enter your session notes..."
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="block font-label-sm text-on-surface font-semibold mb-1">Visibility</label>
                  <select name="visibility" className="w-full p-3 border border-gray-300 rounded-xl bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-body-sm text-on-surface">
                    <option value="shared">Shared with learner</option>
                    <option value="private_tutor">Private (tutor only)</option>
                  </select>
                </div>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl font-label-md font-bold shadow hover:bg-primary/90 transition-colors">
                  Add Note
                </button>
              </form>
            )}
            <div className="space-y-3">
              {notes.filter(note => note.visibility === "shared" || isTutor).map((note: any) => (
                <div key={note.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="font-body-sm text-on-surface mb-2">{note.noteText}</p>
                  <div className="flex items-center justify-between">
                    <p className="font-body-xs text-on-surface-variant">
                      {format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}
                    </p>
                    <span className={`font-label-xs px-2 py-1 rounded-full ${
                      note.visibility === "private_tutor" ? "bg-amber-100 text-amber-800" : "bg-primary/10 text-primary"
                    }`}>
                      {note.visibility === "private_tutor" ? "🔒 Private" : "👁️ Shared"}
                    </span>
                  </div>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <span className="material-symbols-outlined text-[48px] mb-3 block">note_add</span>
                  <p>No notes yet. {isTutor ? "Add your first note!" : "Notes will appear here after the session."}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === "chat" && (
          <div className="h-[500px] flex flex-col bg-gray-50">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <span className="material-symbols-outlined text-[48px] mb-3 block">chat_bubble_outline</span>
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.senderId === currentUserId ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${msg.senderId === currentUserId ? "bg-primary text-white" : "bg-gray-200 text-gray-700"}`}>
                      {msg.senderName.charAt(0)}
                    </div>
                    <div className={`max-w-xs ${msg.senderId === currentUserId ? "text-right" : ""}`}>
                      <p className={`text-xs font-medium ${msg.senderId === currentUserId ? "text-primary" : "text-gray-600"}`}>{msg.senderName}</p>
                      <div className={`px-4 py-2 rounded-2xl ${msg.senderId === currentUserId ? "bg-primary text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none shadow-sm"}`}>
                        {msg.message}
                      </div>
                      <p className={`text-xs text-gray-400 mt-1 ${msg.senderId === currentUserId ? "text-right" : ""}`}>
                        {format(new Date(msg.timestamp), "h:mm a")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-gray-200 bg-white">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">send</span>
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}