export const metadata = {
  title: "Politique de Remboursement | Wassago",
};

export default function RefundPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-ink-900">Politique de Remboursement</h1>
      <p className="mt-1 text-sm text-ink-400">Dernière mise à jour : 16 septembre 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink-700">
        <section>
          <h2 className="mb-2 text-base font-semibold text-ink-900">1. Principe général</h2>
          <p>
            Les remboursements ne sont pas automatiques. Chaque demande est examinée manuellement par
            l&apos;équipe Wassago, au cas par cas, via le système de tickets accessible depuis le
            tableau de bord du client.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink-900">2. Cas éligibles à un remboursement</h2>
          <p>Un remboursement (total ou partiel) peut être accordé lorsque :</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              le fournisseur technique n&apos;a pas livré la commande dans un délai raisonnable et ne
              répond pas aux relances ;
            </li>
            <li>la commande a échoué du fait d&apos;une erreur technique côté Wassago ou du fournisseur ;</li>
            <li>
              un paiement a été débité sans qu&apos;une commande correspondante n&apos;ait été créée ou
              confirmée.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink-900">3. Cas non éligibles</h2>
          <p>Un remboursement n&apos;est pas accordé lorsque :</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              la baisse ou la disparition des abonnés, vues ou interactions résulte d&apos;une action
              de modération de la plateforme sociale visée (Instagram, TikTok, Facebook, YouTube,
              etc.), Wassago n&apos;a aucun contrôle sur ces décisions ;
            </li>
            <li>
              le lien cible fourni était invalide, privé, ou a été modifié/supprimé par le client
              après la commande ;
            </li>
            <li>
              le service commandé affichait un avertissement (absence de refill, résultats non
              garantis) accepté par le client au moment de la commande ;
            </li>
            <li>la commande a déjà été livrée conformément à sa description.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink-900">4. Refill au lieu du remboursement</h2>
          <p>
            Lorsque le service commandé prend en charge le refill, Wassago privilégie la
            reconstitution de la commande plutôt que le remboursement, dans la limite de la période de
            garantie propre à ce service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-ink-900">5. Modalités</h2>
          <p>
            Un remboursement accordé est effectué manuellement par l&apos;équipe Wassago vers le
            même moyen de paiement mobile money utilisé pour la commande. Le délai de traitement varie
            selon l&apos;opérateur (Orange, Moov, Coris, Sank, Telecel) et est communiqué au client via
            le ticket de support correspondant.
          </p>
        </section>
      </div>
    </main>
  );
}
