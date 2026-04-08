const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");
const jwt = require("jsonwebtoken");
const ALLOWED_EMAIL_DOMAIN = "paterostechnologicalcollege.edu.ph";
const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character.";
const INITIAL_STUDENT_XP = 20;
const PROFILE_SELECT_WITH_BIO = "id, uid, email, first_name, last_name, role, year_level, bio, class_id, class_code, student_id, profile_completed, profile_step, xp, status";
const PROFILE_SELECT_LEGACY = "id, uid, email, first_name, last_name, role, year_level, class_id, class_code, student_id, profile_completed, profile_step, xp, status";

function isStrongPassword(value) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(String(value || ""));
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isAllowedInstitutionalEmail(value) {
  const email = normalizeEmail(value);
  return email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

function domainRestrictionMessage() {
  return `Only institutional email addresses ending with @${ALLOWED_EMAIL_DOMAIN} are allowed.`;
}

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || "").toLowerCase();
  const column = String(columnName || "").toLowerCase();
  return message.includes(column) && (
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("column")
  );
}

async function withTimeout(promise, ms, message) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return errorResponse(res, 400, "email and password are required");
    }
    if (!isAllowedInstitutionalEmail(email)) {
      return errorResponse(res, 403, domainRestrictionMessage());
    }

    const normalizedEmail = normalizeEmail(email);

    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email: normalizedEmail, password }),
      10000,
      "Timed out while signing in",
    );

    if (error) {
      return errorResponse(res, 401, error.message);
    }

    return res.status(200).json({
      ok: true,
      message: "Login successful",
      user: data.user,
      session: data.session,
    });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected login error", { error: err.message });
  }
}

async function signup(req, res) {
  try {
    const { firstName, lastName, email, password } = req.body || {};
    if (!firstName || !lastName || !email || !password) {
      return errorResponse(res, 400, "firstName, lastName, email, and password are required");
    }
    if (!isAllowedInstitutionalEmail(email)) {
      return errorResponse(res, 403, domainRestrictionMessage());
    }
    if (!isStrongPassword(password)) {
      return errorResponse(res, 400, PASSWORD_POLICY_MESSAGE);
    }

    const normalizedEmail = normalizeEmail(email);
    let data;
    let error;

    try {
      const adminResult = await withTimeout(
        supabase.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
          },
        }),
        10000,
        "Timed out while creating auth user",
      );
      data = adminResult.data;
      error = adminResult.error;
    } catch (adminErr) {
      const fallback = await withTimeout(
        supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        }),
        10000,
        "Timed out while signing up auth user",
      );
      data = fallback.data;
      error = fallback.error || adminErr;
    }

    if (error) {
      return errorResponse(res, 400, error.message);
    }

    const user = data?.user;
    if (!user?.id) {
      return errorResponse(
        res,
        400,
        "Signup request was accepted but no user id was returned. Check Supabase email confirmation settings.",
      );
    }

    const { data: existingProfile } = await withTimeout(
      supabase
        .from("users")
        .select("role, profile_completed, profile_step, xp")
        .eq("id", user.id)
        .maybeSingle(),
      10000,
      "Timed out while reading existing profile row",
    );

    const preservedRole = existingProfile?.role || "student";
    const { error: profileError } = await withTimeout(
      supabase.from("users").upsert({
        id: user.id,
        uid: user.id,
        first_name: firstName,
        last_name: lastName,
        email: normalizedEmail,
        role: preservedRole,
        profile_completed: existingProfile?.profile_completed ?? false,
        profile_step: existingProfile?.profile_step ?? 1,
        xp: existingProfile?.xp ?? INITIAL_STUDENT_XP,
      }),
      10000,
      "Timed out while creating profile row",
    );

    if (profileError) {
      return errorResponse(res, 400, profileError.message);
    }

    return res.status(201).json({
      ok: true,
      message: "Signup successful",
      user,
    });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected signup error", { error: err.message });
  }
}

async function adminLogin(req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return errorResponse(res, 400, "username and password are required");
    }
    if (String(username || "").includes("@") && !isAllowedInstitutionalEmail(username)) {
      return errorResponse(res, 403, domainRestrictionMessage());
    }

    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;
    const adminJwtSecret = process.env.ADMIN_JWT_SECRET;
    if (!adminJwtSecret) {
      return errorResponse(res, 500, "Server misconfiguration: ADMIN_JWT_SECRET is required");
    }

    if (adminUser && adminPass && username === adminUser && password === adminPass) {
      const normalized = String(username).trim().toLowerCase();
      let resolvedFirstName = process.env.ADMIN_FIRST_NAME || "Prof.";
      let resolvedLastName = process.env.ADMIN_LAST_NAME || "Cabantog";

      // Prefer profile name from DB when the env admin username matches an admin email.
      const { data: profileByEmail } = await withTimeout(
        supabase
          .from("users")
          .select("first_name, last_name, role")
          .eq("email", normalized)
          .maybeSingle(),
        10000,
        "Timed out while reading env admin profile",
      );
      if (profileByEmail && profileByEmail.role === "admin") {
        resolvedFirstName = profileByEmail.first_name || resolvedFirstName;
        resolvedLastName = profileByEmail.last_name || resolvedLastName;
      } else {
        // If ADMIN_USER is a username and not an email, use a DB admin profile as fallback.
        const { data: anyAdminProfile } = await withTimeout(
          supabase
            .from("users")
            .select("first_name, last_name")
            .eq("role", "admin")
            .limit(1)
            .maybeSingle(),
          10000,
          "Timed out while reading fallback admin profile",
        );
        if (anyAdminProfile) {
          resolvedFirstName = anyAdminProfile.first_name || resolvedFirstName;
          resolvedLastName = anyAdminProfile.last_name || resolvedLastName;
        }
      }

      const token = jwt.sign({ role: "admin", username }, adminJwtSecret, {
        expiresIn: "8h",
      });

      return res.status(200).json({
        ok: true,
        message: "Admin login successful",
        token,
        role: "admin",
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
      });
    }

    const normalized = String(username).trim().toLowerCase();
    const loginResult = await withTimeout(
      supabase.auth.signInWithPassword({ email: normalized, password }),
      10000,
      "Timed out while signing in admin",
    );

    if (loginResult.error || !loginResult.data?.user?.id) {
      return errorResponse(res, 401, loginResult.error?.message || "Invalid admin credentials");
    }

    const userId = loginResult.data.user.id;
    const { data: profile, error: profileError } = await withTimeout(
      supabase.from("users").select("*").eq("id", userId).single(),
      10000,
      "Timed out while checking admin profile",
    );

    if (profileError || !profile || profile.role !== "admin") {
      return errorResponse(res, 403, "Account is not authorized as admin");
    }

    const token = jwt.sign({ role: "admin", username: normalized, userId }, adminJwtSecret, {
      expiresIn: "8h",
    });

    return res.status(200).json({
      ok: true,
      message: "Admin login successful",
      token,
      role: "admin",
      firstName: profile.first_name || "Prof.",
      lastName: profile.last_name || "Cabantog",
    });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected admin login error", { error: err.message });
  }
}

async function adminSignup(req, res) {
  return errorResponse(
    res,
    403,
    "Admin account creation is disabled. Admins must be created manually in the database.",
  );
}

async function getMe(req, res) {
  try {
    const user = req.user;
    const userId = user?.id;
    if (!userId) {
      return errorResponse(res, 401, "Authenticated user is required");
    }

    let { data: profile, error } = await withTimeout(
      supabase
        .from("users")
        .select(PROFILE_SELECT_WITH_BIO)
        .eq("id", userId)
        .single(),
      10000,
      "Timed out while fetching profile",
    );

    if (error && isMissingColumnError(error, "bio")) {
      const legacy = await withTimeout(
        supabase
          .from("users")
          .select(PROFILE_SELECT_LEGACY)
          .eq("id", userId)
          .single(),
        10000,
        "Timed out while fetching profile (legacy schema)",
      );
      profile = legacy.data ? { ...legacy.data, bio: "" } : legacy.data;
      error = legacy.error;
    }

    // If the auth user exists but profile row is missing, create a default profile.
    if (error || !profile) {
      const firstName = user?.user_metadata?.first_name || "";
      const lastName = user?.user_metadata?.last_name || "";
      const email = normalizeEmail(user?.email || "");
      const role = user?.user_metadata?.role === "admin" ? "admin" : "student";

      const { error: upsertError } = await withTimeout(
        supabase.from("users").upsert({
          id: userId,
          uid: userId,
          email,
          first_name: firstName,
          last_name: lastName,
          role,
          profile_completed: role === "admin",
          profile_step: role === "admin" ? 3 : 1,
          xp: role === "admin" ? 0 : INITIAL_STUDENT_XP,
          status: "Active",
        }),
        10000,
        "Timed out while creating missing profile",
      );

      if (upsertError) {
        return errorResponse(res, 400, upsertError.message);
      }

      let refetch = await withTimeout(
        supabase
          .from("users")
          .select(PROFILE_SELECT_WITH_BIO)
          .eq("id", userId)
          .single(),
        10000,
        "Timed out while refetching created profile",
      );

      if (refetch.error && isMissingColumnError(refetch.error, "bio")) {
        refetch = await withTimeout(
          supabase
            .from("users")
            .select(PROFILE_SELECT_LEGACY)
            .eq("id", userId)
            .single(),
          10000,
          "Timed out while refetching created profile (legacy schema)",
        );
        if (refetch.data) {
          refetch.data = { ...refetch.data, bio: "" };
        }
      }

      profile = refetch.data;
      error = refetch.error;
    }

    if (error || !profile) {
      return errorResponse(res, 404, "Profile not found");
    }

    return res.status(200).json({
      ok: true,
      message: "Profile retrieved successfully",
      profile,
    });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected error fetching profile", { error: err.message });
  }
}

async function updateMe(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, 401, "Authenticated user is required");
    }

    const { first_name, last_name, student_id, year_level, bio, class_id, class_code, profile_step, profile_completed } = req.body || {};

    const { data: profile, error: fetchError } = await withTimeout(
      supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single(),
      10000,
      "Timed out while checking role",
    );

    if (fetchError || !profile || profile.role !== "student") {
      return errorResponse(res, 403, "Only students can update their profile");
    }

    const updatePayload = {};
    if (first_name !== undefined) updatePayload.first_name = first_name;
    if (last_name !== undefined) updatePayload.last_name = last_name;
    if (student_id !== undefined) updatePayload.student_id = student_id;
    if (year_level !== undefined) updatePayload.year_level = year_level;
    if (bio !== undefined) updatePayload.bio = bio;
    const hasClassId = class_id !== undefined;
    const normalizedClassId = hasClassId
      ? (class_id ? Number(class_id) : null)
      : undefined;

    if (hasClassId) {
      updatePayload.class_id = normalizedClassId;
    }
    if (class_code !== undefined) {
      updatePayload.class_code = class_code;
    }

    // Keep class_code aligned when class_id changes and class_code is not explicitly provided.
    if (hasClassId && class_code === undefined) {
      if (!normalizedClassId) {
        updatePayload.class_code = null;
      } else {
        const { data: classRow, error: classFetchError } = await withTimeout(
          supabase
            .from("classes")
            .select("code")
            .eq("id", normalizedClassId)
            .maybeSingle(),
          10000,
          "Timed out while resolving class code",
        );
        if (classFetchError) {
          return errorResponse(res, 400, classFetchError.message);
        }
        updatePayload.class_code = classRow?.code || null;
      }
    }
    if (profile_step !== undefined) updatePayload.profile_step = profile_step;
    if (profile_completed !== undefined) updatePayload.profile_completed = profile_completed;
    updatePayload.updated_at = new Date().toISOString();

    let { error: updateError } = await withTimeout(
      supabase.from("users").update(updatePayload).eq("id", userId),
      10000,
      "Timed out while updating profile",
    );

    if (updateError && bio !== undefined && isMissingColumnError(updateError, "bio")) {
      delete updatePayload.bio;
      const retry = await withTimeout(
        supabase.from("users").update(updatePayload).eq("id", userId),
        10000,
        "Timed out while updating profile (legacy schema)",
      );
      updateError = retry.error;
    }

    if (updateError) {
      return errorResponse(res, 400, updateError.message);
    }

    return res.status(200).json({
      ok: true,
      message: "Profile updated successfully",
    });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected error updating profile", { error: err.message });
  }
}

module.exports = { login, signup, adminLogin, adminSignup, getMe, updateMe };
