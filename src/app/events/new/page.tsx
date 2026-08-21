import { redirect } from "next/navigation";
import { EventCreateForm } from "@/components/event-create-form";
import { OrganizerShell, PageHeader } from "@/components/organizer-shell";
import { getProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "organizer") redirect("/events");
  return <OrganizerShell profile={profile}><PageHeader eyebrow="Event setup" title="Create a real event." description="This form writes to the same capacity-controlled database used by the registration and scanner flows." /><EventCreateForm /></OrganizerShell>;
}
