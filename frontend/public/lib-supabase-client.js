import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const APP_CONFIG = window.APP_CONFIG || {};
const SUPABASE_URL =
  APP_CONFIG.SUPABASE_URL ||
  window.SUPABASE_URL ||
  "https://iqjrxtujmildocvetsey.supabase.co";
const SUPABASE_ANON_KEY =
  APP_CONFIG.SUPABASE_ANON_KEY ||
  window.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxanJ4dHVqbWlsZG9jdmV0c2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjkxMjQsImV4cCI6MjA5MDU0NTEyNH0.aEzipMy8vuhul0QPjweD1_I6SIhgKWpsihXMT8nUOrY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user || null;
}
