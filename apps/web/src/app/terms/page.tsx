import Link from "next/link";

export const metadata = {
  title: "Conditions d'Utilisation — Boostora",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-ink-900">Conditions d&apos;Utilisation</h1>
      <p className="mt-1 text-sm text-ink-400">Dernière mise à jour : 16 septembre 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink-700">
        <section>
          <h2 className="mb-2 text-base font-semibold text-ink-900">1. Objet</h2>
          <p>
            Boostora est une plateforme qui propose des services de marketing et de croissance pour
            réseaux sociaux (abonnés, vues, likes, commentaires, etc.). Boostora ne fournit pas ces
            services directement : chaque commande est transmise à un fournisseur technique tiers
            spécialisé, chargé de l&apos;exécution effective. Boostora agit comme intermédiaire entre
            le client et ce fournisseur, et facture le service au prix affiché sur le catalogue.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink-900">2. Nature des services</h2>
          <p>
            Les délais de livraison, la vitesse, et la disponibilité de chaque service dépendent du
            fournisseur technique et peuvent varier sans préavis. Certains services affichent un
            avertissement spécifique sur leur fiche produit (ex. absence de garantie de résultat,
            absence de refill) : cet avertissement fait partie intégrante des présentes conditions
            pour le service concerné et doit être lu avant toute commande.
          </p>
          <p className="mt-2">
            Boostora ne garantit pas que les résultats obtenus (abonnés, vues, engagement, etc.)
            resteront stables dans le temps. Les plateformes sociales (Instagram, TikTok, Facebook,
            YouTube, etc.) appliquent leurs propres règles de modération et peuvent, à tout moment et
            de leur seule initiative, retirer des abonnés, des vues ou des interactions, ou
            restreindre un compte. Boostora n&apos;a aucun contrôle sur ces décisions et ne peut en
            être tenue responsable.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink-900">3. Refill et annulation</h2>
          <p>
            Selon le service commandé, une reconstitution (« refill ») ou une annulation peuvent être
            disponibles pendant une période limitée après la commande. Ces fonctionnalités dépendent
            entièrement des capacités du fournisseur technique pour le service concerné : Boostora ne
            peut ni les garantir ni les créer pour un service qui ne les propose pas. Le support
            Boostora peut être contacté via la page de la commande ou le système de tickets pour toute
            demande d&apos;assistance.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink-900">4. Responsabilités du client</h2>
          <p>
            Le client s&apos;engage à fournir un lien cible valide, public et conforme aux conditions
            d&apos;utilisation de la plateforme visée. Le client reste seul responsable de l&apos;usage
            qu&apos;il fait des services commandés et du respect des règles de la plateforme sociale
            concernée. Toute commande passée sur Boostora vaut acceptation explicite des présentes
            conditions et de la{" "}
            <Link href="/refund-policy" className="underline hover:text-ink-900">
              Politique de Remboursement
            </Link>
            , horodatée et conservée comme preuve.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink-900">5. Paiement</h2>
          <p>
            Les paiements sont traités via mobile money (Orange Money, Moov Money, Coris Money, Sank
            Money, Telecel Money) par l&apos;intermédiaire d&apos;un prestataire de paiement tiers.
            Boostora ne stocke aucune information bancaire ou de carte de paiement.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink-900">6. Contact</h2>
          <p>
            Pour toute question relative à ces conditions ou à une commande en cours, le client peut
            ouvrir un ticket depuis son tableau de bord.
          </p>
        </section>
      </div>
    </main>
  );
}
