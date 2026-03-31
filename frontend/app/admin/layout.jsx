import AdminRouteGuard from "@/components/AdminRouteGuard";

export default function AdminLayout({ children }) {
  return <AdminRouteGuard>{children}</AdminRouteGuard>;
}
