const basePath = "src/functions/admin/menu";

export const adminListMenu = {
  handler: `${basePath}/list.handler`,
  events: [{ httpApi: { path: "/admin/menu", method: "get" } }],
};

export const adminCreateMenu = {
  handler: `${basePath}/create.handler`,
  events: [{ httpApi: { path: "/admin/menu", method: "post" } }],
};

export const adminUpdateMenu = {
  handler: `${basePath}/update.handler`,
  events: [{ httpApi: { path: "/admin/menu/{id}", method: "patch" } }],
};

export const adminDeleteMenu = {
  handler: `${basePath}/delete.handler`,
  events: [{ httpApi: { path: "/admin/menu/{id}", method: "delete" } }],
};
