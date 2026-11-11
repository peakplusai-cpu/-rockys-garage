"use client";

import { useState } from "react";
import { BODY_TYPES, DOOR_OPTIONS, specsToText } from "@/lib/catalog";
import type { Car } from "@/lib/types";

export function CarForm({
  car,
  action,
}: {
  car?: Car;
  action: (formData: FormData) => Promise<void>;
}) {
  const [photoUrls, setPhotoUrls] = useState(
    car?.photos.map((photo) => photo.url).join("\n") ?? ""
  );
  const [uploading, setUploading] = useState(false);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const next: string[] = [];
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      if (res.ok) {
        const data = (await res.json()) as { url: string };
        next.push(data.url);
      }
    }
    setPhotoUrls((prev) => [prev, ...next].filter(Boolean).join("\n"));
    setUploading(false);
  }

  return (
    <form action={action}>
      {car ? <input type="hidden" name="id" value={car.id} /> : null}
      <div className="form-grid">
        <div className="field">
          <label htmlFor="make">廠牌（必填）</label>
          <input id="make" name="make" required autoComplete="off" placeholder="Toyota" defaultValue={car?.make} />
        </div>
        <div className="field">
          <label htmlFor="makeEn">廠牌（英）</label>
          <input id="makeEn" name="makeEn" autoComplete="off" placeholder="Toyota" defaultValue={car?.makeEn} />
        </div>
        <div className="field">
          <label htmlFor="model">車型（必填）</label>
          <input id="model" name="model" required autoComplete="off" placeholder="RAV4" defaultValue={car?.model} />
        </div>
        <div className="field">
          <label htmlFor="year">年份（必填）</label>
          <input id="year" name="year" type="number" min="1980" max="2035" required autoComplete="off" placeholder="2021" defaultValue={car?.year} />
        </div>
        <div className="field">
          <label htmlFor="price">標價 TWD（必填）</label>
          <input id="price" name="price" type="number" min="0" step="1000" required autoComplete="off" placeholder="788000" defaultValue={car?.price} />
        </div>
        <div className="field">
          <label htmlFor="mileage">里程</label>
          <input id="mileage" name="mileage" type="number" defaultValue={car?.mileage} />
        </div>
        <div className="field">
          <label htmlFor="color">外色</label>
          <input id="color" name="color" defaultValue={car?.color} />
        </div>
        <div className="field">
          <label htmlFor="interior">內裝</label>
          <input id="interior" name="interior" defaultValue={car?.interior} />
        </div>
        <div className="field">
          <label htmlFor="displacement">排氣量</label>
          <input id="displacement" name="displacement" defaultValue={car?.displacement} placeholder="2.0L" />
        </div>
        <div className="field">
          <label htmlFor="engine">引擎說明</label>
          <input id="engine" name="engine" defaultValue={car?.engine} />
        </div>
        <div className="field">
          <label htmlFor="horsepower">馬力</label>
          <input id="horsepower" name="horsepower" type="number" defaultValue={car?.horsepower} />
        </div>
        <div className="field">
          <label htmlFor="transmission">變速箱</label>
          <input id="transmission" name="transmission" defaultValue={car?.transmission} />
        </div>
        <div className="field">
          <label htmlFor="drivetrain">驅動</label>
          <input id="drivetrain" name="drivetrain" defaultValue={car?.drivetrain} />
        </div>
        <div className="field">
          <label htmlFor="doors">車門</label>
          <select id="doors" name="doors" defaultValue={car?.doors ?? 4}>
            {DOOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bodyType">車身型式</label>
          <select id="bodyType" name="bodyType" defaultValue={car?.bodyType ?? "sedan"}>
            {BODY_TYPES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">狀態</label>
          <select id="status" name="status" defaultValue={car?.status ?? "available"}>
            <option value="available">可鑑賞</option>
            <option value="reserved">已預留</option>
            <option value="sold">已交付</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="slug">網址代稱</label>
          <input id="slug" name="slug" defaultValue={car?.slug} />
        </div>
        <div className="field wide">
          <label htmlFor="specs">大小規格（每行：項目｜數值）</label>
          <textarea id="specs" name="specs" defaultValue={car ? specsToText(car.specs) : ""} placeholder="車長｜4,600 mm" />
        </div>
        <div className="field wide">
          <label htmlFor="equipment">配備（逗號或換行）</label>
          <textarea
            id="equipment"
            name="equipment"
            defaultValue={(car?.equipment.length ? car.equipment : car?.options ?? []).join("\n")}
          />
        </div>
        <div className="field wide">
          <label htmlFor="story">說明</label>
          <textarea id="story" name="story" defaultValue={car?.story} />
        </div>
        <div className="field wide">
          <label htmlFor="photoUrls">照片（每行一個網址，或上傳）</label>
          <textarea
            id="photoUrls"
            name="photoUrls"
            value={photoUrls}
            onChange={(event) => setPhotoUrls(event.target.value)}
          />
          <input type="file" accept="image/*" multiple onChange={(event) => onUpload(event.target.files)} />
          {uploading ? <p className="mute">上傳中…</p> : null}
        </div>
        <div className="field">
          <label>
            <input type="checkbox" name="published" defaultChecked={car?.published ?? true} /> 上架公開
          </label>
        </div>
        <div className="field">
          <label>
            <input type="checkbox" name="featured" defaultChecked={car?.featured} /> 精選（首頁主視覺）
          </label>
        </div>
      </div>
      <div className="thumb-row">
        {photoUrls
          .split("\n")
          .map((url) => url.trim())
          .filter(Boolean)
          .map((url) => (
            <img key={url} src={url} alt="" />
          ))}
      </div>
      <button className="btn" type="submit">
        儲存
      </button>
    </form>
  );
}
