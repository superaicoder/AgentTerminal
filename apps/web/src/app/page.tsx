"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;
    if (session) {
      router.replace("/chat");
    } else {
      router.replace("/login");
    }
  }, [session, isPending, router]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <p style={{ color: "var(--muted)" }}>Loading...</p>
    </div>
  );
}
