"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRouteGuard({ children }) {
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("role");
    const token = localStorage.getItem("adminToken");
    if (role !== "admin" || !token) {
      router.replace("/login");
    }
  }, [router]);

  return children;
}
