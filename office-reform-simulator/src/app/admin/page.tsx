import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "管理者用集計画面 | オフィス改革シミュレーター",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
