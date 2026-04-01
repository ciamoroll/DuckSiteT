require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

function isStrongPassword(value) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(String(value || ""));
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function printUsage() {
  console.log("Usage:");
  console.log(
    "  node scripts/create-admin.js --email <email> --password <password> --first-name <firstName> --last-name <lastName>",
  );
}

async function findAuthUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Failed to list users: ${error.message}`);

    const users = data?.users || [];
    const found = users.find((u) => String(u.email || "").toLowerCase() === email);
    if (found) return found;

    if (users.length < perPage) break;
    page += 1;
  }

  return null;
}

async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env");
  }

  const args = parseArgs(process.argv);
  const email = String(args.email || "").trim().toLowerCase();
  const password = String(args.password || "");
  const firstName = String(args["first-name"] || "").trim();
  const lastName = String(args["last-name"] || "").trim();

  if (!email || !password || !firstName || !lastName) {
    printUsage();
    throw new Error("Missing required arguments");
  }

  if (!isStrongPassword(password)) {
    throw new Error(
      "Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character.",
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let userId = null;
  let authUser = await findAuthUserByEmail(supabase, email);

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: "admin",
      },
    });

    if (error || !data?.user?.id) {
      throw new Error(error?.message || "Failed to create auth admin user");
    }

    authUser = data.user;
    console.log("Created auth user:", authUser.id);
  } else {
    console.log("Auth user already exists, promoting profile role to admin:", authUser.id);
  }

  userId = authUser.id;

  const { error: profileError } = await supabase.from("users").upsert({
    id: userId,
    uid: userId,
    email,
    first_name: firstName,
    last_name: lastName,
    role: "admin",
    profile_completed: true,
    profile_step: 3,
    status: "Active",
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    throw new Error(`Failed to upsert admin profile: ${profileError.message}`);
  }

  console.log("Admin account is ready.");
  console.log(`Email: ${email}`);
  console.log(`User ID: ${userId}`);
}

main().catch((error) => {
  console.error("create-admin failed:", error.message);
  process.exit(1);
});
