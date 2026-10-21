import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! }),
});

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {},
      create: {
        email: email.toLowerCase(),
        name: 'Store owner',
        role: 'ADMIN',
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
      },
    });
  }

  // Returns policy per category (working days; 0 = not returnable). Editable at /admin/categories.
  const cats = [
    { slug: 'baking-accessories', name: 'Baking accessories', sortOrder: 1, returnWindowDays: 3 },
    { slug: 'kitchenware', name: 'Kitchenware', sortOrder: 2, returnWindowDays: 7 },
    { slug: 'cooking-utensils', name: 'Cooking utensils', sortOrder: 3, returnWindowDays: 7 },
    { slug: 'decoration', name: 'Decoration', sortOrder: 4, returnWindowDays: 3 },
    { slug: 'cakes-and-pastries', name: 'Cakes and pastries', sortOrder: 5, returnWindowDays: 0 },
  ];
  for (const c of cats) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  const bySlug = Object.fromEntries(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id]),
  );

  const products = [
    { slug: 'springform-pan-9in', name: '9-inch springform pan', cat: 'baking-accessories', price: '145.00', stock: 24 },
    { slug: 'offset-spatula-set', name: 'Offset spatula set of 3', cat: 'baking-accessories', price: '85.00', stock: 40 },
    { slug: 'cast-iron-skillet-26cm', name: 'Cast iron skillet, 26 cm', cat: 'kitchenware', price: '320.00', stock: 8 },
    { slug: 'beechwood-spoon-trio', name: 'Beechwood spoon trio', cat: 'cooking-utensils', price: '60.00', stock: 55 },
    { slug: 'gold-cake-topper-set', name: 'Gold cake topper set', cat: 'decoration', price: '45.00', stock: 30 },
    { slug: 'red-velvet-cake-8in', name: 'Red velvet cake, 8-inch', cat: 'cakes-and-pastries', price: '380.00', stock: 5, pickupOnly: true },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        name: p.name,
        description: `${p.name}. Replace with the real product description.`,
        categoryId: bySlug[p.cat],
        status: 'PUBLISHED',
        basePrice: p.price,
        images: [],
        isFeatured: true,
        pickupOnly: p.pickupOnly ?? false,
        variants: {
          create: [{ sku: p.slug.toUpperCase(), stockOnHand: p.stock }],
        },
      },
    });
  }

  // Owner-editable settings: 10-minute payment window, 3 working-day returns.
  await prisma.storeSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', paymentWindowMinutes: 10, returnWindowWorkingDays: 3, pricesIncludeTax: false, publicHolidays: [] },
  });

  // Nationwide delivery. PLACEHOLDER fees and lead times: the owner must set real ones.
  if ((await prisma.deliveryZone.count()) === 0) {
    const tiers: { regions: string[]; fee: string; leadTime: string }[] = [
      { regions: ['Greater Accra'], fee: '50.00', leadTime: '1 working day' },
      { regions: ['Ashanti', 'Central', 'Eastern'], fee: '70.00', leadTime: '1–2 working days' },
      { regions: ['Volta', 'Western', 'Western North', 'Bono', 'Bono East', 'Ahafo', 'Oti'], fee: '90.00', leadTime: '2–3 working days' },
      { regions: ['Northern', 'Savannah', 'North East', 'Upper East', 'Upper West'], fee: '120.00', leadTime: '2–4 working days' },
    ];
    let sortOrder = 0;
    await prisma.deliveryZone.createMany({
      data: [
        // Area-specific rate inside a region (checked before the region default).
        { name: 'Central Accra', region: 'Greater Accra', areas: ['Osu', 'Labone', 'Cantonments', 'Airport Residential', 'East Legon'], fee: '30.00', leadTime: 'Same or next working day', freeDeliveryThreshold: '600.00', sortOrder: sortOrder++ },
        ...tiers.flatMap((t) => t.regions.map((region) => ({ name: region, region, areas: [], fee: t.fee, leadTime: t.leadTime, sortOrder: sortOrder++ }))),
      ],
    });
  }

  // Tax lines are seeded INACTIVE on purpose. Confirm the current names, rates and whether they
  // apply to delivery with your accountant, then activate via PATCH /api/v1/admin/tax-rates/:id.
  if ((await prisma.taxRate.count()) === 0) {
    await prisma.taxRate.create({ data: { name: 'VAT', rate: '0.1500', appliesToDelivery: false, isActive: false, sortOrder: 1 } });
  }

  // Services customers can request a quote for (editable in the database; admin screen to follow).
  const services = [
    { slug: 'custom-cake', name: 'Custom cake', description: 'Birthday, wedding, naming ceremony or corporate cakes, designed to your theme.', sortOrder: 1 },
    { slug: 'pastries-and-small-chops', name: 'Pastries and small chops', description: 'Trays of pastries and small chops for parties and office events.', sortOrder: 2 },
    { slug: 'event-decoration', name: 'Event decoration', description: 'Cake tables, backdrops and dessert-table styling.', sortOrder: 3 },
    { slug: 'cooking-and-catering', name: 'Cooking and catering', description: 'Cooking for gatherings, or a baking or cooking class.', sortOrder: 4 },
  ];
  for (const s of services) await prisma.service.upsert({ where: { slug: s.slug }, update: {}, create: s });

  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: { code: 'WELCOME10', discountType: 'PERCENT', value: '10', maxDiscount: '100', firstOrderOnly: true, perUserLimit: 1 },
  });
}

main()
  .then(() => console.log('Seed complete'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
