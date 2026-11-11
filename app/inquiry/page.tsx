import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { InquiryLead } from "@/components/InquiryLead";
import { getSettings } from "@/lib/settings";
import { listPublishedCars, listPublicStaff } from "@/lib/store";

export const revalidate = 60;

export default async function InquiryPage() {
  const [staff, settings, cars] = await Promise.all([
    listPublicStaff(),
    getSettings(),
    listPublishedCars(),
  ]);

  return (
    <>
      <Header />
      <main className="inquiry">
        <p className="engraved">Appointment</p>
        <h1>預約賞車</h1>
        <InquiryLead
          staff={staff}
          cars={cars}
          lineUrl={settings.lineUrl}
          instagramUrl={settings.instagramUrl}
        />
      </main>
      <Footer staff={staff} settings={settings} />
    </>
  );
}
