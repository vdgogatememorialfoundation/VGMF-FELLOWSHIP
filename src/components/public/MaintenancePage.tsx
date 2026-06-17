import Link from "next/link";
import { Wrench } from "lucide-react";

interface MaintenancePageProps {
  message: string;
  showPortalHint?: boolean;
}

export function MaintenancePage({ message, showPortalHint = true }: MaintenancePageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center mesh-bg px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <div className="card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Wrench className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-extrabold text-ink">
            Site Under Maintenance
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">{message}</p>
          {showPortalHint && (
            <p className="mt-6 text-xs text-muted">
              Authorized staff can still access portal logins if enabled by the administrator.
            </p>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/admin" className="btn-secondary text-sm">
              Admin Portal
            </Link>
            <Link href="/applicant" className="btn-secondary text-sm">
              Applicant Portal
            </Link>
          </div>
        </div>
        <p className="mt-8 text-xs text-muted">
          Vaidya Gogate Memorial Foundation Fellowship Portal
        </p>
      </div>
    </div>
  );
}
