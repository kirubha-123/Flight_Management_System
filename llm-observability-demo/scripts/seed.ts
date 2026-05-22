import { bootstrapDatabase, seedDemoConversation } from "../src/db.js";

async function main() {
  await bootstrapDatabase();
  await seedDemoConversation();
  console.log("Seed completed.");
}

void main();
