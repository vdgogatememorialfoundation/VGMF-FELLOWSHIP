// This page uses the same component as reviewer - redirect to maintain consistency
import { redirect } from "next/navigation";

export default function CommitteeScoresPage() {
  // Committee members use the same scoring system as reviewers
  redirect("/reviewer/scores");
}
