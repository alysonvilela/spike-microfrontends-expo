import { getSession } from "auth/ssr";
import { headers } from "next/headers";

export default async function HomePage() {
  const session = await getSession(await headers());

  if (!session) {
    return (
      <div>
        <h1>Not authenticated</h1>
        <p>Please log in through the native app to access Clube.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Clube</h1>
      <p>Welcome, {session.user.name}!</p>
      <p>You are authenticated as {session.user.email}.</p>
    </div>
  );
}
