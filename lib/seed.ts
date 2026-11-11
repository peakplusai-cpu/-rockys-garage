import { hashPassword } from "./password";
import { PLACEHOLDER_INSTAGRAM, PLACEHOLDER_LINE } from "./settings";
import type { Store } from "./types";

const DEMO_PASSWORD = process.env.ADMIN_PASSWORD || "rocky-admin-2026";

/** Local JSON fallback only: admin + owner staff row, no demo inventory. */
export function seedStore(store: Store): Store {
  const now = new Date().toISOString();
  return {
    ...store,
    admin: store.admin ?? {
      passwordHash: hashPassword(DEMO_PASSWORD),
      createdAt: now,
    },
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

export { DEMO_PASSWORD, PLACEHOLDER_INSTAGRAM, PLACEHOLDER_LINE };
