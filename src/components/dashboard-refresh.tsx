"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function DashboardRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="button button-secondary dashboard-refresh"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      aria-live="polite"
    >
      <RefreshCw size={15} />
      {isPending ? "Refreshing…" : "Refresh data"}
    </button>
  );
}
