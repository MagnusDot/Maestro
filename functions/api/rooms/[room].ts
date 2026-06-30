import type { Env } from "../../../worker/src";
import { sanitizeRoomCode } from "../../../src/game/engine";

type PagesEnv = Env & {
  ROOMS: DurableObjectNamespace;
};

export const onRequest: PagesFunction<PagesEnv> = async ({ request, env, params }) => {
  const code = sanitizeRoomCode(String(params.room ?? "SMROOM"));
  const id = env.ROOMS.idFromName(code);
  return env.ROOMS.get(id).fetch(request);
};
