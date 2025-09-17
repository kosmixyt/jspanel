import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
  }
  if (!session?.user) {
    redirect("/api/auth/signin");
    return null;
  }

  return (
    <HydrateClient>
      <div>Salut {session?.user.name}</div>
    </HydrateClient>
  );
}
