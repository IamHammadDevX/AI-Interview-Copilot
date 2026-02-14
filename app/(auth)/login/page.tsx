import AuthForm from "../_components/AuthForm";
import { loginAction } from "../actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard/projects");

  return <AuthForm mode="login" action={loginAction} />;
}

