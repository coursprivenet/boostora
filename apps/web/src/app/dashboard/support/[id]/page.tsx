"use client";

import { useParams } from "next/navigation";
import { useRequireAuth } from "@/lib/use-require-auth";
import { TicketThread } from "@/components/TicketThread";

export default function ClientTicketPage() {
  const { id } = useParams<{ id: string }>();
  const { token, loading } = useRequireAuth();

  if (loading || !token) return null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <TicketThread ticketId={id} token={token} backHref="/dashboard/support" isStaff={false} />
    </main>
  );
}
