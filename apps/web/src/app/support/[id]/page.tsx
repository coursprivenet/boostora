"use client";

import { useParams } from "next/navigation";
import { useRequireStaff } from "@/lib/use-require-staff";
import { TicketThread } from "@/components/TicketThread";

export default function StaffTicketPage() {
  const { id } = useParams<{ id: string }>();
  const { token, isStaff, loading } = useRequireStaff();

  if (loading || !isStaff || !token) return null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <TicketThread ticketId={id} token={token} backHref="/support" isStaff />
    </main>
  );
}
