const { supabase } = require("../services/supabaseService");
const { errorResponse } = require("../utils/response");
const jwt = require("jsonwebtoken");
const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character.";

function isStrongPassword(value) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(String(value || ""));
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
    if (!isStrongPassword(password)) {
      return errorResponse(res, 400, PASSWORD_POLICY_MESSAGE);
    }

    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({
        email,
        password,
      }),
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
    if (!isStrongPassword(password)) {
      return errorResponse(res, 400, PASSWORD_POLICY_MESSAGE);
    }

    const normalizedEmail = String(email).trim().toLowerCase();
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
    const { error: profileError } = await withTimeout(
      supabase.from("users").upsert({
        id: user.id,
        uid: user.id,
        first_name: firstName,
        last_name: lastName,
        email: normalizedEmail,
        role: "student",
        profile_completed: false,
        profile_step: 1,
        xp: 0,
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
    if (!isStrongPassword(password)) {
      return errorResponse(res, 400, PASSWORD_POLICY_MESSAGE);
    }

    const adminUser = process.env.ADMIN_USER || "admin";
    const adminPass = process.env.ADMIN_PASS || "Admin@123";

    // Legacy static admin credential path.
    if (username === adminUser && password === adminPass) {
      const token = jwt.sign(
        { role: "admin", username },
        process.env.ADMIN_JWT_SECRET || "ducksite-admin-secret",
        { expiresIn: "8h" },
      );

      return res.status(200).json({
        ok: true,
        message: "Admin login successful",
        token,
        role: "admin",
        firstName: "Prof.",
        lastName: "Cabantog",
      });
    }

    // Admin account path (email + password) backed by Supabase users table.
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

    const token = jwt.sign(
      { role: "admin", username: normalized, userId },
      process.env.ADMIN_JWT_SECRET || "ducksite-admin-secret",
      { expiresIn: "8h" },
    );

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
  try {
    const { firstName, lastName, email, password, setupKey } = req.body || {};
    if (!firstName || !lastName || !email || !password || !setupKey) {
      return errorResponse(
        res,
        400,
        "firstName, lastName, email, password, and setupKey are required",
      );
    }
    if (!isStrongPassword(password)) {
      return errorResponse(res, 400, PASSWORD_POLICY_MESSAGE);
    }

    const expectedKey = process.env.ADMIN_SETUP_KEY || "ducksite-admin-setup";
    if (setupKey !== expectedKey) {
      return errorResponse(res, 403, "Invalid admin setup key");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const { data, error } = await withTimeout(
      supabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: "admin",
        },
      }),
      10000,
      "Timed out while creating admin account",
    );
    if (error || !data?.user?.id) {
      return errorResponse(res, 400, error?.message || "Failed to create admin account");
    }

    const user = data.user;
    const { error: profileError } = await withTimeout(
      supabase.from("users").upsert({
        id: user.id,
        uid: user.id,
        first_name: firstName,
        last_name: lastName,
        email: normalizedEmail,
        role: "admin",
        profile_completed: true,
        profile_step: 3,
        status: "Active",
      }),
      10000,
      "Timed out while writing admin profile",
    );
    if (profileError) {
      return errorResponse(res, 400, profileError.message);
    }

    return res.status(201).json({
      ok: true,
      message: "Admin account created successfully",
      user: { id: user.id, email: normalizedEmail, role: "admin" },
    });
  } catch (err) {
    return errorResponse(res, 500, "Unexpected admin signup error", { error: err.message });
  }
}

module.exports = { login, signup, adminLogin, adminSignup };
