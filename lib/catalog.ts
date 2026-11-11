import type { BodyType, Car } from "./types";

export type DoorCount = Car["doors"];
export type DoorFilter = DoorCount | 0;

export const DOOR_OPTIONS: { value: DoorCount; label: string; code: string }[] = [
  { value: 2, label: "雙門", code: "02" },
  { value: 4, label: "四門", code: "04" },
  { value: 5, label: "五門", code: "05" },
];

export const BODY_TYPES: { id: BodyType; label: string }[] = [
  { id: "sedan", label: "轎車" },
  { id: "suv", label: "休旅" },
  { id: "hatchback", label: "掀背" },
  { id: "coupe", label: "雙門跑車" },
  { id: "wagon", label: "旅行車" },
  { id: "mpv", label: "廂型" },
  { id: "sports", label: "跑車" },
];

export type BrandOption = {
  id: string;
  label: string;
  aliases: string[];
};

export const HOUSE_BRANDS: BrandOption[] = [
  { id: "toyota", label: "Toyota", aliases: ["toyota", "豐田"] },
  { id: "honda", label: "Honda", aliases: ["honda", "本田"] },
  { id: "mazda", label: "Mazda", aliases: ["mazda", "馬自達"] },
  { id: "bmw", label: "BMW", aliases: ["bmw", "寶馬"] },
  { id: "mercedes", label: "賓士", aliases: ["mercedes", "benz", "賓士", "amg"] },
  { id: "audi", label: "Audi", aliases: ["audi", "奧迪"] },
  { id: "lexus", label: "Lexus", aliases: ["lexus", "凌志"] },
  { id: "volkswagen", label: "Volkswagen", aliases: ["volkswagen", "vw", "福斯"] },
  { id: "tesla", label: "Tesla", aliases: ["tesla", "特斯拉"] },
  { id: "porsche", label: "Porsche", aliases: ["porsche", "保時捷"] },
];

export const PRICE_RANGES = [
  { id: "any", label: "不限價格", min: 0, max: Number.POSITIVE_INFINITY },
  { id: "u50", label: "50 萬內", min: 0, max: 500_000 },
  { id: "50-100", label: "50–100 萬", min: 500_000, max: 1_000_000 },
  { id: "100-200", label: "100–200 萬", min: 1_000_000, max: 2_000_000 },
  { id: "200p", label: "200 萬以上", min: 2_000_000, max: Number.POSITIVE_INFINITY },
] as const;

export const YEAR_RANGES = [
  { id: "any", label: "不限年份", min: 0, max: Number.POSITIVE_INFINITY },
  { id: "u2018", label: "2018 以前", min: 0, max: 2018 },
  { id: "2018-2020", label: "2018–2020", min: 2018, max: 2021 },
  { id: "2021-2023", label: "2021–2023", min: 2021, max: 2024 },
  { id: "2024p", label: "2024 以後", min: 2024, max: Number.POSITIVE_INFINITY },
] as const;

export function bodyLabel(type: BodyType | string): string {
  return BODY_TYPES.find((item) => item.id === type)?.label ?? type;
}

export function parseBodyType(value: unknown): BodyType {
  const raw = String(value ?? "");
  if (BODY_TYPES.some((item) => item.id === raw)) return raw as BodyType;
  return "sedan";
}

export function carMatchesBrand(car: Car, brand: BrandOption): boolean {
  const hay = `${car.make} ${car.makeEn}`.toLowerCase();
  return brand.aliases.some((alias) => hay.includes(alias.toLowerCase()));
}

export function brandOptions(cars: Car[]): BrandOption[] {
  const present = HOUSE_BRANDS.filter((brand) => cars.some((car) => carMatchesBrand(car, brand)));
  const extras: BrandOption[] = [];
  for (const car of cars) {
    if (HOUSE_BRANDS.some((brand) => carMatchesBrand(car, brand))) continue;
    const label = car.make.trim();
    if (!label || extras.some((item) => item.label === label)) continue;
    extras.push({ id: `x-${label}`, label, aliases: [label] });
  }
  return [...present, ...extras];
}

export function filterCars(
  cars: Car[],
  brandId: string,
  bodyType: string,
  priceId: string,
  yearId: string,
  doors: DoorFilter = 0
): Car[] {
  const brands = brandOptions(cars);
  const brand = brandId ? brands.find((item) => item.id === brandId) : undefined;
  const range = PRICE_RANGES.find((item) => item.id === priceId) ?? PRICE_RANGES[0];
  const years = YEAR_RANGES.find((item) => item.id === yearId) ?? YEAR_RANGES[0];
  return cars.filter((car) => {
    if (brand && !carMatchesBrand(car, brand)) return false;
    if (bodyType && car.bodyType !== bodyType) return false;
    if (doors && car.doors !== doors) return false;
    if (car.price < range.min || car.price >= range.max) return false;
    if (car.year < years.min || car.year >= years.max) return false;
    return true;
  });
}

export function parseDoors(value: unknown): DoorCount {
  const n = Number(value);
  if (n === 2 || n === 5) return n;
  return 4;
}

export function doorLabel(doors: number): string {
  if (doors === 2) return "雙門";
  if (doors === 5) return "五門";
  return "四門";
}

export function parseSpecs(raw: string): Car["specs"] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(/[|：:]/);
      return { label: label.trim(), value: rest.join(":").trim() };
    })
    .filter((row) => row.label);
}

export function specsToText(specs: Car["specs"]): string {
  return specs.map((row) => `${row.label}｜${row.value}`).join("\n");
}
