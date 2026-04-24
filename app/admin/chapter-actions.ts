"use server";

import { ACTIVE_CHAPTER_COOKIE } from "@/lib/chapters";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * Persist the admin's currently-active chapter in a cookie and reload the
 * admin. Called by the chapter switcher in the sidebar.
 */
export async function setActiveChapter(formData: FormData) {
  const slug = String(formData.get("chapter_slug") ?? "").trim();
  const cookieStore = await cookies();

  if (!slug) {
    cookieStore.delete(ACTIVE_CHAPTER_COOKIE);
  } else {
    cookieStore.set(ACTIVE_CHAPTER_COOKIE, slug, {
      path: "/admin",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  // Revalidate all admin pages so scoped data re-renders with the new chapter.
  revalidatePath("/admin", "layout");
  redirect("/admin");
}
