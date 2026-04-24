import { redirect } from "next/navigation";
// Labs are per-chapter. Send visitors to pick a chapter first.
export default function StateLabRedirect() {
  redirect("/chapters");
}
