import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy route — profile editing lives at /me/profile for all users. */
export default function AdminProfileRedirect() {
  redirect("/me/profile");
}
