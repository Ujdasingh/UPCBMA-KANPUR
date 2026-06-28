#!/usr/bin/env node
/**
 * Apply migrations/2026_05_28_permissions_rls.sql to the live Supabase project.
 *
 * Requires a Supabase personal access token (not the service role key):
 *   https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-permissions-rls.mjs
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const PROJECT_REF = "edkeagxgdpyzhrhkwcqs";
const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(
  join(__dirname, "../migrations/2026_05_28_permissions_rls.sql"),
  "utf8",
);

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN.\n" +
      "Create one at https://supabase.com/dashboard/account/tokens\n" +
      "Then run:\n" +
      "  SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-permissions-rls.mjs",
  );
  process.exit(1);
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/migrations`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "2026_05_28_permissions_rls",
      query: sql,
    }),
  },
);

const body = await res.text();
if (!res.ok) {
  console.error(`Migration failed (${res.status}):`, body);
  process.exit(1);
}

console.log("RLS migration applied successfully.");
console.log(body);
