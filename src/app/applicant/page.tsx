import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getPublicFormSchedule } from "@/lib/cms";
import { PortalGate } from "@/components/auth/PortalGate";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FormSchedulePanel } from "@/components/forms/FormScheduleCountdown";
import Link from "next/link";
import { FileText, Activity, HelpCircle, ArrowRight } from "lucide-react";

async function ApplicantDashboard() {
  const user = await getSession();
  if (!user) return null;

  const [applications, notifications, applicationWindow] = await Promise.all([
    prisma.application.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { sentAt: "desc" },
      take: 5,
    }),
    getPublicFormSchedule(),
  ]);

  const latestApp = applications[0];
  const schedule = applicationWindow?.schedule;
  const formLive = schedule?.phase === "open";
  const formUpcoming = schedule?.phase === "upcoming";
  const formClosed =
    schedule?.phase === "closed" || schedule?.phase === "disabled";

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
          <p className="mt-1 text-gray-600">
            User ID: <span className="font-medium text-primary-600">{user.userId}</span>
          </p>
        </div>

        {(formUpcoming || formClosed) && applicationWindow && (
          <FormSchedulePanel
            schedule={applicationWindow.schedule}
            formName={applicationWindow.formName}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {formLive || latestApp?.status === "SUBMITTED" || latestApp?.status === "DRAFT" ? (
            <Link href="/applicant/forms" className="card group transition hover:border-primary-300 hover:shadow-md">
              <FileText className="h-8 w-8 text-primary-600" />
              <h3 className="mt-3 font-semibold group-hover:text-primary-700">Application Forms</h3>
              <p className="mt-1 text-sm text-gray-600">
                {formLive
                  ? "Complete your fellowship application"
                  : latestApp
                    ? "View your application"
                    : "Application form"}
              </p>
              <ArrowRight className="mt-3 h-4 w-4 text-gray-400 group-hover:text-primary-600" />
            </Link>
          ) : (
            <div className="card border-dashed border-primary-200 bg-primary-50/40">
              <FileText className="h-8 w-8 text-primary-400" />
              <h3 className="mt-3 font-semibold text-gray-900">Application Forms</h3>
              <p className="mt-1 text-sm text-gray-600">
                {formUpcoming
                  ? "The form unlocks when applications open — see countdown above."
                  : "Applications are currently closed."}
              </p>
            </div>
          )}

          <Link href="/applicant/status" className="card group transition hover:border-primary-300 hover:shadow-md">
            <Activity className="h-8 w-8 text-primary-600" />
            <h3 className="mt-3 font-semibold group-hover:text-primary-700">Applicant State</h3>
            <p className="mt-1 text-sm text-gray-600">Track your application status</p>
            <ArrowRight className="mt-3 h-4 w-4 text-gray-400 group-hover:text-primary-600" />
          </Link>

          <Link href="/applicant/support" className="card group transition hover:border-primary-300 hover:shadow-md">
            <HelpCircle className="h-8 w-8 text-primary-600" />
            <h3 className="mt-3 font-semibold group-hover:text-primary-700">Support</h3>
            <p className="mt-1 text-sm text-gray-600">Get help with your application</p>
            <ArrowRight className="mt-3 h-4 w-4 text-gray-400 group-hover:text-primary-600" />
          </Link>
        </div>

        {latestApp ? (
          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Current Application</h2>
              <StatusBadge status={latestApp.status} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Application Number</p>
                <p className="font-medium font-mono tracking-wide">{latestApp.applicationNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Submitted</p>
                <p className="font-medium">
                  {latestApp.submittedAt
                    ? new Date(latestApp.submittedAt).toLocaleDateString("en-IN")
                    : "Not yet submitted"}
                </p>
              </div>
            </div>
            {latestApp.status === "DRAFT" && formLive && (
              <Link href="/applicant/forms" className="btn-primary mt-4 inline-flex">
                Continue Application
              </Link>
            )}
            {latestApp.status === "DRAFT" && formUpcoming && (
              <p className="mt-4 text-sm text-amber-800">
                Your draft is saved. You can continue editing when applications open.
              </p>
            )}
          </div>
        ) : (
          <div className="card text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold">No Application Yet</h3>
            {formLive ? (
              <>
                <p className="mt-2 text-sm text-gray-600">
                  Start your fellowship application to begin the process
                </p>
                <Link href="/applicant/forms" className="btn-primary mt-4 inline-flex">
                  Start Application
                </Link>
              </>
            ) : formUpcoming ? (
              <p className="mt-2 text-sm text-gray-600">
                Applications are not open yet. Check the countdown above for the opening time.
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-600">
                Applications are currently closed. See official notices for updates.
              </p>
            )}
          </div>
        )}

        {notifications.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold">Recent Notifications</h2>
            <div className="mt-4 space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(n.sentAt).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
  );
}

export default async function ApplicantPage() {
  return (
    <PortalGate portal="applicant" showRegisterLink>
      <ApplicantDashboard />
    </PortalGate>
  );
}
