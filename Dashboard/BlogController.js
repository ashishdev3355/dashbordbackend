const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../client');

// Multer storage setup for blog image uploads
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
    cb(null, `blog_${cleanName}-${uniqueSuffix}${ext}`);
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

// Allowed Blog Categories
const VALID_CATEGORIES = [
  'Vehicle Service / Repair Tips',
  'Industry Review',
  'Product Reviews',
  'OBD Related'
];

// Helper: Format blog row for API responses
function formatBlog(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    excerpt: row.excerpt || '',
    content: row.content || '',
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    status: row.published ? 'published' : 'draft',
    publishedDate: row.published_date || '',
    readingTime: row.reading_time || '5 min read',
    featuredImage: row.featured_image || '',
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
    author: {
      name: row.author_name || 'OBD Smart Team',
      role: row.author_role || 'Technical Editor',
      avatar: row.author_avatar || ''
    },
    sort_order: parseInt(row.sort_order || 0, 10),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

// Helper: Audit logger
async function logAudit(blogId, action, changedBy, changes) {
  try {
    await pool.query(
      `INSERT INTO blog_audit_logs (blog_id, action, changed_by, changes) VALUES ($1, $2, $3, $4)`,
      [blogId, action, changedBy || 'Admin', JSON.stringify(changes)]
    );
  } catch (err) {
    console.error('Failed to write blog audit log:', err);
  }
}

// Helper: Slugify title
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// ==========================================
// PUBLIC CONTROLLERS (Read-Only)
// ==========================================

async function getPublicBlogs(req, res) {
  try {
    const { category, search } = req.query;
    let query = `SELECT * FROM blogs WHERE published = true`;
    const params = [];

    if (category && category !== 'All' && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (
        title ILIKE $${params.length} 
        OR excerpt ILIKE $${params.length} 
        OR category ILIKE $${params.length}
        OR tags::text ILIKE $${params.length}
      )`;
    }

    query += ` ORDER BY featured DESC, created_at DESC`;

    const result = await pool.query(query, params);
    const formatted = result.rows.map(formatBlog);
    res.json(formatted);
  } catch (err) {
    console.error('getPublicBlogs error:', err);
    res.status(500).json({ error: 'Failed to fetch blog articles' });
  }
}

async function getPublicBlogBySlug(req, res) {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      `SELECT * FROM blogs WHERE (slug = $1 OR id = $1) AND published = true LIMIT 1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(formatBlog(result.rows[0]));
  } catch (err) {
    console.error('getPublicBlogBySlug error:', err);
    res.status(500).json({ error: 'Failed to fetch blog article' });
  }
}

// ==========================================
// ADMIN CONTROLLERS (Protected CRUD)
// ==========================================

async function getAdminBlogs(req, res) {
  try {
    const { search, category, published, featured } = req.query;
    let query = `SELECT * FROM blogs WHERE 1=1`;
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (
        title ILIKE $${params.length} 
        OR excerpt ILIKE $${params.length} 
        OR slug ILIKE $${params.length}
        OR category ILIKE $${params.length}
        OR tags::text ILIKE $${params.length}
      )`;
    }

    if (category && category !== 'All' && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (published !== undefined && published !== 'all') {
      params.push(published === 'true' || published === true);
      query += ` AND published = $${params.length}`;
    }

    if (featured !== undefined && featured !== 'all') {
      params.push(featured === 'true' || featured === true);
      query += ` AND featured = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows.map(formatBlog));
  } catch (err) {
    console.error('getAdminBlogs error:', err);
    res.status(500).json({ error: 'Failed to fetch blog articles' });
  }
}

async function getAdminBlogById(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM blogs WHERE id = $1 LIMIT 1`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(formatBlog(result.rows[0]));
  } catch (err) {
    console.error('getAdminBlogById error:', err);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
}

async function createBlog(req, res) {
  try {
    const {
      id,
      title,
      slug,
      category,
      excerpt,
      content,
      featured,
      published,
      published_date,
      reading_time,
      featured_image,
      tags,
      author_name,
      author_role,
      author_avatar,
      sort_order
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Article title is required' });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }

    const blogId = id && id.trim() ? id.trim() : `post-${Date.now()}`;
    const baseSlug = slug && slug.trim() ? slugify(slug) : slugify(title);

    // Check slug uniqueness
    const slugCheck = await pool.query('SELECT id FROM blogs WHERE slug = $1', [baseSlug]);
    const finalSlug = slugCheck.rows.length > 0 ? `${baseSlug}-${Date.now()}` : baseSlug;

    const insertQuery = `
      INSERT INTO blogs (
        id, title, slug, category, excerpt, content,
        featured, published, published_date, reading_time,
        featured_image, tags, author_name, author_role, author_avatar,
        sort_order, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      blogId,
      title.trim(),
      finalSlug,
      category,
      excerpt || '',
      content || '',
      Boolean(featured),
      published !== undefined ? Boolean(published) : true,
      published_date || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      reading_time || '5 min read',
      featured_image || '',
      JSON.stringify(tags || []),
      author_name || 'OBD Smart Team',
      author_role || 'Technical Editor',
      author_avatar || '',
      parseInt(sort_order || 0, 10)
    ];

    const result = await pool.query(insertQuery, values);
    const createdBlog = formatBlog(result.rows[0]);

    await logAudit(blogId, 'CREATE', req.user?.email || 'Admin', createdBlog);

    res.status(201).json({
      message: 'Article created successfully',
      blog: createdBlog
    });
  } catch (err) {
    console.error('createBlog error:', err);
    res.status(500).json({ error: err.message || 'Failed to create article' });
  }
}

async function updateBlog(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      category,
      excerpt,
      content,
      featured,
      published,
      published_date,
      reading_time,
      featured_image,
      tags,
      author_name,
      author_role,
      author_avatar,
      sort_order
    } = req.body;

    const existingRes = await pool.query('SELECT * FROM blogs WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }

    let finalSlug = slug ? slugify(slug) : existingRes.rows[0].slug;
    if (slug && finalSlug !== existingRes.rows[0].slug) {
      const slugCheck = await pool.query('SELECT id FROM blogs WHERE slug = $1 AND id != $2', [finalSlug, id]);
      if (slugCheck.rows.length > 0) {
        finalSlug = `${finalSlug}-${Date.now()}`;
      }
    }

    const updateQuery = `
      UPDATE blogs SET
        title = COALESCE($1, title),
        slug = COALESCE($2, slug),
        category = COALESCE($3, category),
        excerpt = COALESCE($4, excerpt),
        content = COALESCE($5, content),
        featured = COALESCE($6, featured),
        published = COALESCE($7, published),
        published_date = COALESCE($8, published_date),
        reading_time = COALESCE($9, reading_time),
        featured_image = COALESCE($10, featured_image),
        tags = COALESCE($11, tags),
        author_name = COALESCE($12, author_name),
        author_role = COALESCE($13, author_role),
        author_avatar = COALESCE($14, author_avatar),
        sort_order = COALESCE($15, sort_order),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *
    `;

    const values = [
      title ? title.trim() : null,
      finalSlug,
      category || null,
      excerpt !== undefined ? excerpt : null,
      content !== undefined ? content : null,
      featured !== undefined ? Boolean(featured) : null,
      published !== undefined ? Boolean(published) : null,
      published_date || null,
      reading_time || null,
      featured_image !== undefined ? featured_image : null,
      tags ? JSON.stringify(tags) : null,
      author_name || null,
      author_role || null,
      author_avatar || null,
      sort_order !== undefined ? parseInt(sort_order, 10) : null,
      id
    ];

    const result = await pool.query(updateQuery, values);
    const updatedBlog = formatBlog(result.rows[0]);

    await logAudit(id, 'UPDATE', req.user?.email || 'Admin', {
      old: formatBlog(existingRes.rows[0]),
      new: updatedBlog
    });

    res.json({
      message: 'Article updated successfully',
      blog: updatedBlog
    });
  } catch (err) {
    console.error('updateBlog error:', err);
    res.status(500).json({ error: err.message || 'Failed to update article' });
  }
}

async function updateBlogPublishStatus(req, res) {
  try {
    const { id } = req.params;
    const { published } = req.body;

    if (published === undefined) {
      return res.status(400).json({ error: 'Published state (true/false) is required' });
    }

    const result = await pool.query(
      `UPDATE blogs SET published = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [Boolean(published), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const blog = formatBlog(result.rows[0]);
    await logAudit(id, 'PUBLISH_STATUS_CHANGE', req.user?.email || 'Admin', { published: Boolean(published) });

    res.json({
      message: `Article ${blog.published ? 'published' : 'unpublished'} successfully`,
      blog
    });
  } catch (err) {
    console.error('updateBlogPublishStatus error:', err);
    res.status(500).json({ error: 'Failed to update publish status' });
  }
}

async function deleteBlog(req, res) {
  try {
    const { id } = req.params;
    const existingRes = await pool.query('SELECT * FROM blogs WHERE id = $1', [id]);

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    await pool.query(`DELETE FROM blogs WHERE id = $1`, [id]);
    await logAudit(id, 'DELETE', req.user?.email || 'Admin', formatBlog(existingRes.rows[0]));

    res.json({ message: 'Article deleted successfully' });
  } catch (err) {
    console.error('deleteBlog error:', err);
    res.status(500).json({ error: 'Failed to delete article' });
  }
}

function handleBlogImageUpload(req, res) {
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
  VALID_CATEGORIES,
  getPublicBlogs,
  getPublicBlogBySlug,
  getAdminBlogs,
  getAdminBlogById,
  createBlog,
  updateBlog,
  updateBlogPublishStatus,
  deleteBlog,
  handleBlogImageUpload
};
