import Link from "next/link";
import { FeatureIcon, type FeatureIconName } from "@/components/FeatureIcon";
import { HeroIllustration } from "@/components/HeroIllustration";

type Feature = { title: string; body: string } & (
  | { img: string }
  | { icon: FeatureIconName }
);

const FEATURES: Feature[] = [
  {
    img: "/illustrations/features/rocket.png",
    title: "Livraison échelonnée, sur mesure",
    body: "Étale ta commande sur plusieurs jours au lieu de tout livrer d'un coup — tu choisis le nombre de jours et de lots. Réduit le risque que la plateforme détecte un pic anormal d'activité.",
  },
  {
    img: "/illustrations/features/counter.png",
    title: "Montants flexibles",
    body: "Un curseur, pas un formulaire. Choisis la quantité qui te convient et vois le montant se calculer automatiquement, en direct.",
  },
  {
    img: "/illustrations/features/thumbsup.png",
    title: "Qualité au choix",
    body: "Plusieurs offres par service — du plus économique (sans garantie) au premium haute qualité avec refill longue durée. À toi de choisir le compromis prix/sécurité.",
  },
  {
    img: "/illustrations/features/astronaut.png",
    title: "Ciblage géographique",
    body: "Mix mondial ou pays spécifique selon l'offre choisie — utile si ton audience doit paraître localisée plutôt que générique.",
  },
  {
    icon: "progress",
    title: "Suivi en temps réel",
    body: "Chaque commande a sa barre de progression — tu sais exactement où ça en est, sans avoir à demander.",
  },
  {
    img: "/illustrations/features/comment.png",
    title: "Support réactif",
    body: "Une question, un souci ? Un ticket suffit — l'équipe répond directement, avec notification par email.",
  },
];

const OPERATORS = ["Orange Money", "Moov Money", "Coris Money", "Sank Money", "Telecel Money", "Carte bancaire"];

export default function HomePage() {
  return (
    <main>
      <section className="border-b-2 border-ink-900 bg-[#FFFBF0] px-6 py-14 sm:py-20">
        <div className="mx-auto grid max-w-[1600px] items-center gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div className="text-center lg:text-left">
            <h1 className="mx-auto max-w-xl text-4xl font-semibold tracking-tight text-ink-900 lg:mx-0">
              Développe ta présence sur les réseaux sociaux
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-ink-500 lg:mx-0">
              Followers, vues, likes et engagement, livrés rapidement et payables en Mobile Money.
            </p>
            <Link
              href="/services"
              className="mt-6 inline-block rounded-lg border-2 border-ink-900 bg-ink-900 px-6 py-3 text-sm font-semibold text-brand-500 transition-colors hover:bg-brand-500 hover:text-ink-900"
            >
              Voir les services
            </Link>
          </div>
          <HeroIllustration />
        </div>
      </section>

      <section className="border-b border-ink-100 bg-white px-6 py-10">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink-400">
            Paiement Mobile Money
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {OPERATORS.map((op) => (
              <span
                key={op}
                className="rounded-full border-2 border-ink-900 px-4 py-1.5 text-sm font-semibold text-ink-900"
              >
                {op}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-ink-100 bg-ink-50 px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-semibold text-ink-900">
            Pourquoi commander sur Boostora
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex flex-col items-center rounded-xl2 border-2 border-ink-900 bg-white p-6 text-center"
              >
                {"img" in f ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static illustration asset
                  <img src={f.img} alt="" className="h-32 w-auto object-contain" />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-ink-900 bg-brand-500">
                    <FeatureIcon name={f.icon} className="h-12 w-12 text-ink-900" />
                  </div>
                )}
                <h3 className="mt-4 text-sm font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink-900 px-6 py-14 text-center">
        <h2 className="text-2xl font-semibold text-white">Prêt à décoller ?</h2>
        <p className="mx-auto mt-2 max-w-md text-ink-300">
          Instagram, TikTok, Facebook, YouTube — un catalogue complet t&apos;attend.
        </p>
        <Link
          href="/services"
          className="mt-6 inline-block rounded-lg border-2 border-brand-500 bg-brand-500 px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-ink-900 hover:text-brand-500"
        >
          Parcourir le catalogue
        </Link>
      </section>
    </main>
  );
}
