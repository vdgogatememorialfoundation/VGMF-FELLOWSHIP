import { requireAuth } from "@/components/layout/PortalLayout";
import { ApplicationTracker } from "@/components/tracking/ApplicationTracker";

export default async function ApplicantStatusPage() {
  await requireAuth(["APPLICANT"], "applicant");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Application Tracking</h1>
        <p className="mt-1 text-gray-600">
          Real-time progress through scrutiny, document verification, committee review, and final
          selection
        </p>
      </div>
      <ApplicationTracker />
    </div>
  );
}
