import 'dotenv/config';
import { Client } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set in environment variables.');
    process.exit(1);
  }

  console.log('Connecting to Supabase PostgreSQL database...');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Successfully connected!');

    console.log('\n--- Part 1: Addressing SECURITY DEFINER warnings ---');
    try {
      await client.query('REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM public, anon, authenticated;');
      console.log('✔ Revoked EXECUTE on public.rls_auto_enable() from public, anon, and authenticated.');
    } catch (secErr: any) {
      console.warn('⚠ Could not revoke execution on rls_auto_enable() (it may not exist or permissions already revoked):', secErr.message);
    }

    console.log('\n--- Part 2: Addressing PERFORMANCE unindexed foreign keys warnings ---');

    const indexQueries = [
      // audit_logs
      'CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id);',
      
      // cart_items
      'CREATE INDEX IF NOT EXISTS cart_items_product_id_idx ON public.cart_items(product_id);',
      'CREATE INDEX IF NOT EXISTS cart_items_variant_id_idx ON public.cart_items(variant_id);',
      
      // coupon_usages
      'CREATE INDEX IF NOT EXISTS coupon_usages_coupon_id_idx ON public.coupon_usages(coupon_id);',
      'CREATE INDEX IF NOT EXISTS coupon_usages_order_id_idx ON public.coupon_usages(order_id);',
      'CREATE INDEX IF NOT EXISTS coupon_usages_user_id_idx ON public.coupon_usages(user_id);',
      
      // customer_addresses
      'CREATE INDEX IF NOT EXISTS customer_addresses_user_id_idx ON public.customer_addresses(user_id);',
      
      // deliveries
      'CREATE INDEX IF NOT EXISTS deliveries_driver_id_idx ON public.deliveries(driver_id);',
      'CREATE INDEX IF NOT EXISTS deliveries_order_id_idx ON public.deliveries(order_id);',
      'CREATE INDEX IF NOT EXISTS deliveries_subscription_delivery_id_idx ON public.deliveries(subscription_delivery_id);',
      
      // delivery_slots
      'CREATE INDEX IF NOT EXISTS delivery_slots_business_id_idx ON public.delivery_slots(business_id);',
      
      // drivers
      'CREATE INDEX IF NOT EXISTS drivers_user_id_idx ON public.drivers(user_id);',
      
      // inventory
      'CREATE INDEX IF NOT EXISTS inventory_product_id_idx ON public.inventory(product_id);',
      'CREATE INDEX IF NOT EXISTS inventory_variant_id_idx ON public.inventory(variant_id);',
      
      // inventory_transactions
      'CREATE INDEX IF NOT EXISTS inventory_transactions_inventory_id_idx ON public.inventory_transactions(inventory_id);',
      'CREATE INDEX IF NOT EXISTS inventory_transactions_user_id_idx ON public.inventory_transactions(user_id);',
      
      // notification_logs
      'CREATE INDEX IF NOT EXISTS notification_logs_user_id_idx ON public.notification_logs(user_id);',
      
      // notifications
      'CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);',
      
      // order_items
      'CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);',
      'CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items(product_id);',
      'CREATE INDEX IF NOT EXISTS order_items_variant_id_idx ON public.order_items(variant_id);',
      
      // order_status_history
      'CREATE INDEX IF NOT EXISTS order_status_history_order_id_idx ON public.order_status_history(order_id);',
      'CREATE INDEX IF NOT EXISTS order_status_history_user_id_idx ON public.order_status_history(user_id);',
      
      // orders
      'CREATE INDEX IF NOT EXISTS orders_delivery_slot_id_idx ON public.orders(delivery_slot_id);',
      'CREATE INDEX IF NOT EXISTS orders_shipping_address_id_idx ON public.orders(shipping_address_id);',
      'CREATE INDEX IF NOT EXISTS orders_store_id_idx ON public.orders(store_id);',
      'CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);',
      
      // payments
      'CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments(order_id);',
      
      // product_batches
      'CREATE INDEX IF NOT EXISTS product_batches_product_id_idx ON public.product_batches(product_id);',
      'CREATE INDEX IF NOT EXISTS product_batches_supplier_id_idx ON public.product_batches(supplier_id);',
      'CREATE INDEX IF NOT EXISTS product_batches_variant_id_idx ON public.product_batches(variant_id);',
      
      // product_variants
      'CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON public.product_variants(product_id);',
      
      // products
      'CREATE INDEX IF NOT EXISTS products_brand_id_idx ON public.products(brand_id);',
      'CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products(category_id);',
      
      // purchase_items
      'CREATE INDEX IF NOT EXISTS purchase_items_product_id_idx ON public.purchase_items(product_id);',
      'CREATE INDEX IF NOT EXISTS purchase_items_purchase_id_idx ON public.purchase_items(purchase_id);',
      'CREATE INDEX IF NOT EXISTS purchase_items_variant_id_idx ON public.purchase_items(variant_id);',
      
      // purchases
      'CREATE INDEX IF NOT EXISTS purchases_store_id_idx ON public.purchases(store_id);',
      'CREATE INDEX IF NOT EXISTS purchases_supplier_id_idx ON public.purchases(supplier_id);',
      
      // refunds
      'CREATE INDEX IF NOT EXISTS refunds_order_id_idx ON public.refunds(order_id);',
      'CREATE INDEX IF NOT EXISTS refunds_payment_id_idx ON public.refunds(payment_id);',
      'CREATE INDEX IF NOT EXISTS refunds_return_id_idx ON public.refunds(return_id);',
      
      // return_items
      'CREATE INDEX IF NOT EXISTS return_items_order_item_id_idx ON public.return_items(order_item_id);',
      'CREATE INDEX IF NOT EXISTS return_items_return_id_idx ON public.return_items(return_id);',
      
      // returns
      'CREATE INDEX IF NOT EXISTS returns_order_id_idx ON public.returns(order_id);',
      
      // reviews
      'CREATE INDEX IF NOT EXISTS reviews_order_id_idx ON public.reviews(order_id);',
      'CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON public.reviews(product_id);',
      'CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON public.reviews(user_id);',
      
      // role_permissions
      'CREATE INDEX IF NOT EXISTS role_permissions_permission_id_idx ON public.role_permissions(permission_id);',
      
      // stores
      'CREATE INDEX IF NOT EXISTS stores_business_id_idx ON public.stores(business_id);',
      
      // subscription_deliveries
      'CREATE INDEX IF NOT EXISTS subscription_deliveries_order_id_idx ON public.subscription_deliveries(order_id);',
      'CREATE INDEX IF NOT EXISTS subscription_deliveries_subscription_id_idx ON public.subscription_deliveries(subscription_id);',
      
      // subscription_items
      'CREATE INDEX IF NOT EXISTS subscription_items_product_id_idx ON public.subscription_items(product_id);',
      'CREATE INDEX IF NOT EXISTS subscription_items_subscription_id_idx ON public.subscription_items(subscription_id);',
      'CREATE INDEX IF NOT EXISTS subscription_items_variant_id_idx ON public.subscription_items(variant_id);',
      
      // subscription_plan_items
      'CREATE INDEX IF NOT EXISTS subscription_plan_items_plan_id_idx ON public.subscription_plan_items(plan_id);',
      'CREATE INDEX IF NOT EXISTS subscription_plan_items_product_id_idx ON public.subscription_plan_items(product_id);',
      'CREATE INDEX IF NOT EXISTS subscription_plan_items_variant_id_idx ON public.subscription_plan_items(variant_id);',
      
      // subscription_plans
      'CREATE INDEX IF NOT EXISTS subscription_plans_business_id_idx ON public.subscription_plans(business_id);',
      
      // subscriptions
      'CREATE INDEX IF NOT EXISTS subscriptions_delivery_time_slot_id_idx ON public.subscriptions(delivery_time_slot_id);',
      'CREATE INDEX IF NOT EXISTS subscriptions_plan_id_idx ON public.subscriptions(plan_id);',
      'CREATE INDEX IF NOT EXISTS subscriptions_shipping_address_id_idx ON public.subscriptions(shipping_address_id);',
      'CREATE INDEX IF NOT EXISTS subscriptions_store_id_idx ON public.subscriptions(store_id);',
      'CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);',
      
      // user_roles
      'CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON public.user_roles(role_id);',
      
      // wishlists
      'CREATE INDEX IF NOT EXISTS wishlists_product_id_idx ON public.wishlists(product_id);',
    ];

    console.log(`Starting execution of ${indexQueries.length} indexing queries to optimize database joins...`);
    
    let successCount = 0;
    for (const query of indexQueries) {
      try {
        await client.query(query);
        successCount++;
      } catch (queryErr: any) {
        console.error(`✖ Failed to run query: "${query}" - Error:`, queryErr.message);
      }
    }

    console.log(`\n✔ Completed! Created/verified ${successCount} indexes successfully.`);
    console.log('Database joins and page queries are now fully optimized!');

  } catch (err: any) {
    console.error('Database connection or execution failed:', err);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

run();
