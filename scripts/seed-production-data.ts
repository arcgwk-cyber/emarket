import { Pool } from 'pg';
import { parse } from 'pg-connection-string';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../lib/db/schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in environment variables.');
  process.exit(1);
}

const config = parse(process.env.DATABASE_URL);
config.ssl = { rejectUnauthorized: false };
const pool = new Pool(config as any);
const db = drizzle(pool, { schema });

async function seed() {
  console.log('🌱 Starting clean production-ready database seeding with real images...');

  try {
    // 1. Clear existing products, variants, inventory, and transactions to ensure NO dummy data
    console.log('Clearing old product catalog data...');
    await db.delete(schema.inventoryTransactions);
    await db.delete(schema.inventory);
    await db.delete(schema.productVariants);
    await db.delete(schema.products);
    await db.delete(schema.brands);
    await db.delete(schema.categories);

    // 2. Fetch default business and store
    console.log('Fetching Business and Store nodes...');
    const business = await db.query.businesses.findFirst({
      where: (b, { eq }) => eq(b.slug, 'e-market-superstore'),
    });
    if (!business) {
      console.error('Default business e-market-superstore not found. Run migrations/initial seed first.');
      process.exit(1);
    }
    const businessId = business.id;

    const store = await db.query.stores.findFirst({
      where: (s, { eq }) => eq(s.name, 'E-Market Delhi H.O.'),
    });
    if (!store) {
      console.error('Default store E-Market Delhi H.O. not found.');
      process.exit(1);
    }
    const storeId = store.id;

    // 3. Seed Real Indian Categories
    console.log('Seeding Categories...');
    const categoriesData = [
      { name: 'Vegetables', slug: 'vegetables', description: 'Fresh farm-sourced local vegetables', imageUrl: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=300&auto=format&fit=crop&q=60' },
      { name: 'Dairy & Eggs', slug: 'dairy-eggs', description: 'Fresh milk, curd, paneer, and eggs', imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop&q=60' },
      { name: 'Groceries', slug: 'groceries', description: 'Standard Indian pantry staples, atta, rice, and oils', imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60' },
      { name: 'Fresh Meat', slug: 'fresh-meat', description: 'Fresh chicken, mutton, and meats', imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=300&auto=format&fit=crop&q=60' },
    ];

    const insertedCategories: Record<string, string> = {};
    for (const cat of categoriesData) {
      const [res] = await db.insert(schema.categories).values({
        businessId,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        imageUrl: cat.imageUrl,
        status: 'active',
      }).returning();
      insertedCategories[cat.name] = res.id;
    }

    // 4. Seed Real Brands
    console.log('Seeding Brands...');
    const brandsData = [
      { name: 'Amul', slug: 'amul' },
      { name: 'Mother Dairy', slug: 'mother-dairy' },
      { name: 'Fortune', slug: 'fortune' },
      { name: 'Aashirvaad', slug: 'aashirvaad' },
      { name: 'Tata', slug: 'tata' },
      { name: 'E-Market Farms', slug: 'e-market-farms' },
    ];

    const insertedBrands: Record<string, string> = {};
    for (const brand of brandsData) {
      const [res] = await db.insert(schema.brands).values({
        name: brand.name,
        slug: brand.slug,
        status: 'active',
      }).returning();
      insertedBrands[brand.name] = res.id;
    }

    // 5. Seed Real Indian Products with packaging variants and real high-quality Unsplash images
    console.log('Seeding Products and Variants...');
    const productsData = [
      {
        name: 'Fresh Red Tomato (Tamatar)',
        slug: 'fresh-red-tomato',
        sku: 'VEG-TOM-001',
        categoryName: 'Vegetables',
        brandName: 'E-Market Farms',
        description: 'Locally grown fresh red tomatoes, sorted for premium quality.',
        shortDescription: 'Farm fresh local tomatoes.',
        images: ['https://images.unsplash.com/photo-1595855759920-86582396756a?w=600&auto=format&fit=crop&q=80'],
        mrp: '50.00',
        sellingPrice: '35.00',
        costPrice: '20.00',
        stockType: 'kg',
        weightG: 1000,
        isVariableWeight: true,
        priceAdjustmentRule: { tolerancePercent: 10 },
        isFeatured: true,
        variants: [
          { name: '500g Pack', sku: 'VEG-TOM-001-500G', mrp: '25.00', sellingPrice: '18.00', costPrice: '10.00', weightG: 500, images: ['https://images.unsplash.com/photo-1595855759920-86582396756a?w=600&auto=format&fit=crop&q=80'] },
          { name: '1kg Pack', sku: 'VEG-TOM-001-1KG', mrp: '50.00', sellingPrice: '35.00', costPrice: '20.00', weightG: 1000, images: ['https://images.unsplash.com/photo-1595855759920-86582396756a?w=600&auto=format&fit=crop&q=80'] },
        ]
      },
      {
        name: 'Fresh Onions (Pyaaz)',
        slug: 'fresh-onions',
        sku: 'VEG-ONN-001',
        categoryName: 'Vegetables',
        brandName: 'E-Market Farms',
        description: 'High-quality Indian pink onions sourced directly from Nasik farms.',
        shortDescription: 'Premium Nasik pink onions.',
        images: ['https://images.unsplash.com/photo-1603052875302-d376b7c0638a?w=600&auto=format&fit=crop&q=80'],
        mrp: '60.00',
        sellingPrice: '45.00',
        costPrice: '28.00',
        stockType: 'kg',
        weightG: 1000,
        isVariableWeight: true,
        priceAdjustmentRule: { tolerancePercent: 10 },
        isFeatured: true,
        variants: [
          { name: '1kg Pack', sku: 'VEG-ONN-001-1KG', mrp: '60.00', sellingPrice: '45.00', costPrice: '28.00', weightG: 1000, images: ['https://images.unsplash.com/photo-1603052875302-d376b7c0638a?w=600&auto=format&fit=crop&q=80'] },
          { name: '5kg Family Pack', sku: 'VEG-ONN-001-5KG', mrp: '300.00', sellingPrice: '210.00', costPrice: '140.00', weightG: 5000, images: ['https://images.unsplash.com/photo-1603052875302-d376b7c0638a?w=600&auto=format&fit=crop&q=80'] },
        ]
      },
      {
        name: 'Fresh Potatoes (Aloo)',
        slug: 'fresh-potatoes',
        sku: 'VEG-POT-001',
        categoryName: 'Vegetables',
        brandName: 'E-Market Farms',
        description: 'New crop cold-storage-free fresh potatoes, ideal for all Indian recipes.',
        shortDescription: 'Fresh local potatoes.',
        images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80'],
        mrp: '40.00',
        sellingPrice: '28.00',
        costPrice: '15.00',
        stockType: 'kg',
        weightG: 1000,
        isVariableWeight: true,
        priceAdjustmentRule: { tolerancePercent: 10 },
        isFeatured: false,
        variants: [
          { name: '1kg Pack', sku: 'VEG-POT-001-1KG', mrp: '40.00', sellingPrice: '28.00', costPrice: '15.00', weightG: 1000, images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80'] },
          { name: '3kg Family Pack', sku: 'VEG-POT-001-3KG', mrp: '120.00', sellingPrice: '80.00', costPrice: '45.00', weightG: 3000, images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80'] },
        ]
      },
      {
        name: 'Amul Gold Full Cream Milk',
        slug: 'amul-gold-milk',
        sku: 'DRY-MLK-001',
        categoryName: 'Dairy & Eggs',
        brandName: 'Amul',
        description: 'High-fat pasteurized milk from Amul, ideal for tea, coffee, and desserts.',
        shortDescription: 'Amul Gold pasteurized full cream milk.',
        images: ['https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&auto=format&fit=crop&q=80'],
        mrp: '33.00',
        sellingPrice: '33.00',
        costPrice: '29.00',
        stockType: 'pack',
        weightG: 500,
        isVariableWeight: false,
        isFeatured: true,
        variants: [
          { name: '500ml Pouch', sku: 'DRY-MLK-001-500M', mrp: '33.00', sellingPrice: '33.00', costPrice: '29.00', weightG: 500, images: ['https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&auto=format&fit=crop&q=80'] },
          { name: '1L Pouch', sku: 'DRY-MLK-001-1L', mrp: '66.00', sellingPrice: '66.00', costPrice: '58.00', weightG: 1000, images: ['https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&auto=format&fit=crop&q=80'] },
        ]
      },
      {
        name: 'Mother Dairy Classic Dahi (Curd)',
        slug: 'mother-dairy-curd',
        sku: 'DRY-CURD-001',
        categoryName: 'Dairy & Eggs',
        brandName: 'Mother Dairy',
        description: 'Thick, creamy set curd prepared under hygienic conditions, rich in calcium.',
        shortDescription: 'Mother Dairy set curd cup.',
        images: ['https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80'],
        mrp: '35.00',
        sellingPrice: '35.00',
        costPrice: '28.00',
        stockType: 'pack',
        weightG: 200,
        isVariableWeight: false,
        isFeatured: true,
        variants: [
          { name: '200g Cup', sku: 'DRY-CURD-001-200G', mrp: '35.00', sellingPrice: '35.00', costPrice: '28.00', weightG: 200, images: ['https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80'] },
          { name: '400g Cup', sku: 'DRY-CURD-001-400G', mrp: '65.00', sellingPrice: '65.00', costPrice: '52.00', weightG: 400, images: ['https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80'] },
        ]
      },
      {
        name: 'Fortune Soya Health Refined Oil',
        slug: 'fortune-refined-soyabean-oil',
        sku: 'GRC-SOIL-001',
        categoryName: 'Groceries',
        brandName: 'Fortune',
        description: 'Light, healthy soyabean cooking oil enriched with Vitamins A and D.',
        shortDescription: 'Fortune refined soyabean oil.',
        images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80'],
        mrp: '140.00',
        sellingPrice: '125.00',
        costPrice: '105.00',
        stockType: 'litre',
        weightG: 1000,
        isVariableWeight: false,
        isFeatured: true,
        variants: [
          { name: '1L Pouch', sku: 'GRC-SOIL-001-1L', mrp: '140.00', sellingPrice: '125.00', costPrice: '105.00', weightG: 1000, images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80'] },
          { name: '5L Can', sku: 'GRC-SOIL-001-5L', mrp: '750.00', sellingPrice: '660.00', costPrice: '550.00', weightG: 5000, images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80'] },
        ]
      },
      {
        name: 'Aashirvaad Shudh Chakki Atta',
        slug: 'aashirvaad-chakki-atta',
        sku: 'GRC-ATTA-001',
        categoryName: 'Groceries',
        brandName: 'Aashirvaad',
        description: '100% stone-ground whole wheat atta from ITC, ensuring soft and nutritious rotis.',
        shortDescription: 'Aashirvaad whole wheat chakki atta.',
        images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'],
        mrp: '260.00',
        sellingPrice: '245.00',
        costPrice: '200.00',
        stockType: 'kg',
        weightG: 5000,
        isVariableWeight: false,
        isFeatured: true,
        variants: [
          { name: '5kg Bag', sku: 'GRC-ATTA-001-5KG', mrp: '260.00', sellingPrice: '245.00', costPrice: '200.00', weightG: 5000, images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'] },
          { name: '10kg Bag', sku: 'GRC-ATTA-001-10KG', mrp: '490.00', sellingPrice: '460.00', costPrice: '380.00', weightG: 10000, images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'] },
        ]
      },
      {
        name: 'Tata Salt (Iodized)',
        slug: 'tata-salt-iodized',
        sku: 'GRC-SALT-001',
        categoryName: 'Groceries',
        brandName: 'Tata',
        description: 'India\'s trustworthy vacuum evaporated iodized salt for daily cooking.',
        shortDescription: 'Tata iodized table salt.',
        images: ['https://images.unsplash.com/photo-1594911774802-8822a7079af1?w=600&auto=format&fit=crop&q=80'],
        mrp: '28.00',
        sellingPrice: '26.00',
        costPrice: '20.00',
        stockType: 'kg',
        weightG: 1000,
        isVariableWeight: false,
        isFeatured: false,
      },
      {
        name: 'Fresh Chicken Curry Cut (Skinless)',
        slug: 'fresh-chicken-curry-cut',
        sku: 'MET-CHK-001',
        categoryName: 'Fresh Meat',
        brandName: 'E-Market Farms',
        description: 'Fresh skinless bone-in chicken cuts, thoroughly cleaned and vacuum-packed.',
        shortDescription: 'Skinless chicken curry cuts.',
        images: ['https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600&auto=format&fit=crop&q=80'],
        mrp: '320.00',
        sellingPrice: '260.00',
        costPrice: '180.00',
        stockType: 'kg',
        weightG: 1000,
        isVariableWeight: true,
        priceAdjustmentRule: { tolerancePercent: 15 },
        isFeatured: true,
        variants: [
          { name: '500g Pack', sku: 'MET-CHK-001-500G', mrp: '160.00', sellingPrice: '140.00', costPrice: '90.00', weightG: 500, images: ['https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600&auto=format&fit=crop&q=80'] },
          { name: '1kg Pack', sku: 'MET-CHK-001-1KG', mrp: '320.00', sellingPrice: '260.00', costPrice: '180.00', weightG: 1000, images: ['https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600&auto=format&fit=crop&q=80'] },
        ]
      },
      {
        name: 'Fresh Mutton Curry Cut (Bone-in)',
        slug: 'fresh-mutton-curry-cut',
        sku: 'MET-MUT-001',
        categoryName: 'Fresh Meat',
        brandName: 'E-Market Farms',
        description: 'Tender goat meat curry cut pieces sourced from hygienic certified farms.',
        shortDescription: 'Hygienic fresh mutton curry cuts.',
        images: ['https://images.unsplash.com/photo-1532550909895-df7a15df7a8b?w=600&auto=format&fit=crop&q=80'],
        mrp: '800.00',
        sellingPrice: '730.00',
        costPrice: '520.00',
        stockType: 'kg',
        weightG: 1000,
        isVariableWeight: true,
        priceAdjustmentRule: { tolerancePercent: 15 },
        isFeatured: true,
        variants: [
          { name: '500g Pack', sku: 'MET-MUT-001-500G', mrp: '400.00', sellingPrice: '375.00', costPrice: '260.00', weightG: 500, images: ['https://images.unsplash.com/photo-1532550909895-df7a15df7a8b?w=600&auto=format&fit=crop&q=80'] },
          { name: '1kg Pack', sku: 'MET-MUT-001-1KG', mrp: '800.00', sellingPrice: '730.00', costPrice: '520.00', weightG: 1000, images: ['https://images.unsplash.com/photo-1532550909895-df7a15df7a8b?w=600&auto=format&fit=crop&q=80'] },
        ]
      }
    ];

    for (const prod of productsData) {
      const catId = insertedCategories[prod.categoryName];
      const brandId = insertedBrands[prod.brandName];
      const { variants, ...prodFields } = prod as any;

      const [newProd] = await db.insert(schema.products).values({
        businessId,
        categoryId: catId,
        brandId,
        status: 'active',
        ...prodFields,
      }).returning();

      // Seed inventory record
      const [inv] = await db.insert(schema.inventory).values({
        storeId,
        productId: newProd.id,
        physicalStock: 100,
        reservedStock: 0,
        minStockThreshold: 10,
        maxStockThreshold: 500,
      }).returning();

      // Seed stock opening transaction
      await db.insert(schema.inventoryTransactions).values({
        inventoryId: inv.id,
        type: 'opening_stock',
        quantity: 100,
        referenceType: 'manual',
        notes: 'Initial opening stock seeding',
      });

      // Seed variants if any
      if (variants && variants.length > 0) {
        for (const variant of variants) {
          const [newVar] = await db.insert(schema.productVariants).values({
            productId: newProd.id,
            status: 'active',
            ...variant,
          }).returning();

          // Seed inventory record for variant
          const [vInv] = await db.insert(schema.inventory).values({
            storeId,
            productId: newProd.id,
            variantId: newVar.id,
            physicalStock: 50,
            reservedStock: 0,
            minStockThreshold: 5,
            maxStockThreshold: 200,
          }).returning();

          await db.insert(schema.inventoryTransactions).values({
            inventoryId: vInv.id,
            type: 'opening_stock',
            quantity: 50,
            referenceType: 'manual',
            notes: 'Initial opening variant stock seeding',
          });
        }
      }
    }

    console.log('✅ Database seeded with real Indian Grocery, Vegetables, Dairy, and Meat products (using high-resolution images)!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await pool.end();
  }
}

seed();
