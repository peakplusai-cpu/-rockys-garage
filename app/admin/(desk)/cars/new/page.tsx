import { createCar } from "@/app/actions/cars";
import { CarForm } from "@/components/CarForm";
import { requireDeskAuth } from "@/lib/auth";

export default async function NewCarPage() {
  await requireDeskAuth();
  return (
    <>
      <p className="engraved">New</p>
      <h1>新增車輛</h1>
      <CarForm action={createCar} />
    </>
  );
}
