import dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log('Seeding custom subscription plans and tagging products...');
  try {
    const { db } = await import('../lib/db');
    const { subscriptionPlans, products } = await import('../lib/db/schema');
    const { eq, inArray } = await import('drizzle-orm');

    // 1. Fetch business
    const business = await db.query.businesses.findFirst();
    if (!business) {
      console.error('No business found to link subscription plans.');
      process.exit(1);
    }

    // 2. Clear existing subscription plans to avoid duplication
    await db.delete(subscriptionPlans);

    // 3. Insert the 3 custom plans
    console.log('Inserting plans...');
    const [smallPlan] = await db.insert(subscriptionPlans).values({
      businessId: business.id,
      name: 'Small Family Weekly Basket',
      description: 'Perfect for a family of 3. Includes 1kg Onions, 1kg Tomatoes, 200g Green Chillies, 1 Garnish choice, 3 Seasonal choices (500g each), 2 Vegetable choices (250g each), and 2 Leafy greens.',
      price: '249.00',
      billingFrequency: 'weekly',
      durationDays: 7,
      isActive: true,
    }).returning();

    const [mediumPlan] = await db.insert(subscriptionPlans).values({
      businessId: business.id,
      name: 'Medium Family Weekly Basket',
      description: 'Ideal for a family of 4. Includes 1.5kg Onions, 1.5kg Tomatoes, 250g Green Chillies, 2 Garnish choices, 4 Seasonal choices (500g each), 3 Vegetable choices (250g each), and 3 Leafy greens.',
      price: '349.00',
      billingFrequency: 'weekly',
      durationDays: 7,
      isActive: true,
    }).returning();

    const [moderatePlan] = await db.insert(subscriptionPlans).values({
      businessId: business.id,
      name: 'Moderate Family Weekly Basket',
      description: 'Ideal for a family of 6-8. Includes 3kg Onions, 3kg Tomatoes, 500g Green Chillies, 3 Garnish choices, 5 Seasonal choices (1kg/500g each), 4 Vegetable choices (250g/500g each), and 4 Leafy greens.',
      price: '549.00',
      billingFrequency: 'weekly',
      durationDays: 7,
      isActive: true,
    }).returning();

    console.log('✅ Subscription plans seeded successfully.');

    // 4. Tag sample vegetables in the database
    console.log('Tagging vegetables with subscription categories...');
    
    // Fixed Essentials
    await db.update(products)
      .set({ subscriptionCategory: 'fixed' })
      .where(inArray(products.slug, ['fresh-onion', 'tomato-hybrid', 'green-chillies', 'onion-hybrid', 'fresh-potatoes-aloo', 'fresh-potatoes']));

    // Garnish choices (Lemon, Coriander, Curry leaves)
    await db.update(products)
      .set({ subscriptionCategory: 'garnish' })
      .where(inArray(products.slug, ['fresh-lemon', 'coriander-leaves', 'mint-leaves', 'lemon-hybrid', 'fresh-coriander']));

    // Seasonal veggie choices (Potato, Lady Finger, Capsicum, Carrot)
    await db.update(products)
      .set({ subscriptionCategory: 'seasonal' })
      .where(inArray(products.slug, ['lady-finger-bhindi', 'bhindi', 'capsicum-green', 'carrot-local', 'cauliflower', 'cabbage']));

    // Cooking veggies choices (Ginger, Garlic, French Beans)
    await db.update(products)
      .set({ subscriptionCategory: 'cooking' })
      .where(inArray(products.slug, ['ginger-local', 'garlic-local', 'french-beans', 'raw-banana', 'brinjal-bottle']));

    // Leafy Greens (Spinach, Methi)
    await db.update(products)
      .set({ subscriptionCategory: 'leafy' })
      .where(inArray(products.slug, ['palak-spinach', 'methi-leaves', 'spinach-local']));

    console.log('✅ Vegetables tagged with subscription categories successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed subscription plans:', err);
    process.exit(1);
  }
}

main();
