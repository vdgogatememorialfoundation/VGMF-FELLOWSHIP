import { redirect } from "next/navigation";

export default function AdminNoticesRedirect() {
  redirect("/admin/website?tab=notices");
}
