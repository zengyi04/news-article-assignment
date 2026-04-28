const fs = require('fs/promises');
const path = require('path');

const { db } = require('../firebase-admin');

const articlesFilePath = path.join(__dirname, '..', 'data', 'articles.json');

let firestoreUnavailable = false;

function isFirestoreUnavailable(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /Could not load the default credentials|Missing or insufficient permissions|permission-denied|UNAUTHENTICATED|invalid credential|default credentials/i.test(message);
}

async function ensureLocalStore() {
  await fs.mkdir(path.dirname(articlesFilePath), { recursive: true });

  try {
    await fs.access(articlesFilePath);
  } catch {
    await fs.writeFile(articlesFilePath, '[]', 'utf8');
  }
}

async function readLocalArticles() {
  await ensureLocalStore();
  const raw = await fs.readFile(articlesFilePath, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalArticles(articles) {
  await ensureLocalStore();
  await fs.writeFile(articlesFilePath, JSON.stringify(articles, null, 2), 'utf8');
}

function normalizeArticle(article, id) {
  return {
    id,
    ...article,
  };
}

async function fetchAllFromFirestore() {
  const snapshot = await db.collection('articles').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function fetchAllArticles() {
  if (firestoreUnavailable) {
    return readLocalArticles();
  }

  try {
    return await fetchAllFromFirestore();
  } catch (error) {
    if (isFirestoreUnavailable(error)) {
      firestoreUnavailable = true;
      console.warn('Firestore unavailable, using local article store instead.');
      return readLocalArticles();
    }

    throw error;
  }
}

async function fetchArticleById(id) {
  if (firestoreUnavailable) {
    const articles = await readLocalArticles();
    return articles.find(article => article.id === id) || null;
  }

  try {
    const doc = await db.collection('articles').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  } catch (error) {
    if (isFirestoreUnavailable(error)) {
      firestoreUnavailable = true;
      const articles = await readLocalArticles();
      return articles.find(article => article.id === id) || null;
    }

    throw error;
  }
}

async function createArticle(article) {
  if (firestoreUnavailable) {
    const articles = await readLocalArticles();
    const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const saved = normalizeArticle(article, id);
    articles.push(saved);
    await writeLocalArticles(articles);
    return saved;
  }

  try {
    const docRef = await db.collection('articles').add(article);
    return normalizeArticle(article, docRef.id);
  } catch (error) {
    if (isFirestoreUnavailable(error)) {
      firestoreUnavailable = true;
      return createArticle(article);
    }

    throw error;
  }
}

async function updateArticle(id, updates) {
  if (firestoreUnavailable) {
    const articles = await readLocalArticles();
    const index = articles.findIndex(article => article.id === id);
    if (index === -1) return null;

    const updated = { ...articles[index], ...updates, id };
    articles[index] = updated;
    await writeLocalArticles(articles);
    return updated;
  }

  try {
    const docRef = db.collection('articles').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  } catch (error) {
    if (isFirestoreUnavailable(error)) {
      firestoreUnavailable = true;
      return updateArticle(id, updates);
    }

    throw error;
  }
}

async function deleteArticle(id) {
  if (firestoreUnavailable) {
    const articles = await readLocalArticles();
    const nextArticles = articles.filter(article => article.id !== id);
    if (nextArticles.length === articles.length) return false;

    await writeLocalArticles(nextArticles);
    return true;
  }

  try {
    const docRef = db.collection('articles').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  } catch (error) {
    if (isFirestoreUnavailable(error)) {
      firestoreUnavailable = true;
      return deleteArticle(id);
    }

    throw error;
  }
}

async function togglePin(id, updatedBy) {
  const article = await fetchArticleById(id);
  if (!article) return null;

  const nextArticle = {
    ...article,
    isPinned: !article.isPinned,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  if (firestoreUnavailable) {
    const articles = await readLocalArticles();
    const index = articles.findIndex(item => item.id === id);
    if (index === -1) return null;

    articles[index] = nextArticle;
    await writeLocalArticles(articles);
    return nextArticle;
  }

  try {
    const docRef = db.collection('articles').doc(id);
    await docRef.update({
      isPinned: nextArticle.isPinned,
      updatedAt: nextArticle.updatedAt,
      updatedBy,
    });

    const updatedDoc = await docRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  } catch (error) {
    if (isFirestoreUnavailable(error)) {
      firestoreUnavailable = true;
      return togglePin(id, updatedBy);
    }

    throw error;
  }
}

module.exports = {
  fetchAllArticles,
  fetchArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  togglePin,
};