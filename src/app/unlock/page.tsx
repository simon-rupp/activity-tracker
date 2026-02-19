import { redirect } from "next/navigation";

export default function UnlockRedirectPage() {
  redirect("/login");
}
