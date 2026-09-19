import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SocialNetworkLanding } from "@/components/SocialNetworkLanding";
import { SOCIAL_NETWORKS, isSocialNetworkSlug } from "@/lib/social-networks";

export function generateStaticParams() {
  return Object.keys(SOCIAL_NETWORKS).map((network) => ({ network }));
}

export function generateMetadata({ params }: { params: { network: string } }): Metadata {
  if (!isSocialNetworkSlug(params.network)) return {};
  const network = SOCIAL_NETWORKS[params.network];
  return { title: `${network.name} : abonnés, vues, likes et commentaires | Wassago`, description: network.body };
}

export default function NetworkPage({ params }: { params: { network: string } }) {
  if (!isSocialNetworkSlug(params.network)) notFound();
  return <SocialNetworkLanding network={params.network} />;
}
