/**
 * Move all diary entries from one date to another (same user).
 *
 * Run:
 *   node scripts/move-diary-date.js --from 2026-06-03 --to 2026-06-02
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (Dashboard → Settings → API).
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SCHEMA = process.env.SUPABASE_SCHEMA ?? "calories";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env`);
  return value;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let fromDate;
  let toDate;
  let userEmail;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from") fromDate = args[++i];
    else if (args[i] === "--to") toDate = args[++i];
    else if (args[i] === "--email") userEmail = args[++i];
  }

  if (!fromDate || !toDate) {
    throw new Error("Usage: node scripts/move-diary-date.js --from YYYY-MM-DD --to YYYY-MM-DD [--email user@example.com]");
  }

  return { fromDate, toDate, userEmail };
}

async function resolveUserId(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;

  const users = data.users ?? [];
  if (users.length === 0) throw new Error("No auth users found.");

  if (email) {
    const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!match) throw new Error(`No user with email ${email}`);
    return match.id;
  }

  if (users.length === 1) return users[0].id;

  throw new Error(
    `Multiple users (${users.length}). Re-run with --email you@example.com\n` +
      users.map((u) => `  - ${u.email ?? "(no email)"}`).join("\n"),
  );
}

async function countRows(db, table, userId, loggedDate) {
  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("logged_date", loggedDate);
  if (error) throw error;
  return count ?? 0;
}

async function updateRows(db, table, userId, fromDate, toDate) {
  const { data, error } = await db
    .from(table)
    .update({ logged_date: toDate })
    .eq("user_id", userId)
    .eq("logged_date", fromDate)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

async function movePkDateRow(db, table, userId, fromDate, toDate) {
  const { data: source, error: sourceErr } = await db
    .from(table)
    .select("logged_date")
    .eq("user_id", userId)
    .eq("logged_date", fromDate)
    .maybeSingle();
  if (sourceErr) throw sourceErr;
  if (!source) return 0;

  const { data: target, error: targetErr } = await db
    .from(table)
    .select("logged_date")
    .eq("user_id", userId)
    .eq("logged_date", toDate)
    .maybeSingle();
  if (targetErr) throw targetErr;

  if (target) {
    const { error: delErr } = await db
      .from(table)
      .delete()
      .eq("user_id", userId)
      .eq("logged_date", fromDate);
    if (delErr) throw delErr;
    return 1;
  }

  const { error: updErr } = await db
    .from(table)
    .update({ logged_date: toDate })
    .eq("user_id", userId)
    .eq("logged_date", fromDate);
  if (updErr) throw updErr;
  return 1;
}

async function main() {
  const { fromDate, toDate, userEmail } = parseArgs();
  const url = requireEnv("SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const db = createClient(url, serviceKey, {
    db: { schema: SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userId = await resolveUserId(admin, userEmail);
  console.log(`User: ${userId}`);
  console.log(`Moving diary data ${fromDate} → ${toDate}\n`);

  const tables = ["diary_meals", "food_logs", "exercise_logs", "step_logs", "weight_logs"];
  for (const table of tables) {
    const before = await countRows(db, table, userId, fromDate);
    console.log(`${table}: ${before} row(s) on ${fromDate}`);
  }

  const mealCount = await updateRows(db, "diary_meals", userId, fromDate, toDate);
  const foodCount = await updateRows(db, "food_logs", userId, fromDate, toDate);
  const exerciseCount = await updateRows(db, "exercise_logs", userId, fromDate, toDate);
  const stepCount = await movePkDateRow(db, "step_logs", userId, fromDate, toDate);
  const weightCount = await movePkDateRow(db, "weight_logs", userId, fromDate, toDate);
  const closureCount = await movePkDateRow(db, "diary_closures", userId, fromDate, toDate);

  console.log("\nUpdated:");
  console.log(`  diary_meals: ${mealCount}`);
  console.log(`  food_logs: ${foodCount}`);
  console.log(`  exercise_logs: ${exerciseCount}`);
  console.log(`  step_logs: ${stepCount}`);
  console.log(`  weight_logs: ${weightCount}`);
  console.log(`  diary_closures: ${closureCount}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
