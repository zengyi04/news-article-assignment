const express = require('express');
const { auth } = require('../firebase-admin');
const {
  fetchAllArticles,
  fetchArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  togglePin,
} = require('../lib/article-store');
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

    const sortField = sortBy === 'date' ? 'date' : sortBy;
    let articles = await fetchAllArticles();

    if (search) {
      const lowered = search.toLowerCase();
      articles = articles.filter(article => 
        article.title.toLowerCase().includes(lowered) ||
        article.summary.toLowerCase().includes(lowered) ||
        article.publisher.toLowerCase().includes(lowered)
      );
    }

    if (publisher && publisher !== 'All') {
      articles = articles.filter(article => article.publisher === publisher);
    }

    if (type && type !== 'All') {
      articles = articles.filter(article => article.type === type);
    }

    if (pinned === 'true') {
      articles = articles.filter(article => article.isPinned);
    }

    articles.sort((a, b) => {
      const aValue = new Date(a[sortField] || a.createdAt).getTime();
      const bValue = new Date(b[sortField] || b.createdAt).getTime();
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedArticles = articles.slice(startIndex, endIndex);

    // Get unique publishers for filter options
    const uniquePublishers = [...new Set(articles.map(doc => doc.publisher))];

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
    const article = await fetchArticleById(req.params.id);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// GET /api/articles/stats - Get articles statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const articles = await fetchAllArticles();

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

    const savedArticle = await createArticle(articleData);

    res.status(201).json({
      ...savedArticle
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

    const updatedArticle = await updateArticle(req.params.id, {
      ...value,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid
    });

    if (!updatedArticle) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(updatedArticle);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// DELETE /api/articles/:id - Delete article
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const deleted = await deleteArticle(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
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
    const updatedArticle = await togglePin(req.params.id, req.user.uid);

    if (!updatedArticle) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json({
      id: updatedArticle.id,
      isPinned: updatedArticle.isPinned,
      message: `Article ${updatedArticle.isPinned ? 'pinned' : 'unpinned'} successfully`
    });
  } catch (error) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ error: 'Failed to toggle pin status' });
  }
});

module.exports = router;
