import { getSession } from "@/lib/auth/session";
import { getOutfits } from "@/lib/storage/fileStore";
import OutfitsClient from "@/components/outfits/OutfitsClient";

export const metadata = { title: "Outfits" };

export default async function OutfitsPage() {
  const user    = await getSession();
  const outfits = await getOutfits(user!.id);
  outfits.sort((a, b) => b.score - a.score || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return <OutfitsClient initialOutfits={outfits} />;
}
