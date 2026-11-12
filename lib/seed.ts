import { hashPassword } from "./password";
import { PLACEHOLDER_INSTAGRAM, PLACEHOLDER_LINE } from "./settings";
import type { Store } from "./types";

const LOCAL_DEMO_PASSWORD = "rocky-admin-2026";

function initialPassword(): string {
  const configured = process.env.ADMIN_PASSWORD?.trim() ?? "";
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? "" : LOCAL_DEMO_PASSWORD;
}

/** Local JSON fallback only: admin + owner staff row, no demo inventory. */
export function seedStore(store: Store): Store {
  const now = new Date().toISOString();
  const password = initialPassword();
  return {
    ...store,
    admin:
      store.admin ??
      (password
        ? {
            passwordHash: hashPassword(password),
            createdAt: now,
          }
        : null),
    staff: store.staff.length
      ? store.staff
      : [
          {
            id: "staff_rocky",
            displayName: "洛基",
            role: "店長",
            lineUrl: process.env.NEXT_PUBLIC_LINE_URL || PLACEHOLDER_LINE,
            lineId: "rockysgarage",
            note: "",
            lineUserId: "",
            sortOrder: 1,
            createdAt: now,
          },
        ],
    cars: store.cars,
  };
}

export { PLACEHOLDER_INSTAGRAM, PLACEHOLDER_LINE };
