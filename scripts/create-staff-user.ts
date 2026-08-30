import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

import type { Database, TablesInsert } from "../types/database";

type Role = "clinician" | "admin";

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

function fail(message: string): never {
  console.error(message);
  console.error(
    "\nUsage: pnpm create-staff -- --role=clinician|admin --email=... --password=... --first-name=... --last-name=... [--phone=...] [--department=...] [--mdcn=...] [--speciality=...] [--languages=en,yo]",
  );
  process.exit(1);
}

async function main() {
  const args = parseArgs();
  const role = args.role as Role;
  if (role !== "clinician" && role !== "admin") {
    fail(`--role must be "clinician" or "admin", got: ${args.role ?? "(none)"}`);
  }

  const email = args.email;
  const password = args.password;
  const firstName = args["first-name"];
  const lastName = args["last-name"];
  if (!email || !password || !firstName || !lastName) {
    fail("Missing one of: --email --password --first-name --last-name");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    fail(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Run via `pnpm create-staff` (loads .env.local automatically).",
    );
  }

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket as never },
  });

  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (createError || !created.user) {
    fail(`Auth user creation failed: ${createError?.message}`);
  }

  const userId = created.user.id;

  const profile: TablesInsert<"profiles"> = {
    id: userId,
    role,
    first_name: firstName,
    last_name: lastName,
    email,
    phone: args.phone ?? null,
    department: args.department ?? null,
    mdcn_number: role === "clinician" ? (args.mdcn ?? null) : null,
    speciality: role === "clinician" ? (args.speciality ?? null) : null,
    languages:
      role === "clinician"
        ? (args.languages
            ? args.languages.split(",").map((s) => s.trim())
            : ["en"])
        : null,
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .insert(profile);
  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    fail(`Profile insert failed, auth user rolled back: ${profileError.message}`);
  }

  console.log(`Created ${role}: ${email} (${userId})`);
}

main();
