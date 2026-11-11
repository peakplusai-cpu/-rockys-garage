// Builds public/intro/logos.webp (sprite sheet) and lib/intro-logos.ts (slug order)
// from github.com/filippofilip95/car-logos-dataset.
// Run with: npm i --no-save sharp && node scripts/build-logo-atlas.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = "https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos";
const CELL = 80;
const COLS = 13;

const SLUGS = `
toyota honda nissan mazda subaru suzuki mitsubishi lexus infiniti acura daihatsu isuzu
bmw mercedes-benz audi volkswagen porsche opel mini smart alpina brabus mercedes-amg bmw-m
ford chevrolet jeep ram cadillac buick gmc lincoln tesla pontiac oldsmobile plymouth mercury saturn
ferrari lamborghini maserati alfa-romeo fiat abarth lancia pagani de-tomaso
rolls-royce bentley aston-martin jaguar land-rover mclaren lotus mg morgan caterham tvr ariel vauxhall triumph rover
bugatti renault peugeot citroen ds dacia alpine
volvo saab polestar koenigsegg spyker
skoda seat cupra lada
hyundai kia genesis ssangyong daewoo
byd geely chery great-wall haval nio xpeng li-auto zeekr lynk-and-co hongqi gac-group saic-motor wuling baojun roewe changan dongfeng faw jac leapmotor omoda exeed jetour wey vinfast proton perodua tata mahindra
rivian fisker faraday-future karma
saleen ssc rimac zenvo ruf gumpert carlsson noble
zotye lifan brilliance haima venucia aiways weltmeister arcfox bestune foton baic-motor
datsun hispano-suiza duesenberg packard studebaker tucker delage
chevrolet-corvette dodge-viper ford-mustang nissan-gt-r nissan-nismo audi-sport
bristol jensen ginetta lister marcos westfield donkervoort
`
  .split(/\s+/)
  .filter(Boolean);

const unique = [...new Set(SLUGS)].slice(0, 150);
if (unique.length < 150) throw new Error(`Only ${unique.length} logos selected`);

async function fetchLogo(slug) {
  const res = await fetch(`${RAW}/optimized/${slug}.png`);
  if (!res.ok) throw new Error(`${slug}: ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const trimmed = await sharp(input).trim({ threshold: 8 }).toBuffer();
  return sharp(trimmed)
    .resize(CELL - 8, CELL - 8, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

const tiles = [];
for (const slug of unique) {
  tiles.push(await fetchLogo(slug));
}

const rows = Math.ceil(tiles.length / COLS);
const centered = [];
for (let i = 0; i < tiles.length; i++) {
  const meta = await sharp(tiles[i]).metadata();
  centered.push({
    input: tiles[i],
    left: (i % COLS) * CELL + Math.round((CELL - (meta.width ?? CELL)) / 2),
    top: Math.floor(i / COLS) * CELL + Math.round((CELL - (meta.height ?? CELL)) / 2),
  });
}

await mkdir(join(root, "public", "intro"), { recursive: true });
await sharp({
  create: {
    width: COLS * CELL,
    height: rows * CELL,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(centered)
  .webp({ quality: 82, alphaQuality: 90 })
  .toFile(join(root, "public", "intro", "logos.webp"));

await writeFile(
  join(root, "lib", "intro-logos.ts"),
  `export const LOGO_CELL = ${CELL};\nexport const LOGO_COLS = ${COLS};\nexport const LOGO_COUNT = ${unique.length};\nexport const LOGO_SLUGS = ${JSON.stringify(unique)} as const;\n`
);

console.log(`Wrote ${unique.length} logos (${COLS}x${rows} @ ${CELL}px)`);
