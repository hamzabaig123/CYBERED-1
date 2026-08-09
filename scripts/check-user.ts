import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, "nasreen.qayoom@gmail.com"));
  
  if (user) {
    console.log("User found:");
    console.log(JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }, null, 2));
  } else {
    console.log("User not found");
  }
}

main().catch(console.error);
