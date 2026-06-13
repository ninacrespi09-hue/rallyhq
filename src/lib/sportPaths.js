import { isSportId } from "./sports";

/** Build a sport-prefixed app path, e.g. /volleyball/schedule */
export function sportPath(sport, path = "") {
  const clean = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `/${sport}${clean}`;
}

/** Parse sport from pathname like /volleyball/schedule → volleyball */
export function sportFromPathname(pathname) {
  const seg = pathname.split("/").filter(Boolean)[0];
  return isSportId(seg) ? seg : null;
}
