import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  timestamp,
  boolean,
  time,
  date,
  jsonb,
  serial,
  primaryKey,
  foreignKey,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// -------------------------------------------------------------
// AUTH & RBAC TABLES
// -------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull(), // maps to auth.users.id
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  mobile: varchar('mobile', { length: 20 }).unique(),
  avatarUrl: text('avatar_url'),
  dob: date('dob'),
  preferences: jsonb('preferences').default({}),
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, blocked
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).unique().notNull(), // Super Admin, Admin, Store Manager, Order Manager, Inventory Manager, Delivery Manager, Customer Support, Kitchen Manager, Accounts Manager, Driver, Customer
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).unique().notNull(), // e.g. "products:create", "orders:update"
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rolePermissions = pgTable('role_permissions', {
  roleId: integer('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  permissionId: integer('permission_id').references(() => permissions.id, { onDelete: 'cascade' }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.roleId, t.permissionId] })
]);

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: integer('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.roleId] })
]);

// -------------------------------------------------------------
// MULTI-BUSINESS & STORES
// -------------------------------------------------------------

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  type: varchar('type', { length: 50 }).notNull(), // grocery, supermarket, cloud_kitchen, subscription, meal_plan, general
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, inactive
  settings: jsonb('settings').default({}).notNull(), // features configuration
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  pincode: varchar('pincode', { length: 10 }),
  latitude: numeric('latitude', { precision: 10, scale: 8 }),
  longitude: numeric('longitude', { precision: 11, scale: 8 }),
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, inactive
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// -------------------------------------------------------------
// CATALOG TABLES
// -------------------------------------------------------------

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, inactive
  parentId: uuid('parent_id'), // hierarchical categories for subcategories
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  unique('business_category_slug_idx').on(t.businessId, t.slug)
]);

// Set self-reference foreign key for subcategories
export const categoriesSelfRef = foreignKey({
  columns: [categories.parentId],
  foreignColumns: [categories.id],
  name: 'categories_parent_id_fkey'
});

export const brands = pgTable('brands', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  logoUrl: text('logo_url'),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }).unique().notNull(),
  barcode: varchar('barcode', { length: 100 }),
  categoryId: uuid('category_id').references(() => categories.id).notNull(),
  brandId: uuid('brand_id').references(() => brands.id),
  description: text('description'),
  shortDescription: text('short_description'),
  images: text('images').array(),
  videoUrl: text('video_url'),
  gstPercent: numeric('gst_percent', { precision: 5, scale: 2 }).default('0.00').notNull(),
  hsnCode: varchar('hsn_code', { length: 20 }),
  mrp: numeric('mrp', { precision: 12, scale: 2 }).notNull(),
  sellingPrice: numeric('selling_price', { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }),
  stockType: varchar('stock_type', { length: 20 }).default('piece').notNull(), // piece, kg, gram, litre, ml, pack, box, dozen
  weightG: integer('weight_g'), // Net weight in grams
  dimensions: jsonb('dimensions'), // width, height, depth
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, inactive, draft
  isFeatured: boolean('is_featured').default(false).notNull(),
  isBestSeller: boolean('is_best_seller').default(false).notNull(),
  isNewArrival: boolean('is_new_arrival').default(false).notNull(),
  seoTitle: varchar('seo_title', { length: 150 }),
  seoDescription: text('seo_description'),
  seoKeywords: text('seo_keywords'),
  isVariableWeight: boolean('is_variable_weight').default(false).notNull(),
  priceAdjustmentRule: jsonb('price_adjustment_rule'), // Rule config for packed weights
  dietType: varchar('diet_type', { length: 20 }), // veg, non-veg, eggitarian
  dietaryPreferences: text('dietary_preferences').array(), // Weight Loss, Gain Weight, Bulking, Post workout, Preworkout, Diabetic
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (t) => [
  unique('business_product_slug_idx').on(t.businessId, t.slug)
]);

export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(), // Size: M, Weight: 500g, etc.
  sku: varchar('sku', { length: 100 }).unique().notNull(),
  barcode: varchar('barcode', { length: 100 }),
  mrp: numeric('mrp', { precision: 12, scale: 2 }).notNull(),
  sellingPrice: numeric('selling_price', { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }),
  stock: integer('stock').default(0).notNull(),
  weightG: integer('weight_g'),
  images: text('images').array(),
  attributes: jsonb('attributes').default({}).notNull(), // attribute metadata e.g. {size: 'M', color: 'Red'}
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// -------------------------------------------------------------
// INVENTORY TABLES
// -------------------------------------------------------------

export const inventory = pgTable('inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
  physicalStock: integer('physical_stock').default(0).notNull(),
  reservedStock: integer('reserved_stock').default(0).notNull(),
  minStockThreshold: integer('min_stock_threshold').default(5).notNull(),
  maxStockThreshold: integer('max_stock_threshold').default(100).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  unique('store_product_variant_idx').on(t.storeId, t.productId, t.variantId)
]);

export const inventoryTransactions = pgTable('inventory_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  inventoryId: uuid('inventory_id').references(() => inventory.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 30 }).notNull(), // opening_stock, purchase, sale, return, damaged, wastage, adjustment, transfer
  quantity: integer('quantity').notNull(), // positive or negative
  referenceType: varchar('reference_type', { length: 50 }), // order, purchase_order, manual
  referenceId: uuid('reference_id'),
  userId: uuid('user_id').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  mobile: varchar('mobile', { length: 20 }).notNull(),
  gstin: varchar('gstin', { length: 20 }),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').references(() => stores.id).notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id).notNull(),
  purchaseNumber: varchar('purchase_number', { length: 50 }).unique().notNull(), // PUR-YYYYMMDD-XXXX
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, ordered, received, cancelled
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  invoiceDate: date('invoice_date'),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  paymentStatus: varchar('payment_status', { length: 20 }).default('unpaid').notNull(), // unpaid, partially_paid, paid
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const purchaseItems = pgTable('purchase_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  purchaseId: uuid('purchase_id').references(() => purchases.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  quantity: integer('quantity').notNull(),
  unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull(),
  taxPercent: numeric('tax_percent', { precision: 5, scale: 2 }).default('0.00').notNull(),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull(),
  totalCost: numeric('total_cost', { precision: 12, scale: 2 }).notNull(),
  batchNumber: varchar('batch_number', { length: 50 }),
  expiryDate: date('expiry_date'),
});

export const productBatches = pgTable('product_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
  batchNumber: varchar('batch_number', { length: 50 }).notNull(),
  manufacturingDate: date('manufacturing_date'),
  expiryDate: date('expiry_date').notNull(),
  quantity: integer('quantity').notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// -------------------------------------------------------------
// CUSTOMER & ADDRESS TABLES
// -------------------------------------------------------------

export const customerAddresses = pgTable('customer_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  recipientName: varchar('recipient_name', { length: 255 }).notNull(),
  recipientMobile: varchar('recipient_mobile', { length: 20 }).notNull(),
  houseFlat: varchar('house_flat', { length: 100 }).notNull(),
  building: varchar('building', { length: 255 }),
  street: varchar('street', { length: 255 }).notNull(),
  area: varchar('area', { length: 255 }),
  landmark: varchar('landmark', { length: 255 }),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  pincode: varchar('pincode', { length: 15 }).notNull(),
  country: varchar('country', { length: 100 }).default('India').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 8 }),
  longitude: numeric('longitude', { precision: 11, scale: 8 }),
  addressType: varchar('address_type', { length: 20 }).default('home').notNull(), // home, office, parents, friend, other
  deliveryInstructions: text('delivery_instructions'),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// -------------------------------------------------------------
// CART TABLES
// -------------------------------------------------------------

export const carts = pgTable('carts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cartItems = pgTable('cart_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartId: uuid('cart_id').references(() => carts.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  unique('cart_product_variant_idx').on(t.cartId, t.productId, t.variantId)
]);

// -------------------------------------------------------------
// DELIVERY SLOTS
// -------------------------------------------------------------

export const deliverySlots = pgTable('delivery_slots', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  maxOrders: integer('max_orders').default(20).notNull(), // Order cap limit
  minOrderAmount: numeric('min_order_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
  deliveryCharge: numeric('delivery_charge', { precision: 12, scale: 2 }).default('0.00').notNull(),
  availableDays: integer('available_days').array().notNull(), // e.g. [0,1,2,3,4,5,6] (0 = Sunday)
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// -------------------------------------------------------------
// ORDERS & FINANCIALS
// -------------------------------------------------------------

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').references(() => stores.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  orderNumber: varchar('order_number', { length: 50 }).unique().notNull(), // ORD-YYYYMMDD-XXXXXX
  invoiceNumber: varchar('invoice_number', { length: 50 }).unique(), // INV-YYYYMMDD-XXXXXX
  status: varchar('status', { length: 30 }).default('pending').notNull(), // pending, confirmed, payment_pending, payment_confirmed, processing, preparing, packed, ready_for_pickup, out_for_delivery, delivered, cancelled, return_requested, return_approved, return_picked_up, returned, refund_pending, refund_completed, failed
  paymentStatus: varchar('payment_status', { length: 20 }).default('pending').notNull(), // pending, paid, failed, refunded, partially_refunded
  paymentMethod: varchar('payment_method', { length: 20 }).notNull(), // cod, upi, card, netbanking, wallet
  shippingAddressId: uuid('shipping_address_id').references(() => customerAddresses.id),
  deliverySlotId: uuid('delivery_slot_id').references(() => deliverySlots.id),
  deliveryDate: date('delivery_date').notNull(),
  isGift: boolean('is_gift').default(false).notNull(),
  recipientName: varchar('recipient_name', { length: 255 }),
  recipientMobile: varchar('recipient_mobile', { length: 20 }),
  giftMessage: text('gift_message'),
  deliveryInstructions: text('delivery_instructions'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
  deliveryCharge: numeric('delivery_charge', { precision: 12, scale: 2 }).default('0.00').notNull(),
  packagingFee: numeric('packaging_fee', { precision: 12, scale: 2 }).default('0.00').notNull(),
  convenienceFee: numeric('convenience_fee', { precision: 12, scale: 2 }).default('0.00').notNull(),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  couponCode: varchar('coupon_code', { length: 50 }),
  actualPackedWeightG: integer('actual_packed_weight_g'), // Sum of final packed weights
  priceAdjustmentAmount: numeric('price_adjustment_amount', { precision: 12, scale: 2 }).default('0.00'), // For variable weight differences
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  quantity: integer('quantity').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(), // MRP or standard unit price
  taxPercent: numeric('tax_percent', { precision: 5, scale: 2 }).default('0.00').notNull(),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
  actualWeightG: integer('actual_weight_g'), // Recorded packed weight (e.g. 1080g instead of 1000g)
  finalPrice: numeric('final_price', { precision: 12, scale: 2 }).notNull(), // Selling price * quantity
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderStatusHistory = pgTable('order_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 30 }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  paymentNumber: varchar('payment_number', { length: 50 }).unique().notNull(), // PAY-YYYYMMDD-XXXXXX
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, captured, failed, refunded
  gateway: varchar('gateway', { length: 50 }).notNull(), // razorpay, cod, etc.
  gatewayTransactionId: varchar('gateway_transaction_id', { length: 150 }),
  paymentMethod: varchar('payment_method', { length: 20 }), // upi, card, netbanking, wallet, cash
  rawPayload: jsonb('raw_payload'), // logs from gateway responses
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const coupons = pgTable('coupons', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  discountType: varchar('discount_type', { length: 20 }).notNull(), // percentage, fixed_amount
  discountValue: numeric('discount_value', { precision: 12, scale: 2 }).notNull(),
  minOrderAmount: numeric('min_order_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
  maxDiscountAmount: numeric('max_discount_amount', { precision: 12, scale: 2 }),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  usageLimit: integer('usage_limit'), // Total times this coupon can be used
  perCustomerLimit: integer('per_customer_limit').default(1).notNull(),
  isFirstOrderOnly: boolean('is_first_order_only').default(false).notNull(),
  isSubscriptionOnly: boolean('is_subscription_only').default(false).notNull(),
  applicableRules: jsonb('applicable_rules').default({}).notNull(), // e.g. {categories: [], products: []}
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const couponUsages = pgTable('coupon_usages', {
  id: uuid('id').primaryKey().defaultRandom(),
  couponId: uuid('coupon_id').references(() => coupons.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const offers = pgTable('offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 30 }).notNull(), // flash_sale, weekend_sale, combo, buy_x_get_y
  config: jsonb('config').default({}).notNull(), // rules configurations
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const wishlists = pgTable('wishlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  unique('user_wishlist_product_idx').on(t.userId, t.productId)
]);

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  orderId: uuid('order_id').references(() => orders.id),
  rating: integer('rating').notNull(), // 1 to 5
  reviewText: text('review_text'),
  images: text('images').array(),
  isVerifiedPurchase: boolean('is_verified_purchase').default(false).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, approved, rejected
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const returns = pgTable('returns', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  returnNumber: varchar('return_number', { length: 50 }).unique().notNull(), // RET-YYYYMMDD-XXXX
  status: varchar('status', { length: 30 }).default('requested').notNull(), // requested, under_review, approved, rejected, pickup_scheduled, picked_up, received, inspected, completed
  reason: varchar('reason', { length: 255 }).notNull(),
  description: text('description'),
  images: text('images').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const returnItems = pgTable('return_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  returnId: uuid('return_id').references(() => returns.id, { onDelete: 'cascade' }).notNull(),
  orderItemId: uuid('order_item_id').references(() => orderItems.id).notNull(),
  quantity: integer('quantity').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, approved, rejected
});

export const refunds = pgTable('refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  paymentId: uuid('payment_id').references(() => payments.id).notNull(),
  returnId: uuid('return_id').references(() => returns.id),
  refundNumber: varchar('refund_number', { length: 50 }).unique().notNull(), // REF-YYYYMMDD-XXXX
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, processing, completed, failed
  gatewayRefundId: varchar('gateway_refund_id', { length: 150 }),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// -------------------------------------------------------------
// SUBSCRIPTIONS SYSTEM
// -------------------------------------------------------------

export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  billingFrequency: varchar('billing_frequency', { length: 20 }).default('monthly').notNull(), // daily, weekly, monthly
  durationDays: integer('duration_days').notNull(), // e.g. 30, 90, 365
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const subscriptionPlanItems = pgTable('subscription_plan_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').references(() => subscriptionPlans.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  planId: uuid('plan_id').references(() => subscriptionPlans.id),
  storeId: uuid('store_id').references(() => stores.id).notNull(),
  status: varchar('status', { length: 30 }).default('active').notNull(), // active, paused, cancelled, expired, payment_failed, pending_renewal
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  billingFrequency: varchar('billing_frequency', { length: 20 }).notNull(), // daily, weekly, monthly
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  deliveryDays: integer('delivery_days').array().notNull(), // e.g. [1, 3, 5] (Monday, Wednesday, Friday)
  deliveryTimeSlotId: uuid('delivery_time_slot_id').references(() => deliverySlots.id),
  shippingAddressId: uuid('shipping_address_id').references(() => customerAddresses.id),
  autoRenew: boolean('auto_renew').default(true).notNull(),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const subscriptionItems = pgTable('subscription_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  quantity: integer('quantity').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const subscriptionDeliveries = pgTable('subscription_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'cascade' }).notNull(),
  orderId: uuid('order_id').references(() => orders.id), // Generated order for this delivery
  deliveryDate: date('delivery_date').notNull(),
  status: varchar('status', { length: 20 }).default('scheduled').notNull(), // scheduled, skipped, delivered, cancelled
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dietProfiles = pgTable('diet_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),
  dietPreference: varchar('diet_preference', { length: 30 }).notNull(), // veg, non-veg, eggitarian
  allergies: text('allergies').array(),
  dietaryPreferences: text('dietary_preferences').array(), // keto, low-carb, vegan, etc.
  calorieTarget: integer('calorie_target'),
  mealPreference: jsonb('meal_preference').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// -------------------------------------------------------------
// DELIVERY WORKFLOW TABLES
// -------------------------------------------------------------

export const drivers = pgTable('drivers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  vehicleNumber: varchar('vehicle_number', { length: 50 }).notNull(),
  vehicleType: varchar('vehicle_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, inactive, on_delivery
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const deliveries = pgTable('deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id),
  subscriptionDeliveryId: uuid('subscription_delivery_id').references(() => subscriptionDeliveries.id),
  deliveryNumber: varchar('delivery_number', { length: 50 }).unique().notNull(),
  driverId: uuid('driver_id').references(() => drivers.id),
  status: varchar('status', { length: 20 }).default('assigned').notNull(), // assigned, picked_up, out_for_delivery, delivered, failed
  pickupTime: timestamp('pickup_time'),
  deliveryTime: timestamp('delivery_time'),
  proofOfDeliveryImage: text('proof_of_delivery_image'),
  otpConfirmationCode: varchar('otp_confirmation_code', { length: 10 }),
  deliveryNotes: text('delivery_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// -------------------------------------------------------------
// SYSTEM NOTIFICATIONS & LOGS
// -------------------------------------------------------------

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 30 }).default('order').notNull(), // order, payment, subscription, offer, support
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  recipient: varchar('recipient', { length: 255 }).notNull(), // email address or phone number
  type: varchar('type', { length: 20 }).notNull(), // whatsapp, email, sms, push
  templateName: varchar('template_name', { length: 100 }).notNull(),
  payload: jsonb('payload').default({}).notNull(),
  status: varchar('status', { length: 20 }).default('sent').notNull(), // pending, sent, failed
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(), // e.g. "order.status_changed", "product.deleted"
  entity: varchar('entity', { length: 100 }).notNull(), // e.g. "orders", "products"
  entityId: uuid('entity_id').notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).unique().notNull(), // e.g. "business_info", "delivery_rules"
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// -------------------------------------------------------------
// DRIZZLE TS RELATIONSHIPS DEF
// -------------------------------------------------------------

export const usersRelations = relations(users, ({ many, one }) => ({
  userRoles: many(userRoles),
  addresses: many(customerAddresses),
  cart: one(carts, {
    fields: [users.id],
    references: [carts.userId]
  }),
  orders: many(orders),
  subscriptions: many(subscriptions),
  notifications: many(notifications),
  dietProfile: one(dietProfiles, {
    fields: [users.id],
    references: [dietProfiles.userId]
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id]
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id]
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id]
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id]
  }),
}));

export const productsRelations = relations(products, ({ many, one }) => ({
  business: one(businesses, {
    fields: [products.businessId],
    references: [businesses.id]
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id]
  }),
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id]
  }),
  variants: many(productVariants),
  inventory: many(inventory),
  orderItems: many(orderItems),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id]
  }),
  inventory: many(inventory),
  orderItems: many(orderItems),
}));

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
  store: one(stores, {
    fields: [inventory.storeId],
    references: [stores.id]
  }),
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id]
  }),
  variant: one(productVariants, {
    fields: [inventory.variantId],
    references: [productVariants.id]
  }),
  transactions: many(inventoryTransactions),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  inventory: one(inventory, {
    fields: [inventoryTransactions.inventoryId],
    references: [inventory.id]
  }),
  user: one(users, {
    fields: [inventoryTransactions.userId],
    references: [users.id]
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  business: one(businesses, {
    fields: [categories.businessId],
    references: [businesses.id]
  }),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'subcategory'
  }),
  subcategories: many(categories, {
    relationName: 'subcategory'
  }),
  products: many(products),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id]
  }),
  store: one(stores, {
    fields: [orders.storeId],
    references: [stores.id]
  }),
  shippingAddress: one(customerAddresses, {
    fields: [orders.shippingAddressId],
    references: [customerAddresses.id]
  }),
  deliverySlot: one(deliverySlots, {
    fields: [orders.deliverySlotId],
    references: [deliverySlots.id]
  }),
  items: many(orderItems),
  payments: many(payments),
  statusHistory: many(orderStatusHistory),
  deliveries: many(deliveries),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id]
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id]
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id]
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id]
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id]
  }),
  plan: one(subscriptionPlans, {
    fields: [subscriptions.planId],
    references: [subscriptionPlans.id]
  }),
  store: one(stores, {
    fields: [subscriptions.storeId],
    references: [stores.id]
  }),
  deliverySlot: one(deliverySlots, {
    fields: [subscriptions.deliveryTimeSlotId],
    references: [deliverySlots.id]
  }),
  shippingAddress: one(customerAddresses, {
    fields: [subscriptions.shippingAddressId],
    references: [customerAddresses.id]
  }),
  items: many(subscriptionItems),
  deliveries: many(subscriptionDeliveries),
}));

export const subscriptionItemsRelations = relations(subscriptionItems, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [subscriptionItems.subscriptionId],
    references: [subscriptions.id]
  }),
  product: one(products, {
    fields: [subscriptionItems.productId],
    references: [products.id]
  }),
  variant: one(productVariants, {
    fields: [subscriptionItems.variantId],
    references: [productVariants.id]
  }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id]
  }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id]
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id]
  }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id]
  }),
}));
