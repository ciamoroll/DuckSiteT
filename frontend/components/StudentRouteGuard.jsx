"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRole } from "@/lib/auth";

export default function StudentRouteGuard({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isAllowed = ready && getRole() === "student";

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
        <div className="panel">Checking student session...</div>
      </main>
    );
  }

  return children;
}
