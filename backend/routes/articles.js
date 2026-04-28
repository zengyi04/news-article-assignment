const express = require('express');
const { db, auth } = require('../firebase-admin');
const Joi = require('joi');

const router = express.Router();

const assetUrlSchema = Joi.alternatives().try(
  Joi.string().uri({ scheme: ['http', 'https'] }),
  Joi.string().pattern(/^data:(image\/[a-zA-Z]+|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/)
).empty('').optional();

// Validation schemas
const articleSchema = Joi.object({
  title: Joi.string().required().min(1).max(200),
  summary: Joi.string().required().min(10),
  date: Joi.string().required(),
  publisher: Joi.string().required().min(1).max(100),
  type: Joi.string().valid('standard', 'website', 'pdf', 'doc').required(),
  sourceUrl: assetUrlSchema,
  imageUrl: assetUrlSchema,
  isPinned: Joi.boolean().default(false),
});

const updateArticleSchema = Joi.object({
  title: Joi.string().min(1).max(200),
  summary: Joi.string().min(10),
  date: Joi.string(),
  publisher: Joi.string().min(1).max(100),
  type: Joi.string().valid('standard', 'website', 'pdf', 'doc'),
  sourceUrl: assetUrlSchema,
  imageUrl: assetUrlSchema,
  isPinned: Joi.boolean(),
});

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /api/articles - Get all articles (with optional filtering and pagination)
router.get('/', verifyToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      publisher = '',
      type = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      pinned = ''
    } = req.query;

    let query = db.collection('articles');

    // Build query
    if (search) {
      query = query.where('title', '>=', search).where('title', '<=', search + '\uf8ff');
    }

    if (publisher && publisher !== 'All') {
      query = query.where('publisher', '==', publisher);
    }

    if (type && type !== 'All') {
      query = query.where('type', '==', type);
    }

    if (pinned === 'true') {
      query = query.where('isPinned', '==', true);
    }

    // Add sorting
    const sortField = sortBy === 'date' ? 'date' : sortBy;
    query = query.orderBy(sortField, sortOrder === 'desc' ? 'desc' : 'asc');

    // Execute query
    const snapshot = await query.get();
    let articles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Client-side filtering for search if needed
    if (search && articles.length > 0) {
      articles = articles.filter(article => 
        article.title.toLowerCase().includes(search.toLowerCase()) ||
        article.summary.toLowerCase().includes(search.toLowerCase()) ||
        article.publisher.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedArticles = articles.slice(startIndex, endIndex);

    // Get unique publishers for filter options
    const publishersSnapshot = await db.collection('articles').get();
    const uniquePublishers = [...new Set(publishersSnapshot.docs.map(doc => doc.data().publisher))];

    res.json({
      articles: paginatedArticles,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(articles.length / parseInt(limit)),
        totalArticles: articles.length,
        limit: parseInt(limit)
      },
      filters: {
        publishers: ['All', ...uniquePublishers],
        types: ['All', 'standard', 'website', 'pdf', 'doc']
      }
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// GET /api/articles/:id - Get single article
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection('articles').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({
      id: doc.id,
      ...doc.data()
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// GET /api/articles/stats - Get articles statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection('articles').get();
    const articles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const stats = {
      total: articles.length,
      pinned: articles.filter(a => a.isPinned).length,
      byType: {
        standard: articles.filter(a => a.type === 'standard').length,
        website: articles.filter(a => a.type === 'website').length,
        pdf: articles.filter(a => a.type === 'pdf').length,
        doc: articles.filter(a => a.type === 'doc').length
      },
      byPublisher: articles.reduce((acc, article) => {
        acc[article.publisher] = (acc[article.publisher] || 0) + 1;
        return acc;
      }, {}),
      recentActivity: articles
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(article => ({
          id: article.id,
          title: article.title,
          publisher: article.publisher,
          createdAt: article.createdAt
        }))
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// POST /api/articles - Create new article
router.post('/', verifyToken, async (req, res) => {
  try {
    const { error, value } = articleSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details.map(d => d.message) 
      });
    }

    const articleData = {
      ...value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.uid
    };

    const docRef = await db.collection('articles').add(articleData);
    
    res.status(201).json({
      id: docRef.id,
      ...articleData
    });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// PUT /api/articles/:id - Update article
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { error, value } = updateArticleSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details.map(d => d.message) 
      });
    }

    const docRef = db.collection('articles').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const updateData = {
      ...value,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    };

    await docRef.update(updateData);
    
    const updatedDoc = await docRef.get();
    res.json({
      id: updatedDoc.id,
      ...updatedDoc.data()
    });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// DELETE /api/articles/:id - Delete article
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const docRef = db.collection('articles').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Article not found' });
    }

    await docRef.delete();
    
    res.json({ 
      message: 'Article deleted successfully',
      id: req.params.id
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

// POST /api/articles/:id/pin - Toggle pin status
router.post('/:id/pin', verifyToken, async (req, res) => {
  try {
    const docRef = db.collection('articles').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const currentPinStatus = doc.data().isPinned || false;
    await docRef.update({
      isPinned: !currentPinStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    });

    const updatedDoc = await docRef.get();
    res.json({
      id: updatedDoc.id,
      isPinned: updatedDoc.data().isPinned,
      message: `Article ${!currentPinStatus ? 'pinned' : 'unpinned'} successfully`
    });
  } catch (error) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ error: 'Failed to toggle pin status' });
  }
});

module.exports = router;
