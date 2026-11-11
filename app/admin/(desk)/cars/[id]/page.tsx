import { notFound } from "next/navigation";
import { deleteCar, updateCar } from "@/app/actions/cars";
import { CarForm } from "@/components/CarForm";
import { requireDeskAuth } from "@/lib/auth";
import { getAdminCar } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EditCarPage({ params }: { params: Promise<{ id: string }> }) {
  await requireDeskAuth();
  const { id } = await params;
  const car = await getAdminCar(id);
  if (!car) notFound();

  return (
    <>
      <p className="engraved">Edit</p>
      <h1>
        {car.make} {car.model}
      </h1>
      <CarForm car={car} action={updateCar} />
      <form action={deleteCar} style={{ marginTop: 40 }}>
        <input type="hidden" name="id" value={car.id} />
        <button className="btn btn-rosso" type="submit">
          刪除車輛
        </button>
      </form>
    </>
  );
}
