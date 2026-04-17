import { getSession } from "@/lib/auth/session";
import { getWardrobe } from "@/lib/storage/fileStore";
import WardrobeClient from "@/components/wardrobe/WardrobeClient";

export const metadata = { title: "Wardrobe" };

export default async function WardrobePage() {
  const user  = await getSession();
  const items = await getWardrobe(user!.id);
  return <WardrobeClient initialItems={items as never} />;
}
