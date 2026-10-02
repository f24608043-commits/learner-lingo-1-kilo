"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { key: "stream", label: "Stream" },
  { key: "classwork", label: "Classwork" },
  { key: "people", label: "People" },
  { key: "grades", label: "Grades" },
] as const;

export default function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-2 overflow-x-auto pb-1"
      aria-label="Group sections"
      data-testid="group-tabs"
    >
      {TABS.map((tab) => {
        const href = tab.key === "stream" ? `/groups/${groupId}` : `/groups/${groupId}/${tab.key}`;
        const active = tab.key === "stream" ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={tab.key}
            href={href}
            aria-current={active ? "page" : undefined}
            data-testid={`group-tab-${tab.key}`}
            className={`shrink-0 rounded-2xl px-5 py-2.5 text-sm font-extrabold uppercase tracking-wide transition ${
              active
                ? "bg-primary text-white shadow-clay-primary"
                : "bg-white/70 text-on-surface/70 hover:bg-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}