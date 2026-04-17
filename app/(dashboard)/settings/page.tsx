import { getSession } from "@/lib/auth/session";
import { getPreferences } from "@/lib/storage/fileStore";
import SettingsClient from "@/components/settings/SettingsClient";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user  = await getSession();
  const prefs = await getPreferences(user!.id).catch(() => null);

  return (
    <SettingsClient
      user={{ name: user!.name, email: user!.email }}
      prefs={prefs ? {
        gender:          prefs.gender,
        skinTone:        prefs.skinTone,
        city:            prefs.city,
        preferredStyles: prefs.preferredStyles,
      } : null}
    />
  );
}
