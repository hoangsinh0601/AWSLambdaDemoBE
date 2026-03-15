const basePath = "src/functions/auth";

export const registerUser = {
  handler: `${basePath}/register.handler`,
  events: [{ httpApi: { path: "/auth/register", method: "post" } }],
};

export const loginUser = {
  handler: `${basePath}/login.handler`,
  events: [{ httpApi: { path: "/auth/login", method: "post" } }],
};

export const getProfile = {
  handler: `${basePath}/profile.handler`,
  events: [{ httpApi: { path: "/auth/me", method: "get" } }],
};
