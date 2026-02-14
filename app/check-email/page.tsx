import CheckEmailClient from "./ui/CheckEmailClient";

export default function CheckEmailPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams.email ?? "";
  return <CheckEmailClient email={email} />;
}

