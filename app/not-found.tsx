import Link from "next/link";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="inquiry">
        <p className="engraved">404</p>
        <h1>此車未公開</h1>
        <p className="inquiry-lead">頁面不存在，或車輛已下架。</p>
        <Link className="btn" href="/">
          回到庫存
        </Link>
      </main>
    </>
  );
}
