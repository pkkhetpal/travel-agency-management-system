import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export async function requirePageSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
