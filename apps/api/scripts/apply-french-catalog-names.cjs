/*
 * Normalises public catalogue labels from the validated fields stored by Wassago.
 * It never changes a provider mapping, price, quantity, warning, or checkout logic.
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const apply = process.argv.includes("--apply");
const countries = [
  ["thailand", "Thaïlande"], ["brazil", "Brésil"], ["pakistan", "Pakistan"], ["indonesia", "Indonésie"],
  ["philippines", "Philippines"], ["nigeria", "Nigeria"], ["canada", "Canada"], ["mexico", "Mexique"],
  ["greece", "Grèce"], ["turkey", "Turquie"], ["turkish", "Turquie"], ["saudi", "Arabie saoudite"],
  ["italy", "Italie"], ["italian", "Italie"], ["spain", "Espagne"], ["spanish", "Espagne"],
  ["france", "France"], ["french", "France"], ["india", "Inde"], ["indian", "Inde"],
  ["united states", "États-Unis"], ["usa", "États-Unis"], ["latin", "Amérique latine"],
  ["arab", "Pays arabes"], ["global", "Mondial"], ["worldwide", "Mondial"],
];

function speed(raw) {
  const direct = raw.match(/(\d+(?:\s*[-–]\s*\d+)?\s*[KM])\s*(?:\/|per\s*)?(?:day|d\b)/i);
  const reverse = raw.match(/(?:day|speed)[^\d]{0,12}(\d+(?:\s*[-–]\s*\d+)?\s*[KM])/i);
  const value = direct?.[1] ?? reverse?.[1];
  return value ? `${value.replace(/\s+/g, "")}/jour` : null;
}

function mode(raw) {
  if (/native\s+social\s+ads/i.test(raw)) return "Diffusion publicitaire";
  if (/dripfeed/i.test(raw)) return "Livraison étalée";
  if (/shorts/i.test(raw)) return "Shorts";
  if (/monetization/i.test(raw)) return "Monétisation";
  if (/live\s*(stream)?/i.test(raw)) return "En direct";
  return null;
}

function label(service) {
  const raw = service.providerService.name || "";
  const lower = raw.toLowerCase();
  const details = [];
  const deliveryMode = mode(raw);
  const country = countries.find(([needle]) => lower.includes(needle))?.[1];
  if (deliveryMode) details.push(deliveryMode);
  else if (country) details.push(country);
  const dailySpeed = speed(raw);
  if (dailySpeed) details.push(`Jusqu’à ${dailySpeed}`);
  if (service.providerService.refillSupported) details.push("Remplacement inclus");
  return [service.category.name, ...details.slice(0, 3)].join(" — ");
}

async function main() {
  const services = await prisma.catalogService.findMany({
    include: { category: true, providerService: { select: { name: true, refillSupported: true } } },
    orderBy: { displayOrder: "asc" },
  });
  const changes = services.map((service) => ({ id: service.id, from: service.name, to: label(service) }))
    .filter((change) => change.from !== change.to);
  console.log(JSON.stringify({ total: services.length, changes: changes.length, sample: changes.slice(0, 20) }, null, 2));
  if (!apply) return;
  // A single connection is available in production. One SQL update per batch avoids
  // holding it for hundreds of sequential Prisma updates.
  for (let index = 0; index < changes.length; index += 250) {
    const values = changes.slice(index, index + 250)
      .map((change) => `('${change.id.replace(/'/g, "''")}', '${change.to.replace(/'/g, "''")}')`)
      .join(", ");
    await prisma.$executeRawUnsafe(`
      UPDATE catalog_services AS service
      SET name = labels.name
      FROM (VALUES ${values}) AS labels(id, name)
      WHERE service.id = labels.id
    `);
  }
  console.log(`Applied ${changes.length} French service labels.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
