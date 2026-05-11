import type { auth } from "@/lib/auth";
import type { Logger } from "@/lib/logger";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export type AppVariables = {
  requestId: string;
  logger: Logger;
  user: NonNullable<AuthSession>["user"] | null;
  session: NonNullable<AuthSession>["session"] | null;
};

export type AppBindings = {
  Variables: AppVariables;
};
