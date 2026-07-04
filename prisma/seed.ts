/**
 * Seed data: categories, two verified users, and a handful of listings so the
 * homepage and search have something to render immediately.
 * Run with:  npm run db:seed
 */
import { PrismaClient, Condition } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: "gaming", name: "Gaming", iconKey: "gamepad" },
  { slug: "photography", name: "Photography", iconKey: "camera" },
  { slug: "computers", name: "Computers", iconKey: "laptop" },
  { slug: "audio", name: "Audio", iconKey: "speaker" },
  { slug: "video", name: "Video", iconKey: "video" },
  { slug: "drones", name: "Drones", iconKey: "drone" },
  { slug: "vr", name: "VR", iconKey: "glasses" },
  { slug: "projectors", name: "Projectors", iconKey: "projector" },
  { slug: "cooling", name: "Cooling", iconKey: "wind" },
  { slug: "power-tools", name: "Power tools", iconKey: "drill" },
  { slug: "tvs", name: "TVs & Monitors", iconKey: "tv" },
  { slug: "accessories", name: "Accessories", iconKey: "cable" },
];

async function main() {
  await Promise.all(
    CATEGORIES.map((c, i) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: { name: c.name, iconKey: c.iconKey, order: i },
        create: { ...c, order: i },
      }),
    ),
  );

  const password = await bcrypt.hash("password123", 10);

  const owner = await prisma.user.upsert({
    where: { email: "maya@example.com" },
    update: {},
    create: {
      email: "maya@example.com",
      name: "Maya Chen",
      hashedPassword: password,
      emailVerified: new Date(),
      profile: {
        create: {
          displayName: "Maya Chen",
          bio: "Photographer renting out gear between shoots.",
          city: "London",
          country: "GB",
          identityVerified: true,
          addressVerified: true,
          trustedLender: true,
          ratingAvg: 4.9,
          ratingCount: 37,
          completedRentals: 42,
          responseTimeMins: 24,
        },
      },
    },
    include: { profile: true },
  });

  const photography = await prisma.category.findUniqueOrThrow({ where: { slug: "photography" } });
  const gaming = await prisma.category.findUniqueOrThrow({ where: { slug: "gaming" } });

  const listings = [
    {
      slug: "sony-a7-iv-body",
      title: "Sony A7 IV mirrorless body",
      categoryId: photography.id,
      brand: "Sony",
      model: "A7 IV",
      condition: Condition.EXCELLENT,
      priceDailyCents: 3500,
      priceWeeklyCents: 19000,
      depositCents: 40000,
      instantBook: true,
      city: "London",
      country: "GB",
      accessories: ["2 batteries", "Charger", "64GB SD card"],
      cover: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
    },
    {
      slug: "ps5-slim-console",
      title: "PlayStation 5 Slim + 2 controllers",
      categoryId: gaming.id,
      brand: "Sony",
      model: "PS5 Slim",
      condition: Condition.LIKE_NEW,
      priceDailyCents: 1200,
      priceWeeklyCents: 6500,
      depositCents: 20000,
      instantBook: false,
      city: "London",
      country: "GB",
      accessories: ["2 DualSense controllers", "HDMI cable"],
      cover: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&q=80",
    },
  ];

  for (const l of listings) {
    const { cover, ...data } = l;
    await prisma.listing.upsert({
      where: { slug: l.slug },
      update: {},
      create: {
        ...data,
        ownerId: owner.id,
        description: `${l.title} in ${l.condition.toLowerCase().replace("_", " ")} condition. Collection in ${l.city}.`,
        status: "ACTIVE",
        currency: "GBP",
        collectionAvailable: true,
        images: { create: { url: cover, isCover: true, order: 0 } },
      },
    });
  }

  console.log("Seeded categories, 1 verified owner, and sample listings.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
