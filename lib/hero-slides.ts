/** Homepage hero carousel — swap images here (files under public/hero/). */

export type HeroSlide = {
  id: string;
  src: string;
  alt: string;
  label: string;
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "gr86",
    src: "/hero/toyota-gr86.webp",
    alt: "Toyota GR86",
    label: "Toyota GR86",
  },
  {
    id: "911",
    src: "/hero/porsche-911.webp",
    alt: "Porsche 911",
    label: "Porsche 911",
  },
  {
    id: "718",
    src: "/hero/porsche-718.webp",
    alt: "Porsche 718 Cayman",
    label: "Porsche 718",
  },
];

/** Autoplay interval (ms). */
export const HERO_CAROUSEL_MS = 5500;
