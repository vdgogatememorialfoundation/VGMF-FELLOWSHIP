import { redirect } from "next/navigation";

export default function AdminCmsRedirect() {
  redirect("/admin/website?tab=branding");
}
