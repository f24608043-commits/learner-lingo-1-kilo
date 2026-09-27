"use client";

interface MascotProps {
  pose?: "idle" | "celebrate" | "empty" | "encouraging" | "waving" | "thinking" | "pointing";
  size?: number;
  className?: string;
  animateAssembly?: boolean;
}

export default function Mascot({ pose = "idle", size = 64, className = "", animateAssembly = false }: MascotProps) {
  const getPosePath = () => {
    switch (pose) {
      case "celebrate":
        return (
          <g>
            {/* Arms raised in celebration */}
            <path d="M20 30 L10 15" stroke="#006e2f" strokeWidth="4" strokeLinecap="round" />
            <path d="M44 30 L54 15" stroke="#006e2f" strokeWidth="4" strokeLinecap="round" />
            {/* Confetti particles */}
            <circle cx="10" cy="10" r="3" fill="#fea619" className="animate-pulse" />
            <circle cx="54" cy="10" r="3" fill="#22c55e" className="animate-pulse" />
            <circle cx="8" cy="20" r="2" fill="#005ac2" className="animate-pulse" />
            <circle cx="56" cy="20" r="2" fill="#ba1a1a" className="animate-pulse" />
          </g>
        );
      case "empty":
        return (
          <g>
            {/* Arms down, sad expression */}
            <path d="M20 35 L15 45" stroke="#6d7b6c" strokeWidth="4" strokeLinecap="round" />
            <path d="M44 35 L49 45" stroke="#6d7b6c" strokeWidth="4" strokeLinecap="round" />
            {/* Sad mouth */}
            <path d="M28 42 Q32 38 36 42" stroke="#6d7b6c" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        );
      case "encouraging":
        return (
          <g>
            {/* One arm pointing forward */}
            <path d="M44 30 L58 25" stroke="#006e2f" strokeWidth="4" strokeLinecap="round" />
            <path d="M20 35 L15 40" stroke="#006e2f" strokeWidth="4" strokeLinecap="round" />
            {/* Thumbs up hand */}
            <circle cx="58" cy="25" r="4" fill="#22c55e" />
          </g>
        );
      case "waving":
        return (
          <g>
            {/* One arm waving */}
            <path d="M44 30 L58 20" stroke="#006e2f" strokeWidth="4" strokeLinecap="round" className="animate-bounce" />
            <path d="M20 35 L15 40" stroke="#006e2f" strokeWidth="4" strokeLinecap="round" />
            {/* Waving hand */}
            <circle cx="58" cy="20" r="4" fill="#22c55e" />
          </g>
        );
      case "thinking":
        return (
          <g>
            {/* Arms crossed, thinking pose */}
            <path d="M20 32 L25 28" stroke="#006e2f" strokeWidth="4" strokeLinecap="round" />
            <path d="M44 32 L39 28" stroke="#006e2f" strokeWidth="4" strokeLinecap="round" />
            {/* Thought bubble */}
            <circle cx="58" cy="15" r="6" fill="#ffffff" stroke="#6d7b6c" strokeWidth="2" />
            <circle cx="52" cy="22" r="3" fill="#ffffff" stroke="#6d7b6c" strokeWidth="2" />
            <circle cx="48" cy="26" r="2" fill="#ffffff" stroke="#6d7b6c" strokeWidth="2" />
          </g>
        );
      case "pointing":
        return (
          <g>
            {/* One arm pointing right */}
            <path d="M44 30 L60 30" stroke="#006e2f" strokeWidth="4" strokeLinecap="round" />
            <path d="M20 35 L15 40" stroke="#006e2f" strokeWidth="4" strokeLinecap="round" />
            {/* Pointing finger */}
            <circle cx="60" cy="30" r="3" fill="#22c55e" />
          </g>
        );
      default: // idle
        return (
          <g>
            {/* Arms at sides */}
            <path d="M20 32 L15 42" stroke="#006e2f" strokeWidth="4" strokeLinecap="round" />
            <path d="M44 32 L49 42" stroke="#006e2f" strokeWidth="4" strokeLinecap="round" />
          </g>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Assembly animation classes */}
      <style jsx>{`
        @keyframes assembleHead {
          0% { opacity: 0; transform: translateY(-20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes assembleBody {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes assembleArms {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes assembleLegs {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .assemble-head { animation: assembleHead 0.4s ease-out forwards; }
        .assemble-body { animation: assembleBody 0.4s ease-out 0.2s forwards; opacity: 0; }
        .assemble-arms { animation: assembleArms 0.3s ease-out 0.4s forwards; opacity: 0; }
        .assemble-legs { animation: assembleLegs 0.3s ease-out 0.5s forwards; opacity: 0; }
        .breathing { animation: bounce 2s ease-in-out infinite; }
      `}</style>
      {/* LEGO-style head */}
      <g className={animateAssembly ? "assemble-head" : pose === "idle" ? "breathing" : ""}>
        <rect x="16" y="8" width="32" height="28" rx="4" fill="#22c55e" />
        {/* Stud on top */}
        <rect x="28" y="4" width="8" height="6" rx="2" fill="#4ae176" />
        
        {/* Face */}
        {/* Eyes */}
        <circle cx="24" cy="22" r="4" fill="#ffffff" />
        <circle cx="40" cy="22" r="4" fill="#ffffff" />
        <circle cx="25" cy="23" r="2" fill="#131b2e" />
        <circle cx="41" cy="23" r="2" fill="#131b2e" />
        
        {/* Mouth */}
        {pose === "empty" ? (
          <path d="M28 30 Q32 26 36 30" stroke="#6d7b6c" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M28 30 Q32 34 36 30" stroke="#131b2e" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}
      </g>
      
      {/* Body */}
      <g className={animateAssembly ? "assemble-body" : ""}>
        <rect x="20" y="36" width="24" height="20" rx="3" fill="#006e2f" />
      </g>
      
      {/* Arms and pose-specific elements */}
      <g className={animateAssembly ? "assemble-arms" : ""}>
        {getPosePath()}
      </g>
      
      {/* Legs */}
      <g className={animateAssembly ? "assemble-legs" : ""}>
        <rect x="22" y="56" width="8" height="6" rx="2" fill="#004b1e" />
        <rect x="34" y="56" width="8" height="6" rx="2" fill="#004b1e" />
      </g>
    </svg>
  );
}
