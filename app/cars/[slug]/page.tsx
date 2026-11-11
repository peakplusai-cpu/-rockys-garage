import { notFound } from "next/navigation";
import { ContactButtons } from "@/components/ContactButtons";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { bodyLabel, doorLabel } from "@/lib/catalog";
import { formatMileage, formatPrice, statusLabel } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { getPublishedCar, listPublicStaff } from "@/lib/store";

export const revalidate = 60;
export const dynamicParams = true;

export function generateStaticParams() {
  return [] as { slug: string }[];
}

export default async function CarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [car, staff, settings] = await Promise.all([
    getPublishedCar(slug),
    listPublicStaff(),
    getSettings(),
  ]);
  if (!car) notFound();
  const cover = car.photos[0];
  const rest = car.photos.slice(1);
  const equipment = car.equipment.length ? car.equipment : car.options;

  return (
    <>
      <Header />
      <section className="detail-hero">
        {cover ? <img src={cover.url} alt={cover.alt || `${car.make} ${car.model}`} /> : null}
        <div className="detail-shade" />
        <div className="detail-title">
          <p className="engraved">
            {statusLabel(car.status)} · {bodyLabel(car.bodyType)}
          </p>
          <h1>
            {car.make} {car.model}
          </h1>
          <p>
            {car.year} · {formatMileage(car.mileage)}
          </p>
        </div>
      </section>

      <div className="price-band">
        <div>
          <p className="engraved">標價</p>
          <strong>{formatPrice(car.price)}</strong>
        </div>
        <ContactButtons lineUrl={settings.lineUrl} instagramUrl={settings.instagramUrl} />
      </div>

      <section className="sheet">
        <p className="story">{car.story}</p>
        <dl className="facts">
          <div>
            <dt>廠牌</dt>
            <dd>{car.make}</dd>
          </div>
          <div>
            <dt>車型</dt>
            <dd>{car.model}</dd>
          </div>
          <div>
            <dt>年份</dt>
            <dd>{car.year}</dd>
          </div>
          <div>
            <dt>里程</dt>
            <dd>{formatMileage(car.mileage)}</dd>
          </div>
          <div>
            <dt>排氣量</dt>
            <dd>{car.displacement || car.engine}</dd>
          </div>
          <div>
            <dt>變速箱</dt>
            <dd>{car.transmission}</dd>
          </div>
          <div>
            <dt>外色</dt>
            <dd>{car.color}</dd>
          </div>
          <div>
            <dt>車門</dt>
            <dd>{doorLabel(car.doors)}</dd>
          </div>
        </dl>
      </section>

      {car.specs.length ? (
        <section className="options">
          <h2>大小規格</h2>
          <dl className="spec-table">
            {car.specs.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {equipment.length ? (
        <section className="options">
          <h2>配備</h2>
          <ul>
            {equipment.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {car.photos.length > 1 ? (
        <section className="gallery">
          <img className="gallery-main" src={(rest[0] ?? cover)?.url} alt={(rest[0] ?? cover)?.alt} />
          <div className="gallery-stack">
            {(rest[1] ? [rest[1], cover] : car.photos.slice(0, 2)).map((photo) =>
              photo ? <img key={photo.id} src={photo.url} alt={photo.alt} /> : null
            )}
          </div>
        </section>
      ) : null}

      <div className="cta-block">
        <div>
          <p className="engraved">預約賞車</p>
          <h2>LINE / Instagram</h2>
        </div>
        <ContactButtons lineUrl={settings.lineUrl} instagramUrl={settings.instagramUrl} inverted />
      </div>
      <Footer staff={staff} settings={settings} />
    </>
  );
}
