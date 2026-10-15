import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { defaultDemoEmail, getAuth } from "@/lib/auth";
import { safeNext } from "@/lib/session";

/** GET /auto-sign-in: signs in as DEFAULT_DEMO_EMAIL (the sign-in page sends visitors here), then goes on to `next`. */
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next") ?? undefined);
  if (!defaultDemoEmail) redirect("/sign-in?manual=1");
  try {
    await getAuth().api.signInDemo({ body: { email: defaultDemoEmail }, headers: await headers() });
  } catch {
    redirect("/sign-in?manual=1"); // no such person: show the picker instead of looping
  }
  redirect(next);
}
