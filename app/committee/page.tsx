import { redirect } from "next/navigation";
// Committee is inherently per-chapter. Redirect visitors to the chapter directory.
export default function StateCommitteeRedirect() {
  redirect("/chapters");
}
