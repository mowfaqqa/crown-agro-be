import { PrismaClient, Category } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@zdcrown.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me-before-production";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.adminUser.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: { passwordHash },
    create: {
      email: adminEmail.toLowerCase(),
      passwordHash
    }
  });

  const seller = await prisma.seller.upsert({
    where: { id: "seed-zd-crown-orchards" },
    update: {},
    create: {
      id: "seed-zd-crown-orchards",
      name: "ZD Crown Orchards",
      country: "Nigeria",
      verified: true
    }
  });

  const products = [
    {
      name: "Fresh Apricots",
      slug: "fresh-apricots",
      description: "Carton-packed apricots from verified ZD Crown orchards.",
      price: 9000,
      compareAtPrice: 11000,
      category: Category.FRUITS,
      countryOfOrigin: "Nigeria",
      stockQuantity: 140,
      unit: "Carton",
      imageUrl: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=900&q=80",
      halalCertified: true,
      exportCertified: true,
      featured: true,
      bulkPricing: [
        { minQuantity: 20, unitPrice: 8400 },
        { minQuantity: 50, unitPrice: 7900 }
      ]
    },
    {
      name: "Fresh Dates Premium",
      slug: "fresh-dates-premium",
      description: "Premium date packs for retail, wholesale, and export buyers.",
      price: 12000,
      compareAtPrice: 13500,
      category: Category.FRUITS,
      countryOfOrigin: "Nigeria",
      stockQuantity: 90,
      unit: "Crate",
      imageUrl: "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=900&q=80",
      halalCertified: true,
      exportCertified: true,
      featured: true,
      bulkPricing: [
        { minQuantity: 15, unitPrice: 11200 },
        { minQuantity: 40, unitPrice: 10600 }
      ]
    },
    {
      name: "White Sesame Seeds",
      slug: "white-sesame-seeds",
      description: "Cleaned sesame seeds available for local supply and export.",
      price: 6500,
      category: Category.GRAINS,
      countryOfOrigin: "Nigeria",
      stockQuantity: 420,
      unit: "Bag",
      imageUrl: "https://images.unsplash.com/photo-1629123742946-4a2101921f10?auto=format&fit=crop&w=900&q=80",
      halalCertified: true,
      exportCertified: true,
      featured: false,
      bulkPricing: [
        { minQuantity: 50, unitPrice: 6100 },
        { minQuantity: 120, unitPrice: 5750 }
      ]
    }
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        ...product,
        sellerId: seller.id,
        bulkPricing: {
          deleteMany: {},
          create: product.bulkPricing
        }
      },
      create: {
        ...product,
        sellerId: seller.id,
        bulkPricing: {
          create: product.bulkPricing
        }
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
