export type CarStatus = "available" | "reserved" | "sold";

export type BodyType = "sedan" | "suv" | "hatchback" | "coupe" | "wagon" | "mpv" | "sports";

export type Photo = {
  id: string;
  url: string;
  alt: string;
};

export type SpecRow = {
  label: string;
  value: string;
};

export type Car = {
  id: string;
  slug: string;
  make: string;
  makeEn: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  color: string;
  interior: string;
  engine: string;
  displacement: string;
  horsepower: number;
  transmission: string;
  drivetrain: string;
  doors: 2 | 4 | 5;
  bodyType: BodyType;
  options: string[];
  specs: SpecRow[];
  equipment: string[];
  story: string;
  status: CarStatus;
  published: boolean;
  featured: boolean;
  photos: Photo[];
  createdAt: string;
  updatedAt: string;
};

export type Staff = {
  id: string;
  displayName: string;
  role: string;
  lineUrl: string;
  lineId: string;
  note: string;
  lineUserId: string;
  sortOrder: number;
  createdAt: string;
};

export type Session = {
  id: string;
  createdAt: string;
  expiresAt: string;
};

export type Admin = {
  passwordHash: string;
  createdAt: string;
};

export type Store = {
  admin: Admin | null;
  staff: Staff[];
  cars: Car[];
  sessions: Session[];
};
