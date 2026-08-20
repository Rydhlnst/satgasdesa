import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { getDb } from "@/src/db";
import { user } from "@/src/db/schema/auth";
import { createAuth } from "./auth";

export async function getSession() {
  const auth = createAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const [currentUser] = await getDb()
    .select({ status: user.status })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  return currentUser?.status === "ACTIVE" ? session : null;
}
