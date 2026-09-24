export const ENV = {
  databaseUrl: process.env.DATABASE_URL || "",
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
