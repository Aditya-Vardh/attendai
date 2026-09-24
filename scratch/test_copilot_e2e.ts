import "dotenv/config";
import { runCopilot } from "../server/services/intelligence";
import { getDb } from "../server/db";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    process.exit(1);
  }

  // Employee actor fixture
  const employeeActor = {
    id: 1, // User ID linked to seed employee
    role: "employee" as const,
    name: "Leo",
    email: "leo@attendai.com",
  };

  const prompts = [
    "What is my name?",
    "What's my attendance rate?",
    "How many hours have I worked this month?",
    "Generate my attendance report.",
    "Generate my attendance report for last month.",
    "How much did my attendance improve this month?",
    "Generate my leave report.",
    "Show my leave balance.",
    "Generate my monthly workforce report.",
    "Show my attendance from September 1 to September 20."
  ];

  console.log("=== TESTING COPILOT END-TO-END FLOW ===");

  for (const prompt of prompts) {
    console.log(`\n--------------------------------------------------`);
    console.log(`PROMPT: "${prompt}"`);
    try {
      const res = await runCopilot(employeeActor, prompt);
      console.log(`TOOLS USED: ${res.toolsUsed.join(", ") || "(None)"}`);
      console.log(`ANSWER PREVIEW:\n${res.answer.slice(0, 350)}...\n`);
    } catch (err) {
      console.error(`ERROR executing prompt "${prompt}":`, err);
    }
  }

  console.log("=== END OF E2E TEST ===");
  process.exit(0);
}

main();
