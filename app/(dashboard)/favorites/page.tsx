import { getSession } from "@/lib/auth/session";
import { getWardrobe } from "@/lib/storage/fileStore";
import WardrobeClient from "@/components/wardrobe/WardrobeClient";

export const metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const user  = await getSession();
  const items = (await getWardrobe(user!.id)).filter((i) => i.isFavorite);
  return <WardrobeClient initialItems={items as never} />;
}
