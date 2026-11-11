import Link from "next/link";
import { requireDeskAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { listAdminCars, listAdminStaff } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await requireDeskAuth();
  const [cars, staff] = await Promise.all([listAdminCars(), listAdminStaff()]);
  const published = cars.filter((car) => car.published).length;
  const hidden = cars.length - published;

  return (
    <>
      <p className="engraved">Desk</p>
      <h1>總覽</h1>
      <p className="mute" style={{ marginBottom: 48, maxWidth: 420, lineHeight: 1.7 }}>
        {cars.length} 輛在庫，{published} 輛上架，{hidden} 輛未公開。{staff.length}{" "}
        位顧問。LINE / Instagram 請到「聯絡設定」。
      </p>
      <div className="row-actions" style={{ marginBottom: 48 }}>
        <Link className="btn" href="/admin/cars/new">
          新增車輛
        </Link>
        <Link className="btn btn-ghost" href="/admin/staff">
          管理 LINE
        </Link>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>車款</th>
            <th>標價</th>
            <th>公開</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cars.map((car) => (
            <tr key={car.id}>
              <td>
                {car.make} {car.model}
              </td>
              <td>{formatPrice(car.price)}</td>
              <td>{car.published ? "上架" : "下架"}</td>
              <td>
                <Link href={`/admin/cars/${car.id}`} className="link-line">
                  編輯
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
