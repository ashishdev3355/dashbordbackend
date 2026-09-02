const pool = require('../client');

// Initial products to migrate so no existing products are lost
const INITIAL_PRODUCTS = [
  {
    id: 'sku-complete-11',
    name: 'OBD Smart Pro • Complete 11 Cable Kit',
    slug: 'obd-smart-pro-complete-11-cable-kit',
    sku: 'SKU-COMP-11',
    short_description: 'Get the complete professional diagnostic setup. Includes our high-performance Bluetooth OBD smart adapter, the 11-cable set covering major Indian motorcycle brands, and a lifetime software license key for the mobile app.',
    full_description: 'Get the complete professional diagnostic setup. Includes our high-performance Bluetooth OBD smart adapter, the 11-cable set covering major Indian motorcycle brands, and a lifetime software license key for the mobile app.',
    category: 'Complete Kits',
    vehicle_type: 'bike',
    price: 12999,
    mrp: 15000,
    discount_percentage: 13,
    badge: 'Best Seller',
    images: [
      '/product_box.png',
      '/product_11_cables.png',
      '/product_adapter_only.png',
      '/product_app_only.png'
    ],
    features: [
      'Read & Clear Engine, FI & ABS Fault Codes',
      'Live graphical sensor telemetry tracking (RPM, Speed, Battery, etc.)',
      'Supports standard OBD modes 01, 02, 03, 04, 06, 07, 09, 0A',
      'Generate professional PDF diagnostics reports in 10+ regional languages',
      'Lifetime software license with no yearly subscription charges'
    ],
    specs: {
      'Cables Included': '11 Custom Adapter Cables',
      'License Type': 'Mobile App Lifetime Key (3 VINs)',
      'Interface': 'OBD-II (16-pin Male Bluetooth)',
      'Warranty': '1 Year Replacement Warranty',
      'Shipping': 'Free Insured Delivery'
    },
    includes: [
      'Smart Bluetooth OBD2 Adapter',
      '11 Dedicated Diagnostic Connecting Cables',
      'Mobile App Activation Card & License Key',
      'Semi-rigid EVA carrying case',
      'Setup guide and pin layout catalog'
    ],
    compatibility: 'Compatible with major Indian motorcycle brands: Bajaj, KTM, TVS, Honda, Suzuki, Yamaha, Royal Enfield, Hero, etc.',
    rating: 4.9,
    reviews: 184,
    stock: 50,
    status: 'published',
    sort_order: 1
  },
  {
    id: 'sku-complete-21',
    name: 'OBD Smart Pro • Complete 21 Cable Kit',
    slug: 'obd-smart-pro-complete-21-cable-kit',
    sku: 'SKU-COMP-21',
    short_description: 'Our ultimate diagnostic kit. Features the smart Bluetooth OBD adapter, the comprehensive 21-cable set covering standard bikes, electric scooters, and superbikes, plus the lifetime mobile app diagnostics license.',
    full_description: 'Our ultimate diagnostic kit. Features the smart Bluetooth OBD adapter, the comprehensive 21-cable set covering standard bikes, electric scooters, and superbikes, plus the lifetime mobile app diagnostics license.',
    category: 'Complete Kits',
    vehicle_type: 'bike',
    price: 14999,
    mrp: 18000,
    discount_percentage: 17,
    badge: 'Premium Pick',
    images: [
      '/product_box.png',
      '/product_21_cables.png',
      '/product_21_cables_list.jpg',
      '/product_adapter_only.png',
      '/product_app_only.png'
    ],
    features: [
      'All diagnostic features of the Pro Bike Scanner',
      'Full electric vehicle diagnostics (VCU, BMS, Motor Controller, etc.)',
      'Extended ECU scanning for Superbikes (IC, IMU, BCM, and more)',
      '21 adapter cables for universal motorcycle coverage',
      'Lifetime software access & weekly cloud database updates'
    ],
    specs: {
      'Cables Included': '21 Custom Adapter Cables',
      'License Type': 'Mobile App Lifetime Key (Unlimited VINs)',
      'Interface': 'OBD-II (16-pin Male Bluetooth)',
      'Warranty': '1 Year Replacement Warranty',
      'Shipping': 'Free Insured Delivery'
    },
    includes: [
      'Smart Bluetooth OBD2 Adapter',
      '21 Dedicated Diagnostic Connecting Cables',
      'Mobile App Activation Card & License Key',
      'Heavy-Duty Workshop Carrying Case',
      'Comprehensive Brand Mapping Manual'
    ],
    compatibility: 'Universal coverage: All standard OBD2 bikes, superbikes, and Indian electric scooters (Ather, Ola S1, Bajaj Chetak, Hero Vida, etc.).',
    rating: 5.0,
    reviews: 215,
    stock: 40,
    status: 'published',
    sort_order: 2
  },
  {
    id: 'sku-app-only',
    name: 'Only Mobile App License Key',
    slug: 'only-mobile-app-license-key',
    sku: 'SKU-APP-KEY',
    short_description: 'Lifetime software activation key for the OBD Smart Mobile Application. Unlocks full multi-brand bike diagnostic databases, live graphs, error code logs, and PDF workshop reporting. Instant delivery.',
    full_description: 'Lifetime software activation key for the OBD Smart Mobile Application. Unlocks full multi-brand bike diagnostic databases, live graphs, error code logs, and PDF workshop reporting. Instant delivery.',
    category: 'Parts & Software',
    vehicle_type: 'bike',
    price: 4999,
    mrp: 6000,
    discount_percentage: 17,
    badge: 'Instant Delivery',
    images: [
      '/product_app_only.png',
      '/product_license.png'
    ],
    features: [
      'Lifetime software code activation',
      'Zero monthly or annual recurring updates charge',
      'Supports English, Hindi, Tamil, Telugu, and 6+ regional languages',
      'Branded workshop reports with customized logo upload',
      'Requires separate Bluetooth OBD adapter to scan'
    ],
    specs: {
      'Delivery Format': 'Instant Digital Activation Key',
      'Platforms': 'Android 8.0+ / iOS 14.0+',
      'License Duration': 'Lifetime (includes 3 VIN updates)',
      'Update Cycle': 'Weekly database refresh'
    },
    includes: [
      'Unique Software License Activation Key',
      'Installation guide & companion download link'
    ],
    compatibility: 'Works with OBD Smart Bluetooth adapters or standard ELM327-based smart OBD adapters on compatible phones.',
    rating: 4.9,
    reviews: 135,
    stock: 999,
    status: 'published',
    sort_order: 3
  }
];

async function initProductTables() {
  try {
    // 1. Create or alter products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255),
        slug VARCHAR(255),
        sku VARCHAR(100),
        short_description TEXT,
        full_description TEXT,
        category VARCHAR(100) DEFAULT 'Complete Kits',
        vehicle_type VARCHAR(20) DEFAULT 'bike',
        price NUMERIC(10, 2) DEFAULT 0,
        mrp NUMERIC(10, 2) DEFAULT 0,
        discount_percentage NUMERIC(5, 2) DEFAULT 0,
        badge VARCHAR(100),
        images JSONB DEFAULT '[]'::jsonb,
        features JSONB DEFAULT '[]'::jsonb,
        specs JSONB DEFAULT '{}'::jsonb,
        includes JSONB DEFAULT '[]'::jsonb,
        compatibility TEXT DEFAULT '',
        rating NUMERIC(3, 2) DEFAULT 5.0,
        reviews INTEGER DEFAULT 0,
        stock INTEGER DEFAULT 100,
        status VARCHAR(20) DEFAULT 'published',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure all columns and defaults exist
    const alterColumns = [
      `ALTER TABLE products ALTER COLUMN id TYPE VARCHAR(100)`,
      `ALTER TABLE products ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE products ALTER COLUMN created_at DROP NOT NULL`,
      `ALTER TABLE products ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE products ALTER COLUMN updated_at DROP NOT NULL`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS name VARCHAR(255)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS slug VARCHAR(255)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description TEXT`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS full_description TEXT`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Complete Kits'`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20) DEFAULT 'bike'`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp NUMERIC(10, 2) DEFAULT 0`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS badge VARCHAR(100)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '{}'::jsonb`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS includes JSONB DEFAULT '[]'::jsonb`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS compatibility TEXT DEFAULT ''`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 5.0`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS reviews INTEGER DEFAULT 0`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 100`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published'`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`
    ];

    for (const sql of alterColumns) {
      try {
        await pool.query(sql);
      } catch (colErr) {
        // Ignore if constraint or type modification is skipped
      }
    }

    // 2. Create product audit logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_audit_logs (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        changed_by VARCHAR(255),
        changes JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Seed initial products if table is empty
    const checkRes = await pool.query('SELECT COUNT(*) as count FROM products WHERE name IS NOT NULL');
    if (parseInt(checkRes.rows[0].count, 10) === 0) {
      console.log('Migrating initial products into database...');
      for (const prod of INITIAL_PRODUCTS) {
        await pool.query(
          `INSERT INTO products (
            id, name, slug, sku, short_description, full_description,
            category, vehicle_type, price, mrp, discount_percentage,
            badge, images, features, specs, includes, compatibility,
            rating, reviews, stock, status, sort_order, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            price = EXCLUDED.price,
            mrp = EXCLUDED.mrp,
            discount_percentage = EXCLUDED.discount_percentage,
            badge = EXCLUDED.badge,
            images = EXCLUDED.images,
            features = EXCLUDED.features,
            specs = EXCLUDED.specs,
            includes = EXCLUDED.includes,
            compatibility = EXCLUDED.compatibility,
            status = EXCLUDED.status,
            sort_order = EXCLUDED.sort_order,
            updated_at = CURRENT_TIMESTAMP`,
          [
            prod.id,
            prod.name,
            prod.slug,
            prod.sku,
            prod.short_description,
            prod.full_description,
            prod.category,
            prod.vehicle_type,
            prod.price,
            prod.mrp,
            prod.discount_percentage,
            prod.badge,
            JSON.stringify(prod.images),
            JSON.stringify(prod.features),
            JSON.stringify(prod.specs),
            JSON.stringify(prod.includes),
            prod.compatibility,
            prod.rating,
            prod.reviews,
            prod.stock,
            prod.status,
            prod.sort_order
          ]
        );
      }
      console.log('Initial products migration completed successfully.');
    }
  } catch (error) {
    console.error('Error initializing product tables:', error);
  }
}

module.exports = {
  initProductTables,
  INITIAL_PRODUCTS
};
