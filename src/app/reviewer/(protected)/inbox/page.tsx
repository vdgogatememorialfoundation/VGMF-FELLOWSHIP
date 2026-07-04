"use client";

import { useSession } from "@/hooks/useSession";
import { InboxView } from "@/components/inbox/InboxView";

export default function ReviewerInboxPage() {
  const { user, loading } = useSession();

  if (loading) return <p className="p-8">Loading...</p>;
  if (!user) return <p className="p-8">Please login to view inbox.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        <p className="mt-1 text-gray-600">
          Communicate with applicants and other portal users
        </p>
      </div>
      <InboxView userId={user.id} userRole="REVIEWER" />
    </div>
  );
}
