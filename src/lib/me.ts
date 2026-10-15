import { cache } from "react";
import { getDb } from "@/db/client";
import { loadMyProfile, loadRecommendations } from "@/db/graph";
import { isBasic } from "@/domain/access";
import { requireActor } from "./session";
import { getGraph, getPractices } from "./graph-data";

/** Everything the employee pages need about the signed-in person, read once per request. A Basic person has no profile. */
export const loadMe = cache(async () => {
  const actor = await requireActor();
  const db = getDb();
  const basic = isBasic(actor);
  const [graph, practices, mine, recommendations] = await Promise.all([
    getGraph(),
    getPractices(),
    basic ? null : loadMyProfile(db, actor.userId),
    basic ? [] : loadRecommendations(db, actor.userId),
  ]);
  return { actor, graph, practices, mine, recommendations, today: new Date() };
});
