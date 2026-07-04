"use client";

import { useSession } from "@/lib/auth";
import { InboxView } from "@/components/inbox/InboxView";

export default function ApplicantInboxPage() {
  const { data: session } = useSession();

  if (!session) {
    return <p>Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        <p className="mt-1 text-gray-600">
          Messages from the fellowship team
        </p>
      </div>
      <InboxView currentUserId={session.user.id} />
    </div>
  );
}
