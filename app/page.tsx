import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HomeFinder } from "@/components/HomeFinder";
import { getSettings } from "@/lib/settings";
import { listPublishedCars, listPublicStaff } from "@/lib/store";

export const revalidate = 60;

export default async function HomePage() {
  const [published, staff, settings] = await Promise.all([
    listPublishedCars(),
    listPublicStaff(),
    getSettings(),
  ]);

  return (
    <>
      <Header />
      <HomeFinder
        cars={published}
        lineUrl={settings.lineUrl}
        instagramUrl={settings.instagramUrl}
        featuredVideos={settings.featuredVideos}
      />
      <Footer staff={staff} settings={settings} />
    </>
  );
}
