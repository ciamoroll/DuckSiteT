import LegacyPageFrame from "@/components/LegacyPageFrame";
import { notFound } from "next/navigation";

const routeMap = {
  login: "Login.html",
  signup: "signup.html",
  dashboard: "dashboard.html",
  courses: "courses.html",
  lessons: "lessons.html",
  "lesson-view": "lesson-view.html",
  leaderboard: "leaderboard.html",
  profile: "profile.html",
  "profile-step1": "profile-step1.html",
  "profile-step2": "profile-step2.html",
  "profile-step3": "profile-step3.html",
  "electronics-lessons": "electronics-lessons.html",
  "admin/dashboard": "admin-dashboard.html",
  "admin/users": "admin-users.html",
  "admin/classes": "create-class.html",
  "admin/courses": "admin-courses.html",
  "admin/materials": "admin-materials.html",
  "admin/challenges": "admin-challenges.html",
  "admin/progress": "admin-progress.html",
};

export default async function CatchAllPage({ params }) {
  const p = await params;
  const key = (p.slug || []).join("/");
  if (!key || !routeMap[key]) {
    notFound();
  }

  return <LegacyPageFrame legacyFile={routeMap[key]} />;
}
