import { notFound } from "next/navigation";
import { isSportId } from "@/lib/sports";

export default async function SportLayout({ children, params }) {
  const { sport } = await params;
  if (!isSportId(sport)) notFound();
  return children;
}
