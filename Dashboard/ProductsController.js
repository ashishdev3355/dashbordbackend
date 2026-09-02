const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../client');

// Multer storage setup for persistent product image uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|svg|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG, PNG, WEBP, SVG, GIF) are allowed'));
  }
});

// Helper: Calculate discount percentage
function calculateDiscount(price, mrp) {
  const numPrice = parseFloat(price) || 0;
  const numMrp = parseFloat(mrp) || 0;
  if (numMrp > numPrice && numMrp > 0) {
    return Math.round(((numMrp - numPrice) / numMrp) * 100);
  }
  return 0;
}

// Helper: Format product row for API responses
function formatProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku || '',
    short_description: row.short_description || '',
    full_description: row.full_description || '',
    description: row.short_description || row.full_description || '', // Compatibility with shop frontend
    category: row.category,
    vehicle_type: row.vehicle_type,
    price: parseFloat(row.price),
    originalPrice: row.mrp ? parseFloat(row.mrp) : undefined, // Compatibility with shop frontend
    mrp: parseFloat(row.mrp || 0),
    discount_percentage: parseFloat(row.discount_percentage || 0),
    badge: row.badge || undefined,
    images: typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || []),
    features: typeof row.features === 'string' ? JSON.parse(row.features) : (row.features || []),
    specs: typeof row.specs === 'string' ? JSON.parse(row.specs) : (row.specs || {}),
    includes: typeof row.includes === 'string' ? JSON.parse(row.includes) : (row.includes || []),
    compatibility: row.compatibility || '',
    rating: parseFloat(row.rating || 5.0),
    reviews: parseInt(row.reviews || 0, 10),
    stock: parseInt(row.stock || 0, 10),
    status: row.status,
    sort_order: parseInt(row.sort_order || 0, 10),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

// Helper: Audit logger
async function logAudit(productId, action, changedBy, changes) {
  try {
    await pool.query(
      `INSERT INTO product_audit_logs (product_id, action, changed_by, changes) VALUES ($1, $2, $3, $4)`,
      [productId, action, changedBy || 'Admin', JSON.stringify(changes)]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// ==========================================
// PUBLIC CONTROLLERS (Read-Only)
// ==========================================

async function getPublicProducts(req, res) {
  try {
    const { vehicle_type, category } = req.query;
    let query = `SELECT * FROM products WHERE status = 'published'`;
    const params = [];

    if (vehicle_type) {
      params.push(vehicle_type);
      query += ` AND (vehicle_type = $${params.length} OR vehicle_type = 'both')`;
    }

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    query += ` ORDER BY sort_order ASC, created_at ASC`;

    const result = await pool.query(query, params);
    const formatted = result.rows.map(formatProduct);
    res.json(formatted);
  } catch (err) {
    console.error('getPublicProducts error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}

async function getPublicProductByIdOrSlug(req, res) {
  try {
    const { idOrSlug } = req.params;
    const result = await pool.query(
      `SELECT * FROM products WHERE (id = $1 OR slug = $1) AND status = 'published' LIMIT 1`,
      [idOrSlug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(formatProduct(result.rows[0]));
  } catch (err) {
    console.error('getPublicProductByIdOrSlug error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
}

// ==========================================
// ADMIN CONTROLLERS (Protected CRUD)
// ==========================================

async function getAdminProducts(req, res) {
  try {
    const { search, category, vehicle_type, status, stock_status } = req.query;
    let query = `SELECT * FROM products WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (name ILIKE $${params.length} OR sku ILIKE $${params.length} OR short_description ILIKE $${params.length})`;
    }

    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (vehicle_type && vehicle_type !== 'all') {
      params.push(vehicle_type);
      query += ` AND vehicle_type = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (stock_status === 'in_stock') {
      query += ` AND stock > 0`;
    } else if (stock_status === 'out_of_stock') {
      query += ` AND stock <= 0`;
    }

    query += ` ORDER BY sort_order ASC, created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows.map(formatProduct));
  } catch (err) {
    console.error('getAdminProducts error:', err);
    res.status(500).json({ error: 'Failed to fetch admin products' });
  }
}

async function getAdminProductById(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM products WHERE id = $1 LIMIT 1`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(formatProduct(result.rows[0]));
  } catch (err) {
    console.error('getAdminProductById error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
}

async function createProduct(req, res) {
  try {
    const {
      id,
      name,
      slug,
      sku,
      short_description,
      full_description,
      category,
      vehicle_type,
      price,
      mrp,
      badge,
      images,
      features,
      specs,
      includes,
      compatibility,
      rating,
      reviews,
      stock,
      status,
      sort_order
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Product name and price are required' });
    }

    const prodId = id && id.trim() ? id.trim() : `prod-${Date.now()}`;
    const generatedSlug = slug && slug.trim() 
      ? slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') 
      : name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

    // Check slug uniqueness
    const slugCheck = await pool.query('SELECT id FROM products WHERE slug = $1', [generatedSlug]);
    const finalSlug = slugCheck.rows.length > 0 ? `${generatedSlug}-${Date.now()}` : generatedSlug;

    const discountPercentage = calculateDiscount(price, mrp);

    const insertQuery = `
      INSERT INTO products (
        id, name, slug, sku, short_description, full_description,
        category, vehicle_type, price, mrp, discount_percentage,
        badge, images, features, specs, includes, compatibility,
        rating, reviews, stock, status, sort_order, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      prodId,
      name,
      finalSlug,
      sku || '',
      short_description || '',
      full_description || short_description || '',
      category || 'Complete Kits',
      vehicle_type || 'bike',
      parseFloat(price) || 0,
      parseFloat(mrp) || parseFloat(price) || 0,
      discountPercentage,
      badge || null,
      JSON.stringify(images || []),
      JSON.stringify(features || []),
      JSON.stringify(specs || {}),
      JSON.stringify(includes || []),
      compatibility || '',
      parseFloat(rating) || 5.0,
      parseInt(reviews, 10) || 0,
      parseInt(stock, 10) || 0,
      status || 'published',
      parseInt(sort_order, 10) || 0
    ];

    const result = await pool.query(insertQuery, values);
    const createdProduct = formatProduct(result.rows[0]);

    await logAudit(prodId, 'CREATE', req.user?.email || 'Admin', createdProduct);

    res.status(201).json({
      message: 'Product created successfully',
      product: createdProduct
    });
  } catch (err) {
    console.error('createProduct error:', err);
    res.status(500).json({ error: err.message || 'Failed to create product' });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      sku,
      short_description,
      full_description,
      category,
      vehicle_type,
      price,
      mrp,
      badge,
      images,
      features,
      specs,
      includes,
      compatibility,
      rating,
      reviews,
      stock,
      status,
      sort_order
    } = req.body;

    const existingRes = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const discountPercentage = calculateDiscount(price, mrp);

    let finalSlug = slug || existingRes.rows[0].slug;
    if (slug && slug !== existingRes.rows[0].slug) {
      const slugCheck = await pool.query('SELECT id FROM products WHERE slug = $1 AND id != $2', [slug, id]);
      if (slugCheck.rows.length > 0) {
        finalSlug = `${slug}-${Date.now()}`;
      }
    }

    const updateQuery = `
      UPDATE products SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        sku = COALESCE($3, sku),
        short_description = COALESCE($4, short_description),
        full_description = COALESCE($5, full_description),
        category = COALESCE($6, category),
        vehicle_type = COALESCE($7, vehicle_type),
        price = COALESCE($8, price),
        mrp = COALESCE($9, mrp),
        discount_percentage = $10,
        badge = $11,
        images = COALESCE($12, images),
        features = COALESCE($13, features),
        specs = COALESCE($14, specs),
        includes = COALESCE($15, includes),
        compatibility = COALESCE($16, compatibility),
        rating = COALESCE($17, rating),
        reviews = COALESCE($18, reviews),
        stock = COALESCE($19, stock),
        status = COALESCE($20, status),
        sort_order = COALESCE($21, sort_order),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $22
      RETURNING *
    `;

    const values = [
      name,
      finalSlug,
      sku,
      short_description,
      full_description,
      category,
      vehicle_type,
      price !== undefined ? parseFloat(price) : null,
      mrp !== undefined ? parseFloat(mrp) : null,
      discountPercentage,
      badge !== undefined ? badge : existingRes.rows[0].badge,
      images ? JSON.stringify(images) : null,
      features ? JSON.stringify(features) : null,
      specs ? JSON.stringify(specs) : null,
      includes ? JSON.stringify(includes) : null,
      compatibility,
      rating !== undefined ? parseFloat(rating) : null,
      reviews !== undefined ? parseInt(reviews, 10) : null,
      stock !== undefined ? parseInt(stock, 10) : null,
      status,
      sort_order !== undefined ? parseInt(sort_order, 10) : null,
      id
    ];

    const result = await pool.query(updateQuery, values);
    const updatedProduct = formatProduct(result.rows[0]);

    await logAudit(id, 'UPDATE', req.user?.email || 'Admin', {
      old: formatProduct(existingRes.rows[0]),
      new: updatedProduct
    });

    res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (err) {
    console.error('updateProduct error:', err);
    res.status(500).json({ error: err.message || 'Failed to update product' });
  }
}

async function updateProductStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be draft, published, or archived' });
    }

    const result = await pool.query(
      `UPDATE products SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = formatProduct(result.rows[0]);
    await logAudit(id, 'STATUS_CHANGE', req.user?.email || 'Admin', { status });

    res.json({
      message: `Product status updated to ${status}`,
      product
    });
  } catch (err) {
    console.error('updateProductStatus error:', err);
    res.status(500).json({ error: 'Failed to update product status' });
  }
}

async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    // Archive or soft delete to preserve order history
    const result = await pool.query(
      `UPDATE products SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await logAudit(id, 'ARCHIVE', req.user?.email || 'Admin', { status: 'archived' });

    res.json({ message: 'Product archived successfully' });
  } catch (err) {
    console.error('deleteProduct error:', err);
    res.status(500).json({ error: 'Failed to archive product' });
  }
}

function handleImageUpload(req, res) {
  upload.single('image')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({
      message: 'Image uploaded successfully',
      imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  });
}

module.exports = {
  getPublicProducts,
  getPublicProductByIdOrSlug,
  getAdminProducts,
  getAdminProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  handleImageUpload
};
