"use client";

import { SupportTicketsWorkspace } from "@/components/support/SupportTicketsWorkspace";

type SupportContentProps = {
  contactEmail: string;
  contactPhone: string;
};

export function SupportContent({ contactEmail, contactPhone }: SupportContentProps) {
  return (
    <SupportTicketsWorkspace
      mode="applicant"
      contactEmail={contactEmail}
      contactPhone={contactPhone}
    />
  );
}
