import { Pool } from 'pg';
import { parse } from 'pg-connection-string';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
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
  console.log('🌱 Starting database seeding...');

  try {
    // 1. Seed Roles
    console.log('Seeding Roles...');
    const rolesData = [
      { name: 'Super Admin', description: 'Complete system access' },
      { name: 'Admin', description: 'Store-level admin access' },
      { name: 'Store Manager', description: 'Manages products, catalog, and inventory' },
      { name: 'Order Manager', description: 'Manages incoming customer orders' },
      { name: 'Inventory Manager', description: 'Manages suppliers, purchases, and stock ledger' },
      { name: 'Delivery Manager', description: 'Manages drivers and delivery slots' },
      { name: 'Customer Support', description: 'Handles returns, refunds, and support tickets' },
      { name: 'Kitchen Manager', description: 'Manages cloud kitchen orders and menu' },
      { name: 'Accounts Manager', description: 'Manages financial records, taxes, and margins' },
      { name: 'Driver', description: 'Delivery personnel' },
      { name: 'Customer', description: 'Standard buyer account' },
    ];

    const insertedRoles: Record<string, number> = {};
    for (const role of rolesData) {
      const existing = await db.query.roles.findFirst({
        where: (r, { eq }) => eq(r.name, role.name),
      });

      if (!existing) {
        const [res] = await db.insert(schema.roles).values(role).returning();
        insertedRoles[role.name] = res.id;
      } else {
        insertedRoles[role.name] = existing.id;
      }
    }

    // 2. Seed Permissions
    console.log('Seeding Permissions...');
    const permissionsData = [
      { name: 'products:create', description: 'Create new products' },
      { name: 'products:read', description: 'View product catalog' },
      { name: 'products:update', description: 'Update products' },
      { name: 'products:delete', description: 'Soft-delete products' },
      { name: 'orders:create', description: 'Place new orders' },
      { name: 'orders:read', description: 'View order records' },
      { name: 'orders:update', description: 'Update order statuses' },
      { name: 'orders:delete', description: 'Cancel orders' },
      { name: 'inventory:manage', description: 'Adjust inventory, manage suppliers' },
      { name: 'subscriptions:manage', description: 'Configure subscription packages' },
      { name: 'admin:dashboard', description: 'Access admin panels' },
    ];

    const insertedPermissions: Record<string, number> = {};
    for (const perm of permissionsData) {
      const existing = await db.query.permissions.findFirst({
        where: (p, { eq }) => eq(p.name, perm.name),
      });

      if (!existing) {
        const [res] = await db.insert(schema.permissions).values(perm).returning();
        insertedPermissions[perm.name] = res.id;
      } else {
        insertedPermissions[perm.name] = existing.id;
      }
    }

    // 3. Link Role-Permissions (Admin & Super Admin gets everything)
    console.log('Binding Role-Permissions...');
    for (const permName of Object.keys(insertedPermissions)) {
      const permId = insertedPermissions[permName];
      
      // Super Admin
      const superAdminId = insertedRoles['Super Admin'];
      const existingSA = await db.query.rolePermissions.findFirst({
        where: (rp, { and, eq }) => and(eq(rp.roleId, superAdminId), eq(rp.permissionId, permId)),
      });
      if (!existingSA) {
        await db.insert(schema.rolePermissions).values({ roleId: superAdminId, permissionId: permId });
      }

      // Store Manager Permissions: products, inventory
      if (permName.startsWith('products') || permName === 'inventory:manage' || permName === 'admin:dashboard') {
        const smId = insertedRoles['Store Manager'];
        const existingSM = await db.query.rolePermissions.findFirst({
          where: (rp, { and, eq }) => and(eq(rp.roleId, smId), eq(rp.permissionId, permId)),
        });
        if (!existingSM) {
          await db.insert(schema.rolePermissions).values({ roleId: smId, permissionId: permId });
        }
      }

      // Order Manager Permissions: orders
      if (permName.startsWith('orders') || permName === 'admin:dashboard') {
        const omId = insertedRoles['Order Manager'];
        const existingOM = await db.query.rolePermissions.findFirst({
          where: (rp, { and, eq }) => and(eq(rp.roleId, omId), eq(rp.permissionId, permId)),
        });
        if (!existingOM) {
          await db.insert(schema.rolePermissions).values({ roleId: omId, permissionId: permId });
        }
      }
    }

    // 4. Seed Default Business
    console.log('Seeding Default Business...');
    let businessId: string;
    const existingBus = await db.query.businesses.findFirst({
      where: (b, { eq }) => eq(b.slug, 'e-market-superstore'),
    });

    if (!existingBus) {
      const [res] = await db.insert(schema.businesses).values({
        name: 'E-Market Superstore',
        slug: 'e-market-superstore',
        type: 'grocery',
        status: 'active',
        settings: {
          deliverySlots: true,
          subscriptions: true,
          dietProfiles: true,
          cloudKitchen: true,
        },
      }).returning();
      businessId = res.id;
    } else {
      businessId = existingBus.id;
    }

    // 5. Seed Default Store
    console.log('Seeding Default Store...');
    let storeId: string;
    const existingStore = await db.query.stores.findFirst({
      where: (s, { eq }) => eq(s.name, 'E-Market Delhi H.O.'),
    });

    if (!existingStore) {
      const [res] = await db.insert(schema.stores).values({
        businessId: businessId,
        name: 'E-Market Delhi H.O.',
        address: 'Plot 42, Okhla Industrial Area Phase 3',
        city: 'New Delhi',
        pincode: '110020',
        latitude: '28.5355',
        longitude: '77.2639',
        status: 'active',
      }).returning();
      storeId = res.id;
    } else {
      storeId = existingStore.id;
    }

    // 6. Seed Delivery Slots
    console.log('Seeding Delivery Slots...');
    const slotsData = [
      { startTime: '07:00:00', endTime: '09:00:00', maxOrders: 30, minOrderAmount: '150.00', deliveryCharge: '49.00', availableDays: [0, 1, 2, 3, 4, 5, 6] },
      { startTime: '09:00:00', endTime: '11:00:00', maxOrders: 40, minOrderAmount: '200.00', deliveryCharge: '39.00', availableDays: [0, 1, 2, 3, 4, 5, 6] },
      { startTime: '11:00:00', endTime: '13:00:00', maxOrders: 45, minOrderAmount: '200.00', deliveryCharge: '29.00', availableDays: [0, 1, 2, 3, 4, 5, 6] },
      { startTime: '13:00:00', endTime: '15:00:00', maxOrders: 35, minOrderAmount: '200.00', deliveryCharge: '29.00', availableDays: [0, 1, 2, 3, 4, 5, 6] },
      { startTime: '15:00:00', endTime: '17:00:00', maxOrders: 30, minOrderAmount: '200.00', deliveryCharge: '39.00', availableDays: [0, 1, 2, 3, 4, 5, 6] },
      { startTime: '17:00:00', endTime: '19:00:00', maxOrders: 50, minOrderAmount: '150.00', deliveryCharge: '39.00', availableDays: [0, 1, 2, 3, 4, 5, 6] },
      { startTime: '19:00:00', endTime: '21:00:00', maxOrders: 40, minOrderAmount: '150.00', deliveryCharge: '49.00', availableDays: [0, 1, 2, 3, 4, 5, 6] },
    ];

    for (const slot of slotsData) {
      const existing = await db.query.deliverySlots.findFirst({
        where: (ds, { and, eq }) => and(eq(ds.startTime, slot.startTime), eq(ds.endTime, slot.endTime)),
      });
      if (!existing) {
        await db.insert(schema.deliverySlots).values({
          businessId,
          ...slot,
        });
      }
    }

    // 7. Seed Categories
    console.log('Seeding Categories...');
    const categoriesData = [
      { name: 'Vegetables', slug: 'vegetables', description: 'Fresh farm vegetables', imageUrl: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=300&auto=format&fit=crop&q=60' },
      { name: 'Fruits', slug: 'fruits', description: 'Fresh seasonal fruits', imageUrl: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=300&auto=format&fit=crop&q=60' },
      { name: 'Dairy & Eggs', slug: 'dairy-eggs', description: 'Milk, eggs, cheese, paneer, and curd', imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop&q=60' },
      { name: 'Meats & Poultry', slug: 'meats-poultry', description: 'Fresh chicken, fish, mutton, etc.', imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=300&auto=format&fit=crop&q=60' },
      { name: 'Cloud Kitchen', slug: 'cloud-kitchen', description: 'Freshly cooked ready meals', imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=60' },
      { name: 'Healthy Meals', slug: 'healthy-meals', description: 'Keto, low-carb diet subscription meals', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&auto=format&fit=crop&q=60' },
      { name: 'Packaged Groceries', slug: 'packaged-groceries', description: 'Standard pantry supplies', imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60' },
    ];

    const insertedCategories: Record<string, string> = {};
    for (const cat of categoriesData) {
      const existing = await db.query.categories.findFirst({
        where: (c, { and, eq }) => and(eq(c.businessId, businessId), eq(c.slug, cat.slug)),
      });

      if (!existing) {
        const [res] = await db.insert(schema.categories).values({
          businessId,
          ...cat,
          status: 'active',
        }).returning();
        insertedCategories[cat.name] = res.id;
      } else {
        insertedCategories[cat.name] = existing.id;
      }
    }

    // 8. Seed Brands
    console.log('Seeding Brands...');
    const brandsData = [
      { name: 'E-Market Farms', slug: 'e-market-farms' },
      { name: 'Amul', slug: 'amul' },
      { name: 'Mother Dairy', slug: 'mother-dairy' },
      { name: 'E-Market Kitchen', slug: 'e-market-kitchen' },
    ];

    const insertedBrands: Record<string, string> = {};
    for (const brand of brandsData) {
      const existing = await db.query.brands.findFirst({
        where: (b, { eq }) => eq(b.slug, brand.slug),
      });

      if (!existing) {
        const [res] = await db.insert(schema.brands).values(brand).returning();
        insertedBrands[brand.name] = res.id;
      } else {
        insertedBrands[brand.name] = existing.id;
      }
    }

    // 9. Seed Sample Products & Variants
    console.log('Seeding Sample Products...');
    const productsData = [
      {
        name: 'Fresh Red Tomato',
        slug: 'fresh-red-tomato',
        sku: 'VEG-TOM-001',
        categoryName: 'Vegetables',
        brandName: 'E-Market Farms',
        description: 'Locally grown fresh organic tomatoes.',
        shortDescription: 'Farm fresh organic tomatoes.',
        images: ['/products/tomato.webp'],
        mrp: '50.00',
        sellingPrice: '40.00',
        costPrice: '25.00',
        stockType: 'kg',
        weightG: 1000,
        isVariableWeight: true,
        priceAdjustmentRule: { tolerancePercent: 15 },
        isFeatured: true,
      },
      {
        name: 'Organic Red Apple',
        slug: 'organic-red-apple',
        sku: 'FRT-APL-001',
        categoryName: 'Fruits',
        brandName: 'E-Market Farms',
        description: 'Crisp organic apples sourced from Shimla.',
        shortDescription: 'Sweet and crispy organic apples.',
        images: ['/products/apple.webp'],
        mrp: '150.00',
        sellingPrice: '120.00',
        costPrice: '80.00',
        stockType: 'kg',
        weightG: 1000,
        isVariableWeight: true,
        priceAdjustmentRule: { tolerancePercent: 10 },
        isFeatured: false,
      },
      {
        name: 'Full Cream Milk',
        slug: 'full-cream-milk',
        sku: 'DRY-MLK-001',
        categoryName: 'Dairy & Eggs',
        brandName: 'Amul',
        description: 'Fresh full cream pasteurized milk.',
        shortDescription: 'Amul Taaza full cream milk.',
        images: ['/products/milk.webp'],
        mrp: '33.00',
        sellingPrice: '30.00',
        costPrice: '26.00',
        stockType: 'pack',
        weightG: 500,
        isVariableWeight: false,
        isFeatured: true,
        variants: [
          { name: '500ml', sku: 'DRY-MLK-001-500', mrp: '33.00', sellingPrice: '30.00', costPrice: '26.00', weightG: 500 },
          { name: '1 Litre', sku: 'DRY-MLK-001-1L', mrp: '66.00', sellingPrice: '58.00', costPrice: '50.00', weightG: 1000 },
        ]
      },
      {
        name: 'Fresh Farm Eggs',
        slug: 'fresh-farm-eggs',
        sku: 'DRY-EGG-001',
        categoryName: 'Dairy & Eggs',
        brandName: 'E-Market Farms',
        description: 'High protein table eggs.',
        shortDescription: 'High quality white farm eggs.',
        images: ['/products/eggs.webp'],
        mrp: '50.00',
        sellingPrice: '42.00',
        costPrice: '30.00',
        stockType: 'box',
        weightG: 300,
        isVariableWeight: false,
        isFeatured: true,
      },
      {
        name: 'Fresh Raw Chicken Breast',
        slug: 'fresh-raw-chicken-breast',
        sku: 'MET-CHK-001',
        categoryName: 'Meats & Poultry',
        brandName: 'E-Market Farms',
        description: 'Skinless, boneless fresh chicken breast.',
        shortDescription: 'Skinless, boneless chicken breast meat.',
        images: ['/products/chicken.webp'],
        mrp: '260.00',
        sellingPrice: '220.00',
        costPrice: '160.00',
        stockType: 'kg',
        weightG: 1000,
        isVariableWeight: true,
        priceAdjustmentRule: { tolerancePercent: 20 },
        isFeatured: true,
      },
      {
        name: 'Butter Chicken Meal Box',
        slug: 'butter-chicken-meal-box',
        sku: 'KIT-BCM-001',
        categoryName: 'Cloud Kitchen',
        brandName: 'E-Market Kitchen',
        description: 'Rich creamy butter chicken served with 2 pieces of butter roti or rice.',
        shortDescription: 'Classic butter chicken meal combo.',
        images: ['/products/butter_chicken.webp'],
        mrp: '280.00',
        sellingPrice: '250.00',
        costPrice: '120.00',
        stockType: 'pack',
        weightG: 600,
        isVariableWeight: false,
        isFeatured: true,
      },
      {
        name: 'Keto Grilled Chicken Salad',
        slug: 'keto-grilled-chicken-salad',
        sku: 'KIT-KCS-001',
        categoryName: 'Healthy Meals',
        brandName: 'E-Market Kitchen',
        description: 'Grilled chicken strips, fresh lettuce, cucumbers, cherry tomatoes, and olive oil dressing.',
        shortDescription: 'Low carb healthy keto salad.',
        images: ['/products/keto_salad.webp'],
        mrp: '200.00',
        sellingPrice: '180.00',
        costPrice: '90.00',
        stockType: 'pack',
        weightG: 450,
        isVariableWeight: false,
        isFeatured: false,
      }
    ];

    for (const prod of productsData) {
      const existing = await db.query.products.findFirst({
        where: (p, { eq }) => eq(p.sku, prod.sku),
      });

      if (!existing) {
        const catId = insertedCategories[prod.categoryName];
        const brandId = insertedBrands[prod.brandName];
        const { variants, ...prodFields } = prod as any;

        const [newProd] = await db.insert(schema.products).values({
          businessId,
          categoryId: catId,
          brandId,
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
    }

    // 10. Seed Coupons
    console.log('Seeding Sample Coupons...');
    const couponsData = [
      {
        code: 'WELCOME100',
        discountType: 'fixed_amount',
        discountValue: '100.00',
        minOrderAmount: '499.00',
        maxDiscountAmount: '100.00',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-12-31'),
        usageLimit: 1000,
        perCustomerLimit: 1,
        isFirstOrderOnly: true,
        isActive: true,
      },
      {
        code: 'DAILYMILK',
        discountType: 'percentage',
        discountValue: '10.00',
        minOrderAmount: '0.00',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-12-31'),
        usageLimit: 5000,
        perCustomerLimit: 5,
        isSubscriptionOnly: true,
        isActive: true,
      }
    ];

    for (const coup of couponsData) {
      const existing = await db.query.coupons.findFirst({
        where: (c, { eq }) => eq(c.code, coup.code),
      });
      if (!existing) {
        await db.insert(schema.coupons).values({
          ...coup,
          applicableRules: {},
        });
      }
    }

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await pool.end();
  }
}

seed();
