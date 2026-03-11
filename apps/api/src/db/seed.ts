import { env } from "../env.js";
import { auth } from "../auth/index.js";
import { db } from "./index.js";
import { userProfile } from "./schema.js";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding default admin user...");

  // Create admin via Better Auth
  const ctx = await auth.api.signUpEmail({
    body: {
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      name: "Admin",
    },
  });

  if (!ctx.user) {
    console.log("Admin user may already exist, skipping.");
    return;
  }

  // Check if profile exists
  const existing = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, ctx.user.id))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(userProfile).values({
      userId: ctx.user.id,
      role: "admin",
      isActive: true,
    });
  }

  console.log(`Admin user created: ${env.ADMIN_EMAIL}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
