"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`
        animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded
        bg-[length:200%_100%] bg-no-repeat
        ${className}
      `}
      style={{ backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }}
    />
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-clay-surface border border-surface-border ${className}`}>
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-4 w-1/2 mb-2" />
      <Skeleton className="h-4 w-1/3 mb-2" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  );
}

export function ListSkeleton({ count = 5, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 6, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <Skeleton className="h-6 w-3/4 mb-3" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function TutorCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`min-w-0 rounded-2xl bg-gradient-to-br from-white to-blue-50 p-5 shadow-xl border-4 border-blue-100 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold text-xl shadow-xl border-4 border-white/30" />
        <div className="min-w-0">
          <Skeleton className="font-label-md text-on-surface font-semibold truncate h-5 w-2/3" />
          <div className="flex items-center gap-1 font-body-sm text-text-muted mt-1">
            <Skeleton className="w-6 h-4" />
            <Skeleton className="w-20 h-4" />
          </div>
        </div>
      </div>
      <Skeleton className="font-body-sm text-on-surface-variant mb-3 line-clamp-2 h-8 w-full" />
      <div className="flex flex-wrap gap-2 mb-4">
        <Skeleton className="rounded-full bg-gradient-to-r from-teal-400 to-green-500 text-white px-2 py-1 font-label-sm font-semibold shadow-lg border-2 border-white/30 h-6 w-20" />
        <Skeleton className="rounded-full bg-gradient-to-r from-teal-400 to-green-500 text-white px-2 py-1 font-label-sm font-semibold shadow-lg border-2 border-white/30 h-6 w-24" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="font-label-sm font-semibold text-on-surface h-5 w-20" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-600 px-3 py-2 font-label-sm font-bold shadow-lg h-8 w-20" />
          <Skeleton className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 h-8 w-28" />
        </div>
      </div>
    </div>
  );
}

export function MessageSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`flex gap-3 ${className}`}>
      <Skeleton className="w-8 h-8 rounded-full bg-gray-200" />
      <div className="max-w-xs">
        <Skeleton className="px-4 py-2 rounded-2xl bg-white text-gray-800 rounded-tl-none shadow-sm h-8 w-3/4" />
        <Skeleton className="text-xs text-gray-400 mt-1 h-3 w-1/4" />
      </div>
    </div>
  );
}

export function MessageListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-blue-50 to-cyan-50 min-h-screen">
      <Skeleton className="w-48 h-10 rounded-full mb-6 mx-auto" />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}