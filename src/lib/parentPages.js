import { redirect } from "next/navigation";
import { isParent } from "./permissions";

/** Call at top of server pages parents must not access. */
export function blockParent(user) {
  if (isParent(user)) redirect("/");
}
