import Link from "next/link";

interface AuthDisabledPanelProps {
  title: string;
  message: string;
  backHref?: string;
  backLabel?: string;
}

export function AuthDisabledPanel({
  title,
  message,
  backHref = "/",
  backLabel = "Back to main site",
}: AuthDisabledPanelProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V7a4 4 0 00-8 0v4m12 0a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h12a2 2 0 012 2v6z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">{message}</p>
          <Link
            href={backHref}
            className="btn-secondary mt-6 inline-flex"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
