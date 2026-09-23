import { scanAndCreateAnomalies } from "../server/services/intelligence.ts";

const created = await scanAndCreateAnomalies(0);
console.log(JSON.stringify({ created: created.map(item => ({ id: item.id, employee: item.candidate.employeeName, rule: item.candidate.ruleCode })) }, null, 2));
process.exit(0);
