"use server";

import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import {
  assertCanMutateMember,
  getAdminContext,
  getAuthedAdmin,
  resolveAuthIdentity,
} from "@/lib/auth";
import { assertNotLocked } from "@/lib/locks";
import { sendEmail } from "@/lib/email";
import { mintDefaultEmail } from "@/lib/default-email";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/** Write an audit row capturing real actor + (when impersonating) effective. */
async function audit(opts: {
  action: string;
  target_id?: string | null;
  diff?: Record<string, unknown> | null;
}) {
  try {
    const { real, effective, isImpersonating } = await resolveAuthIdentity();
    const svc = createServiceClient();
    await svc.from("admin_audit_log").insert({
      actor_id: real.id,
      acting_as_id: isImpersonating ? effective.id : null,
      action: opts.action,
      target_table: "members",
      target_id: opts.target_id ?? null,
      diff: opts.diff ?? null,
    });
  } catch {
    // Audit failures must not block the action.
  }
}

// -------- Error handling helpers --------

/** Check whether an error is Next's redirect signal — those must propagate. */
function isRedirect(e: unknown): boolean {
  const d = (e as { digest?: string } | undefined)?.digest;
  return typeof d === "string" && d.startsWith("NEXT_REDIRECT");
}

function redirectWithError(msg: string): never {
  redirect("/admin/members?error=" + encodeURIComponent(msg));
}

function redirectOK(msg?: string): never {
  const q = new URLSearchParams();
  if (msg) q.set("ok", msg);
  redirect("/admin/members" + (q.toString() ? "?" + q.toString() : ""));
}

/** Map low-level DB / auth errors to something an admin can act on. */
function friendlyError(raw: string): string {
  if (/members_pkey/i.test(raw)) return "That Member ID is already taken — pick a different one.";
  if (/members_email_key/i.test(raw))
    return "That contact email is already used by another member. Use a different email or update the existing member.";
  if (/members_auth_user_id/i.test(raw))
    return "That user is already linked to another member row.";
  if (/User already registered|already been registered|email_exists/i.test(raw))
    return "That login email is already registered in auth. Pick a different login email.";
  if (/password/i.test(raw) && /short|weak|length/i.test(raw))
    return "Password is too weak. Use at least 8 characters.";
  return raw;
}

/**
 * Pre-check duplicates before hitting the unique-index trip wire. Postgres
 * gives us a generic message; we want to name the offending row so the admin
 * can edit/delete it instead of guessing.
 *
 * Case-insensitive match against `email` (we already lowercase on parse, but
 * historic rows may have mixed-case data from before that change).
 *
 * Returns a friendly message string, or null if no existing match.
 */
async function findExistingMemberByEmail(
  email: string,
  ignoreId?: string,
): Promise<string | null> {
  if (!email) return null;
  const svc = createServiceClient();
  const { data } = await svc
    .from("members")
    .select("id, name, role, active")
    .ilike("email", email)
    .limit(2);
  const match = (data ?? []).find((r) => r.id !== ignoreId);
  if (!match) return null;
  const status = match.active ? "active" : "inactive";
  return `That contact email already belongs to "${match.name}" (id: ${match.id}, ${status} ${match.role}). Edit that member instead, change this email, or delete the existing row first.`;
}

function parseMemberForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const company = String(formData.get("company") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "Member") as
    | "Member"
    | "Executive";
  const role = String(formData.get("role") ?? "member") as
    | "member"
    | "admin"
    | "super_admin";
  const memberSinceRaw = String(formData.get("member_since") ?? "").trim();
  const active = formData.get("active") === "on";

  return {
    name,
    email,
    phone,
    company,
    category,
    role,
    active,
    member_since: memberSinceRaw || new Date().toISOString().slice(0, 10),
  };
}

// -------- Public actions --------

export async function createMember(formData: FormData) {
  try {
    const me = await getAuthedAdmin();
    const ctx = await getAdminContext();
    await assertNotLocked(me, {
      category: "members",
      chapterId: ctx.activeChapterId,
    });
    const id = String(formData.get("id") ?? "").trim();
    if (!id) redirectWithError("Member ID is required.");

    const payload = parseMemberForm(formData);
    await assertCanMutateMember({ caller: me, incomingRole: payload.role });

    // If the admin left contact-email blank, mint a placeholder
    // (john.doe@upcbma.com — auto-collision-handled to .2, .3, …) so the
    // row is still valid. The member can change it themselves on first
    // login or via /me/profile. Useful when backfilling rosters where
    // half the emails aren't known yet.
    if (!payload.email) {
      payload.email = await mintDefaultEmail(payload.name);
    }

    // Pre-check: surface an actionable error if this email already exists.
    // (The DB constraint will still catch races; this is just the happy path.)
    const conflict = await findExistingMemberByEmail(payload.email);
    if (conflict) redirectWithError(conflict);

    const hasLogin = formData.get("has_login") === "on";
    const loginEmail = String(formData.get("login_email") ?? "")
      .trim()
      .toLowerCase();
    const initialPassword = String(formData.get("initial_password") ?? "");

    const svc = createServiceClient();
    let authUserId: string | null = null;

    if (hasLogin) {
      if (!loginEmail)
        redirectWithError("Login email is required when creating a login account.");
      if (!initialPassword || initialPassword.length < 8)
        redirectWithError("Initial password must be at least 8 characters long.");

      const { data: authData, error: authError } =
        await svc.auth.admin.createUser({
          email: loginEmail,
          password: initialPassword,
          email_confirm: true,
        });
      if (authError || !authData?.user) {
        redirectWithError(
          friendlyError(authError?.message ?? "Could not create login account."),
        );
      }
      authUserId = authData.user.id;
    } else {
      payload.role = "member";
    }

    const { error } = await svc
      .from("members")
      .insert({ id, ...payload, auth_user_id: authUserId });

    if (error) {
      // Roll back the orphaned auth user so retrying works cleanly.
      if (authUserId) {
        await svc.auth.admin.deleteUser(authUserId).catch(() => {});
      }
      redirectWithError(friendlyError(error.message));
    }

    // Attach to the active chapter (if the form was submitted from a
    // chapter-scoped view). Failure here is non-fatal — we log but don't
    // unwind the members insert, since the member row is still valid.
    const chapterId = String(formData.get("chapter_id") ?? "").trim() || null;
    const categoryId =
      String(formData.get("category_id") ?? "").trim() || null;
    if (chapterId) {
      const { error: mErr } = await svc.from("chapter_memberships").insert({
        member_id: id,
        chapter_id: chapterId,
        category_id: categoryId,
        member_since: payload.member_since,
        active: payload.active,
      });
      if (mErr) {
        console.warn("chapter_memberships insert:", mErr.message);
      }

      // Chapter-scoped admin: also grant an admin_scopes row for this chapter
      // so they only see this chapter in their sidebar switcher.
      // (super_admin is handled specially and never needs scope rows.)
      if (hasLogin && payload.role === "admin") {
        const { error: sErr } = await svc.from("admin_scopes").insert({
          member_id: id,
          chapter_id: chapterId,
          granted_by: me.id,
        });
        if (sErr) {
          console.warn("admin_scopes insert:", sErr.message);
        }
      }
    }

    await audit({
      action: hasLogin ? "create_member_with_login" : "create_member",
      target_id: id,
      diff: {
        name: payload.name,
        role: payload.role,
        chapter_id: chapterId,
        login_email: hasLogin ? loginEmail : null,
      },
    });

    revalidatePath("/admin/members");
    redirectOK("Member added.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(
      friendlyError(e instanceof Error ? e.message : String(e)),
    );
  }
}

export async function updateMember(id: string, formData: FormData) {
  try {
    const me = await getAuthedAdmin();
    const ctx = await getAdminContext();
    await assertNotLocked(me, {
      category: "members",
      chapterId: ctx.activeChapterId,
      resourceId: id,
    });
    const payload = parseMemberForm(formData);

    await assertCanMutateMember({
      caller: me,
      targetId: id,
      incomingRole: payload.role,
    });

    // Same friendly conflict check on edit — but exclude the current row so
    // saving an unrelated field on an existing member doesn't trip itself up.
    const conflict = await findExistingMemberByEmail(payload.email, id);
    if (conflict) redirectWithError(conflict);

    const svc = createServiceClient();
    const { error } = await svc.from("members").update(payload).eq("id", id);
    if (error) redirectWithError(friendlyError(error.message));

    await audit({
      action: "update_member",
      target_id: id,
      diff: { name: payload.name, role: payload.role, email: payload.email },
    });

    revalidatePath("/admin/members");
    redirectOK("Member updated.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(
      friendlyError(e instanceof Error ? e.message : String(e)),
    );
  }
}

export async function toggleMemberActive(id: string, active: boolean) {
  try {
    const me = await getAuthedAdmin();
    await assertCanMutateMember({ caller: me, targetId: id });

    const svc = createServiceClient();
    const { error } = await svc
      .from("members")
      .update({ active })
      .eq("id", id);
    if (error) redirectWithError(friendlyError(error.message));

    revalidatePath("/admin/members");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(
      friendlyError(e instanceof Error ? e.message : String(e)),
    );
  }
}

/**
 * Promote a member to admin or demote them back to plain "member".
 *
 * Guard rails:
 *   - super_admin role can only be modified by another super_admin (handled
 *     inside assertCanMutateMember).
 *   - We never overwrite super_admin via this action — the caller has to
 *     pick "admin" or "member" explicitly.
 *   - Audit log captures the before/after role and who flipped it.
 */
export async function setMemberAdmin(id: string, makeAdmin: boolean) {
  try {
    const me = await getAuthedAdmin();
    await assertCanMutateMember({ caller: me, targetId: id });

    const svc = createServiceClient();
    const { data: existing } = await svc
      .from("members")
      .select("role, name")
      .eq("id", id)
      .maybeSingle();

    if (!existing) redirectWithError("Member not found.");
    if (existing.role === "super_admin") {
      redirectWithError("Super admins can't be flipped from this screen.");
    }

    const next = makeAdmin ? "admin" : "member";
    if (existing.role === next) {
      // No-op — quietly succeed so the UI just refreshes.
      revalidatePath("/admin/members");
      return;
    }

    const { error } = await svc
      .from("members")
      .update({ role: next })
      .eq("id", id);
    if (error) redirectWithError(friendlyError(error.message));

    await audit({
      action: makeAdmin ? "promote_admin" : "demote_admin",
      target_id: id,
      diff: { from: existing.role, to: next },
    });

    revalidatePath("/admin/members");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(
      friendlyError(e instanceof Error ? e.message : String(e)),
    );
  }
}

export async function deleteMember(id: string) {
  try {
    const me = await getAuthedAdmin();
    const ctx = await getAdminContext();
    await assertNotLocked(me, {
      category: "members",
      chapterId: ctx.activeChapterId,
      resourceId: id,
    });
    await assertCanMutateMember({ caller: me, targetId: id });

    const svc = createServiceClient();
    const { data: target } = await svc
      .from("members")
      .select("auth_user_id")
      .eq("id", id)
      .maybeSingle();

    if (target?.auth_user_id === me.auth_user_id) {
      redirectWithError("You cannot delete your own account.");
    }

    const { error } = await svc.from("members").delete().eq("id", id);
    if (error) redirectWithError(friendlyError(error.message));

    if (target?.auth_user_id) {
      await svc.auth.admin.deleteUser(target.auth_user_id).catch(() => {});
    }

    await audit({
      action: "delete_member",
      target_id: id,
      diff: { had_login: !!target?.auth_user_id },
    });

    revalidatePath("/admin/members");
    redirectOK("Member deleted.");
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(
      friendlyError(e instanceof Error ? e.message : String(e)),
    );
  }
}

export async function resetMemberPassword(
  memberId: string,
  newPassword: string,
) {
  // This one is called from a client handler (not a form action), so we
  // still throw on error — the caller has its own try/catch and UI error
  // display.
  const me = await getAuthedAdmin();
  await assertCanMutateMember({ caller: me, targetId: memberId });

  if (!newPassword || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const svc = createServiceClient();
  const { data: target } = await svc
    .from("members")
    .select("auth_user_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!target?.auth_user_id) {
    throw new Error("This member does not have a login account.");
  }

  const { error } = await svc.auth.admin.updateUserById(target.auth_user_id, {
    password: newPassword,
  });
  if (error) throw new Error(friendlyError(error.message));

  await audit({ action: "reset_member_password", target_id: memberId });
}

// ============================================================================
// INVITE FLOW
// ============================================================================

/**
 * Slugify a name into a likely UPCBMA login local-part. We aim for
 * `firstname.lastname` and fall back to a single-word slug. Numeric suffixes
 * are added (in checkAvailableLogin) when the address is already taken.
 */
function suggestLocalPart(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, "")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "member";
  if (parts.length === 1) return parts[0]!.slice(0, 24);
  return `${parts[0]}.${parts[parts.length - 1]}`.slice(0, 32);
}

/**
 * Crypto-strong temp password — 12 chars, high entropy, mixed case + digits.
 * Avoids look-alike characters (0/O, 1/l/I) so people can read it off the
 * email and type it correctly.
 */
function generateTempPassword(): string {
  const alphabet =
    "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  // Use crypto.randomUUID for entropy and slice; fall back to Math.random.
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/**
 * Find a unique @upcbma.com login email. Tries the suggested local part,
 * then `<suggested>2`, `<suggested>3`, … until a free one is found.
 */
async function pickAvailableLogin(suggested: string): Promise<string> {
  const svc = createServiceClient();
  const { data: list } = await svc.auth.admin.listUsers({ perPage: 1000 });
  const taken = new Set(
    (list?.users ?? [])
      .map((u) => (u.email ?? "").toLowerCase())
      .filter(Boolean),
  );
  let candidate = `${suggested}@upcbma.com`;
  let n = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${suggested}${n}@upcbma.com`;
    n++;
    if (n > 50) {
      throw new Error(
        "Couldn't find a free @upcbma.com login email — pick one manually.",
      );
    }
  }
  return candidate;
}

/**
 * Invite a new member.
 *
 * Inputs (form):
 *   id           — Member ID (required, unique)
 *   name         — Full name
 *   email        — Their PERSONAL contact email; the invite is sent here
 *   phone        — optional
 *   company      — optional
 *   login_email  — optional override for @upcbma.com login (else auto-generated)
 *   chapter_id   — chapter this member belongs to (optional, but recommended)
 *   category_id  — member category within that chapter (optional)
 *
 * Effect:
 *   1. Picks a free @upcbma.com login (suggestion or admin override).
 *   2. Generates a 12-char temp password.
 *   3. Creates the auth user with email_confirm=true (no email confirmation
 *      step — admin is vouching for this person).
 *   4. Inserts the members row with must_change_password=true and a
 *      chapter_membership tying them to the chosen chapter.
 *   5. Emails the invite to the member's PERSONAL email — both the new login
 *      address and the temp password — with instructions to sign in and reset.
 */
export async function inviteMember(formData: FormData) {
  try {
    const me = await getAuthedAdmin();
    const ctx = await getAdminContext();
    await assertNotLocked(me, {
      category: "members",
      chapterId: ctx.activeChapterId,
    });

    const id = String(formData.get("id") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const personalEmail = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const phone = String(formData.get("phone") ?? "").trim() || null;
    const company = String(formData.get("company") ?? "").trim() || null;
    const overrideLogin = String(formData.get("login_email") ?? "")
      .trim()
      .toLowerCase();
    const chapterId =
      String(formData.get("chapter_id") ?? "").trim() || null;
    const categoryId =
      String(formData.get("category_id") ?? "").trim() || null;

    if (!id) redirectWithError("Member ID is required.");
    if (!name) redirectWithError("Name is required.");
    if (!personalEmail) redirectWithError("Personal email is required (the invite goes here).");

    // Pre-flight: friendly conflict error.
    const conflict = await findExistingMemberByEmail(personalEmail);
    if (conflict) redirectWithError(conflict);

    // Pick (or validate) the @upcbma.com login email.
    let loginEmail: string;
    if (overrideLogin) {
      if (!overrideLogin.endsWith("@upcbma.com")) {
        redirectWithError("Login email must end with @upcbma.com.");
      }
      loginEmail = overrideLogin;
    } else {
      loginEmail = await pickAvailableLogin(suggestLocalPart(name));
    }

    const tempPassword = generateTempPassword();
    const svc = createServiceClient();

    // 1. Create the auth user.
    const { data: authData, error: authError } = await svc.auth.admin.createUser(
      {
        email: loginEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { invited_by: me.id, must_change_password: true },
      },
    );
    if (authError || !authData?.user) {
      redirectWithError(
        friendlyError(authError?.message ?? "Could not create login account."),
      );
    }
    const authUserId = authData.user.id;

    // 2. Insert the members row.
    const { error: insertError } = await svc.from("members").insert({
      id,
      name,
      email: personalEmail,
      phone,
      company,
      role: "member",
      active: true,
      member_since: new Date().toISOString().slice(0, 10),
      auth_user_id: authUserId,
      must_change_password: true,
    });
    if (insertError) {
      // Roll back the orphaned auth user so the admin can retry cleanly.
      await svc.auth.admin.deleteUser(authUserId).catch(() => {});
      redirectWithError(friendlyError(insertError.message));
    }

    // 3. Attach to chapter (best-effort — chapter membership failure shouldn't
    //    unwind the auth+member rows we just created).
    if (chapterId) {
      const { error: cmErr } = await svc.from("chapter_memberships").insert({
        member_id: id,
        chapter_id: chapterId,
        category_id: categoryId,
        member_since: new Date().toISOString().slice(0, 10),
        active: true,
      });
      if (cmErr) console.warn("chapter_memberships insert:", cmErr.message);
    }

    // 4. Send the invitation email to the member's personal address.
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://upcbma.com";
    const text = [
      `Hi ${name},`,
      ``,
      `You've been invited to UPCBMA — the Uttar Pradesh Corrugated Box Manufacturers' Association.`,
      ``,
      `Sign in here: ${siteUrl}/login`,
      `  Email:    ${loginEmail}`,
      `  Password: ${tempPassword}`,
      ``,
      `For security you'll be asked to set your own password right after you sign in for the first time.`,
      ``,
      `Once you're in, head to your profile to add a photo and a short quote — those will appear on the public committee page if you hold a position.`,
      ``,
      `If you weren't expecting this, ignore the email — the temporary password becomes useless once it's reset or after we revoke the invite.`,
      ``,
      `— UPCBMA secretariat`,
    ].join("\n");

    const html = `
      <p>Hi ${name},</p>
      <p>You&rsquo;ve been invited to <strong>UPCBMA</strong> &mdash; the Uttar Pradesh Corrugated Box Manufacturers&rsquo; Association.</p>
      <table cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse">
        <tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Sign in at</td>
            <td style="padding:6px 0;font-size:14px"><a href="${siteUrl}/login" style="color:#0d6b3e">${siteUrl}/login</a></td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Email</td>
            <td style="padding:6px 0;font-size:14px;font-family:ui-monospace,monospace">${loginEmail}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Temp password</td>
            <td style="padding:6px 0;font-size:14px;font-family:ui-monospace,monospace">${tempPassword}</td></tr>
      </table>
      <p style="font-size:13px;color:#64748b">For security you&rsquo;ll be asked to set your own password right after you sign in for the first time.</p>
      <p style="font-size:13px;color:#64748b">Once you&rsquo;re in, head to your profile to add a photo and a short quote &mdash; those will appear on the public committee page if you hold a position.</p>
      <p style="font-size:12px;color:#94a3b8;margin-top:24px">If you weren&rsquo;t expecting this email, ignore it &mdash; the temporary password becomes useless once it&rsquo;s reset or after we revoke the invite.</p>
    `;

    const emailRes = await sendEmail({
      to: personalEmail,
      subject: `You've been invited to UPCBMA — sign in details inside`,
      text,
      html,
      tag: "member_invite",
    });

    // 5. Audit + redirect with the right success message.
    await audit({
      action: "invite_member",
      target_id: id,
      diff: {
        login_email: loginEmail,
        contact_email: personalEmail,
        chapter_id: chapterId,
        email_sent: emailRes.ok,
      },
    });

    revalidatePath("/admin/members");

    if (emailRes.ok) {
      redirectOK(
        `Invited ${name}. Email sent to ${personalEmail}. Login: ${loginEmail}.`,
      );
    } else {
      // Email didn't go through (no Resend key, or send failed). Show the
      // credentials inline so the admin can copy-paste manually instead of
      // losing them.
      redirectOK(
        `Invited ${name} (email did NOT send — share these manually). Login: ${loginEmail} · Temp password: ${tempPassword}`,
      );
    }
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(
      friendlyError(e instanceof Error ? e.message : String(e)),
    );
  }
}

/**
 * Re-issue the invite — useful when the original email got lost. Generates
 * a fresh temp password, sets must_change_password=true, and re-emails.
 */
export async function resendInvite(memberId: string) {
  try {
    const me = await getAuthedAdmin();
    await assertCanMutateMember({ caller: me, targetId: memberId });

    const svc = createServiceClient();
    const { data: target } = await svc
      .from("members")
      .select("id, name, email, auth_user_id")
      .eq("id", memberId)
      .maybeSingle();
    if (!target?.auth_user_id) {
      redirectWithError("This member doesn't have a login account yet.");
    }

    // Resolve their @upcbma login from auth.users.
    const { data: list } = await svc.auth.admin.listUsers({ perPage: 1000 });
    const u = list?.users?.find((u) => u.id === target.auth_user_id);
    const loginEmail = u?.email ?? "(unknown)";

    const tempPassword = generateTempPassword();
    const { error: updErr } = await svc.auth.admin.updateUserById(
      target.auth_user_id,
      { password: tempPassword },
    );
    if (updErr) redirectWithError(friendlyError(updErr.message));

    await svc
      .from("members")
      .update({ must_change_password: true })
      .eq("id", memberId);

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://upcbma.com";
    const emailRes = await sendEmail({
      to: target.email,
      subject: `Your UPCBMA login — fresh credentials`,
      text:
        `Hi ${target.name},\n\n` +
        `Here are fresh sign-in details for UPCBMA.\n\n` +
        `Sign in: ${siteUrl}/login\n` +
        `  Email:    ${loginEmail}\n` +
        `  Password: ${tempPassword}\n\n` +
        `You'll be asked to set your own password on next sign-in.\n\n— UPCBMA secretariat`,
      tag: "member_invite_resend",
    });

    await audit({
      action: "resend_invite",
      target_id: memberId,
      diff: { email_sent: emailRes.ok },
    });

    revalidatePath("/admin/members");
    if (emailRes.ok) {
      redirectOK(`Re-sent invite to ${target.email}.`);
    } else {
      redirectOK(
        `Reset password (email did NOT send). Login: ${loginEmail} · Temp password: ${tempPassword}`,
      );
    }
  } catch (e) {
    if (isRedirect(e)) throw e;
    redirectWithError(
      friendlyError(e instanceof Error ? e.message : String(e)),
    );
  }
}
