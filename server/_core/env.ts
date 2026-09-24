export const ENV = {
  appId: process.env.VITE_APP_ID || process.env.APP_ID || "attendai",
  cookieSecret: process.env.JWT_SECRET || "attendai-super-secret-jwt-key-2026",
  databaseUrl: process.env.DATABASE_URL || "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL || "",
  ownerOpenId: process.env.OWNER_OPEN_ID || "",
  isProduction: process.env.NODE_ENV === "production",
  get forgeApiUrl() {
    return process.env.OPENAI_API_BASE || process.env.LLM_API_URL || process.env.BUILT_IN_FORGE_API_URL || "";
  },
  get forgeApiKey() {
    return process.env.OPENAI_API_KEY || process.env.BUILT_IN_FORGE_API_KEY || "";
  },
  get llmModel() {
    return process.env.LLM_MODEL || "openai/gpt-oss-120b";
  },
};

