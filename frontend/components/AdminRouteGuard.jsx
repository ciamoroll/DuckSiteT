"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken, getRole } from "@/lib/auth";

export default function AdminRouteGuard({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isAllowed = ready && getRole() === "admin" && Boolean(getAdminToken());

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setReady(true);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    if (ready && !isAllowed) {
      router.replace("/login");
    }
  }, [ready, isAllowed, router]);

  if (!ready || !isAllowed) {
    return (
      <main className="page-wrap">
        <div className="panel">Checking admin session...</div>
      </main>
    );
  }

  return children;
}
