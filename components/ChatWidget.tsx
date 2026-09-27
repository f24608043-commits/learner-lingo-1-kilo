"use client";

import { useState, useRef, useEffect } from "react";
import Mascot from "./Mascot";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your LEGO learning mascot! 🎓 Ask me anything about your lessons or just say hello!",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPose, setCurrentPose] = useState<"idle" | "celebrate" | "empty" | "encouraging" | "waving" | "thinking" | "pointing">("idle");
  const [showAssembly, setShowAssembly] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen for external pose changes from app events
  useEffect(() => {
    const handleMascotPose = (event: CustomEvent<"idle" | "celebrate" | "empty" | "encouraging" | "waving" | "thinking" | "pointing">) => {
      setCurrentPose(event.detail);
      // Reset to idle after 3 seconds
      setTimeout(() => setCurrentPose("idle"), 3000);
    };

    const handleMascotAssembly = () => {
      setShowAssembly(true);
      setTimeout(() => setShowAssembly(false), 1500);
    };

    window.addEventListener("mascot-pose", handleMascotPose as EventListener);
    window.addEventListener("mascot-assembly", handleMascotAssembly as EventListener);

    return () => {
      window.removeEventListener("mascot-pose", handleMascotPose as EventListener);
      window.removeEventListener("mascot-assembly", handleMascotAssembly as EventListener);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message;
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    setCurrentPose("thinking");

    try {
      const response = await fetch("/api/mascot-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      
      if (data.suggestedPose) {
        setCurrentPose(data.suggestedPose);
        // Reset to idle after 3 seconds
        setTimeout(() => setCurrentPose("idle"), 3000);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't respond right now. Please try again!" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const triggerAssembly = () => {
    setShowAssembly(true);
    setTimeout(() => setShowAssembly(false), 1500);
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50">
      {/* Collapsed state */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setCurrentPose("waving");
            setTimeout(() => setCurrentPose("idle"), 2000);
          }}
          className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full shadow-clay-lg hover:shadow-clay-xl transition-all duration-300 hover:scale-105"
          style={{
            boxShadow: "0 8px 32px rgba(34, 197, 94, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.2)",
          }}
        >
          {/* Mobile: Small circle icon */}
          <div className="md:hidden w-12 h-12 flex items-center justify-center">
            <Mascot pose="waving" size={32} />
          </div>
          {/* Desktop: Full button with text */}
          <div className="hidden md:flex items-center gap-3 p-4">
            <Mascot pose="waving" size={40} />
            <div className="text-left">
              <p className="font-semibold text-sm">Chat with Mascot</p>
              <p className="text-xs opacity-90">Online - Ready to help!</p>
            </div>
          </div>
        </button>
      )}

      {/* Expanded state */}
      {isOpen && (
        <div
          className="w-96 h-[500px] md:w-96 md:h-[500px] bg-white rounded-2xl shadow-clay-xl overflow-hidden flex flex-col transition-all duration-300"
          style={{
            boxShadow: "0 12px 48px rgba(0, 0, 0, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.5)",
          }}
        >
          {/* Header */}
          <div
            className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 flex items-center gap-3 cursor-pointer"
            onClick={() => setIsOpen(false)}
            style={{
              boxShadow: "inset 0 2px 0 rgba(255, 255, 255, 0.2)",
            }}
          >
            <Mascot pose={currentPose} size={40} animateAssembly={showAssembly} />
            <div className="flex-1">
              <p className="font-semibold">LEGO Mascot</p>
              <p className="text-xs opacity-90">
                {isLoading ? "Thinking..." : "Online - Ready to help!"}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerAssembly();
              }}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              title="Replay assembly animation"
            >
              ✨
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" ? "bg-purple-500" : "bg-green-500"
                  }`}
                >
                  {msg.role === "user" ? "👤" : "🤖"}
                </div>
                <div
                  className={`max-w-[75%] p-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white"
                      : "bg-white border-2 border-gray-200 shadow-sm"
                  }`}
                  style={{
                    boxShadow: msg.role === "assistant" ? "0 2px 8px rgba(0, 0, 0, 0.05)" : undefined,
                  }}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  🤖
                </div>
                <div className="bg-white border-2 border-gray-200 shadow-sm p-3 rounded-2xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setMessage("Give me a hint!");
                handleSend();
              }}
              className="px-3 py-1.5 bg-white border-2 border-green-500 text-green-600 rounded-full text-xs font-medium hover:bg-green-50 transition-colors"
            >
              💡 Hint
            </button>
            <button
              onClick={() => {
                setMessage("Explain this concept");
                handleSend();
              }}
              className="px-3 py-1.5 bg-white border-2 border-green-500 text-green-600 rounded-full text-xs font-medium hover:bg-green-50 transition-colors"
            >
              📖 Explain
            </button>
            <button
              onClick={() => {
                setMessage("Quiz me!");
                handleSend();
              }}
              className="px-3 py-1.5 bg-white border-2 border-green-500 text-green-600 rounded-full text-xs font-medium hover:bg-green-50 transition-colors"
            >
              🎯 Quiz me
            </button>
            <button
              onClick={() => {
                setMessage("Tell me a joke");
                handleSend();
              }}
              className="px-3 py-1.5 bg-white border-2 border-green-500 text-green-600 rounded-full text-xs font-medium hover:bg-green-50 transition-colors"
            >
              😄 Joke
            </button>
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:border-green-500 transition-colors text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || isLoading}
                className="px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full font-medium hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                style={{
                  boxShadow: "0 2px 8px rgba(34, 197, 94, 0.3)",
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
