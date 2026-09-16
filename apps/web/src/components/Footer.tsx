import Link from "next/link";

export function Footer() {
  return (
    <footer className="print:hidden mt-auto border-t border-ink-100 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-ink-500 sm:flex-row">
        <p>© {new Date().getFullYear()} Boostora</p>
        <nav className="flex gap-5">
          <Link href="/terms" className="hover:text-ink-900 hover:underline">
            Conditions d&apos;Utilisation
          </Link>
          <Link href="/refund-policy" className="hover:text-ink-900 hover:underline">
            Politique de Remboursement
          </Link>
        </nav>
      </div>
    </footer>
  );
}
