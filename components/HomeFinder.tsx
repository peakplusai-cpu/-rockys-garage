"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RockyHero } from "@/components/RockyHero";
import { RockyMarquee } from "@/components/RockyMarquee";
import { SocialEmbed } from "@/components/SocialEmbed";
import {
  BODY_TYPES,
  DOOR_OPTIONS,
  YEAR_RANGES,
  brandOptions,
  bodyLabel,
  filterCars,
  PRICE_RANGES,
  type DoorFilter,
} from "@/lib/catalog";
import { formatMileage, formatPrice, padIndex, statusLabel } from "@/lib/format";
import type { Car } from "@/lib/types";
import { parseFeaturedVideo } from "@/lib/video";

export function HomeFinder({
  cars,
  lineUrl,
  instagramUrl,
  featuredVideoUrl = "",
  featuredVideoCaption = "",
  featuredVideos,
}: {
  cars: Car[];
  lineUrl: string;
  instagramUrl: string;
  featuredVideoUrl?: string;
  featuredVideoCaption?: string;
  featuredVideos?: { url: string; caption: string }[];
}) {
  const slots = featuredVideos?.length
    ? featuredVideos
    : [{ url: featuredVideoUrl, caption: featuredVideoCaption }];
  const featuredVideosReady = slots
    .map((slot) => parseFeaturedVideo(slot.url, slot.caption))
    .filter((video): video is NonNullable<typeof video> => Boolean(video));
  const [brand, setBrand] = useState("");
  const [body, setBody] = useState("");
  const [doors, setDoors] = useState<DoorFilter>(0);
  const [price, setPrice] = useState<(typeof PRICE_RANGES)[number]["id"]>("any");
  const [year, setYear] = useState<(typeof YEAR_RANGES)[number]["id"]>("any");
  const brands = useMemo(() => brandOptions(cars), [cars]);
  const matches = useMemo(
    () => filterCars(cars, brand, body, price, year, doors),
    [cars, brand, body, price, year, doors]
  );

  return (
    <>
      <RockyHero lineUrl={lineUrl} instagramUrl={instagramUrl} />
      <RockyMarquee />

      <section className="filter-bar" id="inventory">
        <p className="engraved">Inventory Grid</p>
        <h2>在庫車輛</h2>
        <div className="filter-row">
          <span>廠牌</span>
          <button type="button" data-on={brand === ""} onClick={() => setBrand("")}>
            全部
          </button>
          {brands.map((item) => (
            <button
              key={item.id}
              type="button"
              data-on={brand === item.id}
              onClick={() => setBrand(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <span>車型</span>
          <button type="button" data-on={body === ""} onClick={() => setBody("")}>
            全部
          </button>
          {BODY_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              data-on={body === item.id}
              onClick={() => setBody(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <span>車門</span>
          <button type="button" data-on={doors === 0} onClick={() => setDoors(0)}>
            全部
          </button>
          {DOOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              data-on={doors === option.value}
              onClick={() => setDoors(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <span>價格</span>
          {PRICE_RANGES.map((range) => (
            <button
              key={range.id}
              type="button"
              data-on={price === range.id}
              onClick={() => setPrice(range.id)}
            >
              {range.label}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <span>年份</span>
          {YEAR_RANGES.map((range) => (
            <button
              key={range.id}
              type="button"
              data-on={year === range.id}
              onClick={() => setYear(range.id)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="engraved">符合條件</p>
            <h2>{padIndex(matches.length)} 輛</h2>
          </div>
        </div>
        {matches.length ? (
          <ul className="grid">
            {matches.map((car) => (
              <li className="card" key={car.id}>
                <Link href={`/cars/${car.slug}`}>
                  <div className="card-media">
                    {car.photos[0] ? (
                      <img src={car.photos[0].url} alt={`${car.make} ${car.model}`} />
                    ) : null}
                  </div>
                  <div className="card-meta">
                    <p className="card-sub">
                      {car.year} · {bodyLabel(car.bodyType)} · {statusLabel(car.status)}
                    </p>
                    <h3 className="card-title">
                      {car.make} {car.model}
                    </h3>
                    <p className="card-sub">
                      {formatMileage(car.mileage)} · {car.displacement || car.engine} · {car.transmission}
                    </p>
                    <p className="card-price">{formatPrice(car.price)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-line">
            {cars.length ? "此條件目前沒有車輛，請放寬廠牌、車型、車門、價格或年份。" : "尚無上架車輛。"}
          </p>
        )}
      </section>

      {featuredVideosReady.length ? (
        <section className="reel-section" id="reels">
          <p className="engraved">Featured Reel</p>
          <h2>精選影片</h2>
          <div className="reel-row">
            {featuredVideosReady.map((video, index) => (
              <SocialEmbed key={`${video.url}-${index}`} video={video} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
