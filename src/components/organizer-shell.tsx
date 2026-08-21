import { BarChart3, CalendarDays, ScanLine } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SignOutButton } from "@/components/sign-out-button";
import type { Profile } from "@/lib/event-types";

export function OrganizerShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return <div className="app-frame"><aside className="app-sidebar"><Link href="/dashboard" className="sidebar-brand"><BrandMark /></Link><div className="sidebar-label">Workspace</div><nav className="sidebar-nav" aria-label="Primary navigation"><Link href="/dashboard"><BarChart3 size={17} /> Overview</Link><Link href="/events"><CalendarDays size={17} /> Events</Link></nav><div className="sidebar-bottom"><div className="sidebar-label">Station</div><Link className="station-link" href="/events"><ScanLine size={16} /> Choose scanner event</Link><div className="profile-chip"><span className="avatar">{(profile.full_name || "M").slice(0, 1).toUpperCase()}</span><span><strong>{profile.full_name || "MIC organizer"}</strong><small>Organizer access</small></span></div><SignOutButton /></div></aside><main className="app-main">{children}</main></div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-header-action">{action}</div>}</header>;
}
