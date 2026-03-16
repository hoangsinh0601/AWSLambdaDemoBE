const basePath = "src/functions/admin/inventory";

export const adminListInventory = {
  handler: `${basePath}/list.handler`,
  events: [{ httpApi: { path: "/admin/inventory", method: "get" } }],
};

export const adminUpdateInventory = {
  handler: `${basePath}/update.handler`,
  events: [{ httpApi: { path: "/admin/inventory/{id}", method: "patch" } }],
};

export const adminGetInventorySummary = {
  handler: `${basePath}/summary.handler`,
  events: [{ httpApi: { path: "/admin/inventory/summary", method: "get" } }],
};
