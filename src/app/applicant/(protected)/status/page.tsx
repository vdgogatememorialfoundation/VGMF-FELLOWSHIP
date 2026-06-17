import { requireAuth } from "@/components/layout/PortalLayout";
import { ApplicationTracker } from "@/components/tracking/ApplicationTracker";

export default async function ApplicantStatusPage() {
  await requireAuth(["APPLICANT"], "applicant");

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#e8f0ec] bg-gradient-to-r from-[#fffdf8] to-[#f4faf7] px-5 py-5">
        <h1 className="font-display text-2xl font-bold text-ink">Application Tracking</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Follow your fellowship application through scrutiny, documents, committee review, and
          final selection — updates refresh automatically.
        </p>
      </div>
      <ApplicationTracker />
    </div>
  );
}
