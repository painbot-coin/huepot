import { redirect } from "next/navigation";

export default function ForgotPasswordPage() {
  redirect("/signin?notice=google");
}
