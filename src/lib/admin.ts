import { isAdmin } from "./auth";
import { Oops } from "./http";

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Oops("Sign in as admin.", 401);
}
