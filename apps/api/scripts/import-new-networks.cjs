require("dotenv").config({ path: ".env" });
const { PrismaClient, PricingRuleType } = require("@prisma/client");
const prisma = new PrismaClient();

const categories = [
  ["spotify-followers", "Spotify Abonnés"], ["spotify-plays", "Spotify Écoutes"], ["spotify-other-services", "Spotify Autres services"],
  ["twitter-followers", "X Abonnés"], ["twitter-likes", "X J'aime"], ["twitter-shares", "X Retweets"], ["twitter-views", "X Vues"],
  ["whatsapp-members", "WhatsApp Membres"], ["whatsapp-reactions", "WhatsApp Réactions"],
  ["snapchat-followers", "Snapchat Abonnés"], ["snapchat-likes", "Snapchat J'aime"],
  ["linkedin-followers", "LinkedIn Abonnés"], ["linkedin-likes", "LinkedIn J'aime"], ["linkedin-shares", "LinkedIn Partages"], ["linkedin-other-services", "LinkedIn Vues"],
  ["telegram-members", "Telegram Membres"], ["telegram-views", "Telegram Vues"], ["telegram-reactions", "Telegram Réactions"],
];

const services = [
  [7815, "spotify-followers", "Spotify Abonnés · Mondial · Livraison progressive"], [7814, "spotify-plays", "Spotify Écoutes · Mondial · Rétention 40+ sec"], [7813, "spotify-other-services", "Spotify J'aime · Mondial"], [7819, "spotify-other-services", "Spotify Ajouts en playlist · Premium"],
  [2933, "twitter-followers", "X Abonnés · Faible chute"], [7353, "twitter-likes", "X J'aime · Engagement réel"], [10245, "twitter-shares", "X Retweets · Mondial · Refill 7 jours"], [7518, "twitter-views", "X Vues de publication · Statistiques"],
  [8509, "whatsapp-members", "WhatsApp Membres de chaîne · Mondial"], [8510, "whatsapp-members", "WhatsApp Membres de groupe · Mondial"], [8514, "whatsapp-reactions", "WhatsApp Réactions de publication · Célébration"],
  [8320, "snapchat-followers", "Snapchat Abonnés · Mondial"], [8319, "snapchat-likes", "Snapchat J'aime vidéo · Mondial"], [8352, "snapchat-likes", "Snapchat Spotlight · J'aime + vues"],
  [8401, "linkedin-followers", "LinkedIn Abonnés · Mondial · Livraison progressive"], [8406, "linkedin-likes", "LinkedIn J'aime de publication · Réels"], [8398, "linkedin-other-services", "LinkedIn Vues de publication · Mondial"], [8403, "linkedin-shares", "LinkedIn Partages · Mondial"],
  [9777, "telegram-members", "Telegram Membres de chaîne · Stables"], [9652, "telegram-views", "Telegram Vues de publication"], [9220, "telegram-reactions", "Telegram Réactions + vues"],
];

(async () => {
  const categoryBySlug = new Map();
  for (let index = 0; index < categories.length; index += 1) {
    const [slug, name] = categories[index];
    const category = await prisma.category.upsert({
      where: { slug }, update: { name, isVisible: true },
      create: { slug, name, isVisible: true, displayOrder: 100 + index },
    });
    categoryBySlug.set(slug, category.id);
  }
  for (const [providerServiceId, categorySlug, name] of services) {
    const provider = await prisma.providerService.findUnique({ where: { providerServiceId } });
    if (!provider) throw new Error(`Provider service ${providerServiceId} not found; sync PanelFollows first.`);
    const existing = await prisma.catalogService.findFirst({ where: { providerServiceId: provider.id } });
    const data = {
      categoryId: categoryBySlug.get(categorySlug), name, isVisible: true,
    };
    if (existing) {
      await prisma.catalogService.update({ where: { id: existing.id }, data });
    } else {
      await prisma.catalogService.create({ data: {
        providerServiceId: provider.id, categoryId: categoryBySlug.get(categorySlug), name,
        isVisible: true, displayOrder: 1000 + providerServiceId,
        pricingRuleType: PricingRuleType.PERCENT_MARGIN, pricingValue: 60, minPriceXof: 100,
      }});
    }
  }
  console.log(`Imported ${services.length} services across 6 networks.`);
})().finally(() => prisma.$disconnect());
