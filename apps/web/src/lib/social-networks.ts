export const SOCIAL_NETWORKS = {
  instagram: {
    name: "Instagram",
    eyebrow: "Instagram, sans attendre",
    headline: "Achète des abonnés, likes, vues et commentaires Instagram.",
    body: "Donne du poids à ton profil, tes Reels et tes publications. Choisis ton service, la quantité, puis passe commande en quelques secondes.",
    accent: "IG",
    benefits: ["Abonnés pour ton profil", "Likes, vues et partages", "Vues pour tes Reels et Stories"],
  },
  tiktok: {
    name: "TikTok",
    eyebrow: "TikTok, plus visible",
    headline: "Achète des abonnés, vues, likes et commentaires TikTok.",
    body: "Ne laisse pas tes vidéos passer inaperçues. Donne-leur l’élan qu’elles méritent et commande la quantité qui te convient.",
    accent: "TT",
    benefits: ["Abonnés TikTok", "Vues pour tes vidéos", "Likes, commentaires et partages"],
  },
  facebook: {
    name: "Facebook",
    eyebrow: "Facebook, plus solide",
    headline: "Achète des abonnés, likes, vues et réactions Facebook.",
    body: "Fais grandir ta page et donne plus de portée à tes publications, vidéos et Lives avec des services clairs et commandables immédiatement.",
    accent: "f",
    benefits: ["Abonnés pour pages et profils", "Likes et réactions", "Vues pour vidéos et Reels"],
  },
  youtube: {
    name: "YouTube",
    eyebrow: "YouTube, plus regardé",
    headline: "Achète des vues, abonnés, likes et commentaires YouTube.",
    body: "Donne un coup d’accélérateur à tes vidéos et à ta chaîne. Sélectionne l’offre, choisis la quantité et suis la commande.",
    accent: "▶",
    benefits: ["Vues pour tes vidéos", "Abonnés pour ta chaîne", "Likes et commentaires"],
  },
  spotify: {
    name: "Spotify",
    eyebrow: "Spotify, plus écouté",
    headline: "Achète des écoutes, abonnés et ajouts en playlist Spotify.",
    body: "Mets tes titres devant plus d’auditeurs. Choisis le format qui sert ta sortie et commande directement.",
    accent: "S",
    benefits: ["Écoutes pour tes titres", "Abonnés pour ton profil", "Ajouts en playlist"],
  },
  twitter: {
    name: "X (Twitter)",
    eyebrow: "X, plus remarqué",
    headline: "Achète des abonnés, vues, likes et reposts sur X.",
    body: "Donne plus de portée à ton compte et à tes posts. Une offre, une quantité, un paiement et le suivi est lancé.",
    accent: "X",
    benefits: ["Abonnés pour ton compte", "Vues pour tes posts", "Likes et reposts"],
  },
  whatsapp: {
    name: "WhatsApp",
    eyebrow: "WhatsApp, plus suivi",
    headline: "Achète des abonnés et de la visibilité pour WhatsApp.",
    body: "Fais connaître ton canal ou ta communauté. Trouve le service adapté, sélectionne la quantité et commande simplement.",
    accent: "W",
    benefits: ["Abonnés pour tes canaux", "Visibilité pour ta communauté", "Commande et suivi simplifiés"],
  },
  snapchat: {
    name: "Snapchat",
    eyebrow: "Snapchat, plus présent",
    headline: "Achète des abonnés, vues et interactions Snapchat.",
    body: "Renforce la présence de ton profil et de tes contenus. Wassago te laisse choisir l’offre et la quantité dont tu as besoin.",
    accent: "S",
    benefits: ["Abonnés Snapchat", "Vues pour tes contenus", "Interactions pour ton profil"],
  },
  linkedin: {
    name: "LinkedIn",
    eyebrow: "LinkedIn, plus visible",
    headline: "Achète des abonnés et de la visibilité LinkedIn.",
    body: "Donne plus de présence à ton profil, à ta page et à tes publications professionnelles avec des offres simples à commander.",
    accent: "in",
    benefits: ["Abonnés pour ta page", "Visibilité pour tes publications", "Présence professionnelle renforcée"],
  },
  telegram: {
    name: "Telegram",
    eyebrow: "Telegram, plus suivi",
    headline: "Achète des membres, vues et réactions Telegram.",
    body: "Fais avancer ton canal ou ton groupe. Choisis un service, règle ta quantité et garde un œil sur ta commande.",
    accent: "T",
    benefits: ["Membres pour tes canaux", "Vues pour tes publications", "Réactions et interactions"],
  },
} as const;

export type SocialNetworkSlug = keyof typeof SOCIAL_NETWORKS;

export function isSocialNetworkSlug(value: string): value is SocialNetworkSlug {
  return value in SOCIAL_NETWORKS;
}
