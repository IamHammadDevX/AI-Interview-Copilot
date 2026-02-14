import AuthForm from "../_components/AuthForm";
import { signupAction } from "../actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SignupPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard/projects");

  return <AuthForm mode="signup" action={signupAction} />;
}

