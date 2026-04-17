import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPreferences } from "@/lib/storage/fileStore";
import OnboardingClient from "./OnboardingClient";

export const metadata = { title: "Set Up Your Profile" };

export default async function OnboardingPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const prefs = await getPreferences(user.id);
  if (prefs?.onboardingCompleted) redirect("/wardrobe");

  return <OnboardingClient userName={user.name} />;
}
