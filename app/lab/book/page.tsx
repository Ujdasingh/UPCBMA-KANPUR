import { redirect } from "next/navigation";
// Bookings are per-chapter's lab. Route visitors to pick a chapter first.
export default function StateBookRedirect() {
  redirect("/chapters");
}
