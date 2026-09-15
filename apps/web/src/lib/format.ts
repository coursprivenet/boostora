export function formatXof(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "En attente de paiement",
  PAID: "Payée",
  SUBMITTING: "Transmission en cours",
  RETRY_SUBMIT: "Nouvelle tentative en cours",
  SUBMIT_FAILED: "Échec de transmission",
  QUEUED: "En file d'attente",
  PROCESSING: "En cours",
  COMPLETED: "Terminée",
  PARTIAL: "Partiellement livrée",
  CANCEL_REQUESTED: "Annulation demandée",
  CANCELLED: "Annulée",
  CANCEL_REJECTED: "Annulation refusée",
  REFILL_REQUESTED: "Refill demandé",
  REFILL_DONE: "Refill effectué",
  REFILL_FAILED: "Refill échoué",
  EXPIRED: "Expirée",
};

export function orderStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const STATUS_TONES: Record<string, "neutral" | "warning" | "success" | "danger"> = {
  PENDING_PAYMENT: "neutral",
  PAID: "neutral",
  SUBMITTING: "neutral",
  RETRY_SUBMIT: "warning",
  SUBMIT_FAILED: "danger",
  QUEUED: "neutral",
  PROCESSING: "warning",
  COMPLETED: "success",
  PARTIAL: "warning",
  CANCEL_REQUESTED: "warning",
  CANCELLED: "danger",
  CANCEL_REJECTED: "danger",
  REFILL_REQUESTED: "warning",
  REFILL_DONE: "success",
  REFILL_FAILED: "danger",
  EXPIRED: "danger",
};

export function orderStatusTone(status: string) {
  return STATUS_TONES[status] ?? "neutral";
}

const TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
  CLOSED: "Fermé",
};

const TICKET_STATUS_TONES: Record<string, "neutral" | "warning" | "success" | "danger"> = {
  OPEN: "warning",
  IN_PROGRESS: "neutral",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export function ticketStatusLabel(status: string): string {
  return TICKET_STATUS_LABELS[status] ?? status;
}

export function ticketStatusTone(status: string) {
  return TICKET_STATUS_TONES[status] ?? "neutral";
}
