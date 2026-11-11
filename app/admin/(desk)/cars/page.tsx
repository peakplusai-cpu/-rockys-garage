import Link from "next/link";
import { togglePublish } from "@/app/actions/cars";
import { adminErrorMessage, attempt } from "@/lib/admin-errors";
import { requireDeskAuth } from "@/lib/auth";
import { doorLabel } from "@/lib/catalog";
import { formatPrice, statusLabel } from "@/lib/format";
import { listAdminCars } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminCarsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireDeskAuth();
  const { saved, error: actionError } = await searchParams;
  const { data: cars, error: readError } = await attempt(() => listAdminCars(), []);

  return (
    <>
      <p className="engraved">Inventory</p>
      <h1>庫存</h1>
      {saved ? <p className="flash">已儲存（資料庫已確認寫入）。</p> : null}
      {actionError ? <p className="flash" role="alert">{adminErrorMessage(actionError)}</p> : null}
      {readError ? (
        <p className="flash" role="alert">
          讀不到庫存，下方清單不代表資料庫是空的。{adminErrorMessage(readError.code, readError.detail)}
        </p>
      ) : null}
      <div className="row-actions" style={{ marginBottom: 32 }}>
        <Link className="btn" href="/admin/cars/new">
          新增車輛
        </Link>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>年份</th>
            <th>車款</th>
            <th>車門</th>
            <th>標價</th>
            <th>狀態</th>
            <th>公開</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cars.map((car) => (
            <tr key={car.id}>
              <td>{car.year}</td>
              <td>
                {car.make} {car.model}
              </td>
              <td>{doorLabel(car.doors)}</td>
              <td>{formatPrice(car.price)}</td>
              <td>{statusLabel(car.status)}</td>
              <td>
                <form action={togglePublish}>
                  <input type="hidden" name="id" value={car.id} />
                  <input type="hidden" name="next" value={car.published ? "0" : "1"} />
                  <button className="btn btn-ghost" type="submit">
                    {car.published ? "下架" : "上架"}
                  </button>
                </form>
              </td>
              <td>
                <Link href={`/admin/cars/${car.id}`}>編輯</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
