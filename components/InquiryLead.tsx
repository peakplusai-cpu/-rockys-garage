"use client";

import { useEffect, useMemo, useState } from "react";
import { ContactButtons } from "@/components/ContactButtons";
import { InquiryPicker } from "@/components/InquiryPicker";
import type { Car, Staff } from "@/lib/types";

export function InquiryLead({
  staff,
  cars,
  lineUrl,
  instagramUrl,
}: {
  staff: Staff[];
  cars: Car[];
  lineUrl: string;
  instagramUrl: string;
}) {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    setSlug(new URLSearchParams(window.location.search).get("car"));
  }, []);

  const car = useMemo(() => (slug ? cars.find((item) => item.slug === slug) : undefined), [cars, slug]);
  const carLabel = car ? `${car.make} ${car.model}` : "";

  return (
    <>
      <p className="inquiry-lead">
        {car
          ? `您正在詢問 ${car.make} ${car.year} ${car.model}。請由 LINE 或 Instagram 與我們聯繫，或選擇顧問開啟聊天室。`
          : "告訴我們想看的車款與方便時段。LINE、Instagram 皆可。"}
      </p>
      <ContactButtons lineUrl={lineUrl} instagramUrl={instagramUrl} />
      {staff.length ? (
        <div style={{ marginTop: 48 }}>
          <p className="engraved">或指定顧問</p>
          <InquiryPicker staff={staff} carLabel={carLabel} />
        </div>
      ) : null}
    </>
  );
}
