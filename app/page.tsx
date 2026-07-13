import { redirect } from "next/navigation";

export default function RootPage() {
  // Instantly routes unauthenticated root traffic to your high-grade student login panel
  redirect("/login");
}