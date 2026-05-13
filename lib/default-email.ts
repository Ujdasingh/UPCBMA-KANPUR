/**
 * Default-email helper. When a chapter admin invites a new member but
 * doesn't have their real email handy, we mint a placeholder of the form
 * "first.last@upcbma.com" so they can still create the login. The
 * member can change it themselves the first time they sign in.
 *
 * Collisions: if "lalit.shyamdasani@upcbma.com" is taken, the next call
 * returns "lalit.shyamdasani.2@upcbma.com", then ".3", and so on. We
 * cap at 99 because realistically no real chapter has 100 colliding
 * Lalit Shyamdasanis.
 */

import { createServiceClient } from "@/lib/supabase/server";

const DOMAIN = "upcbma.com";

/**
 * Turn a full name into the local-part of an email:
 *   "Lalit Shyamdasani"      → "lalit.shyamdasani"
 *   "Dr. Anand Bhatia"       → "anand.bhatia"     (title stripped)
 *   "Sushil   Kumar  Gupta"  → "sushil.kumar.gupta"
 *   "Naïve Café"             → "naive.cafe"        (accents flattened)
 *   ""                       → "member"            (fallback)
 *
 * Honorific-style prefixes are stripped before splitting so we don't
 * end up with "dr.anand.bhatia" or "sri.sushil.kumar.gupta".
 */
const TITLE_PREFIXES = new Set([
  "dr",
  "mr",
  "mrs",
  "ms",
  "miss",
  "sri",
  "shri",
  "smt",
  "prof",
  "er",
]);

export function slugifyName(name: string): string {
  const ascii = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z\s.]/g, " ")
    .toLowerCase()
    .trim();
  let parts = ascii
    .split(/[\s.]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  // Strip leading honorific if present.
  while (parts.length > 1 && TITLE_PREFIXES.has(parts[0]!)) {
    parts = parts.slice(1);
  }
  if (parts.length === 0) return "member";
  return parts.join(".");
}

/**
 * Mint a default email for the given name. Checks the members table
 * (contact email + login email) and auth.users to make sure the result
 * is actually free. Returns the first available form starting at the
 * base, then ".2", ".3", … up to ".99".
 */
export async function mintDefaultEmail(name: string): Promise<string> {
  const slug = slugifyName(name);
  const svc = createServiceClient();

  for (let i = 1; i <= 99; i++) {
    const candidate =
      i === 1 ? `${slug}@${DOMAIN}` : `${slug}.${i}@${DOMAIN}`;

    // members.email is the contact email — most common collision source.
    const { data: contactHit } = await svc
      .from("members")
      .select("id")
      .eq("email", candidate)
      .maybeSingle();
    if (contactHit) continue;

    // auth.users.email is the login email — checked separately because
    // the two can differ once a member edits their profile.
    const { data: authList } = await svc.auth.admin.listUsers({
      perPage: 1000,
    });
    const taken = authList?.users?.some(
      (u) => u.email?.toLowerCase() === candidate.toLowerCase(),
    );
    if (!taken) return candidate;
  }
  // Truly improbable, but fall through with a timestamp to guarantee
  // uniqueness.
  return `${slug}.${Date.now()}@${DOMAIN}`;
}
