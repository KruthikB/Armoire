import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { getPreferences } from "@/lib/storage/fileStore";
import DashboardShell from "@/components/layout/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const pathname = headers().get("x-pathname") ?? "";
  const prefs    = await getPreferences(user.id).catch(() => null);
  if (prefs !== null && !prefs.onboardingCompleted && !pathname.startsWith("/onboarding")) {
    redirect("/onboarding");
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
