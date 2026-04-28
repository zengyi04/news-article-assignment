// API client for backend integration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Get current Firebase ID token
const getAuthToken = async () => {
  const { auth } = await import('./firebase');
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return user.getIdToken();
};

// Generic API request helper
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// Articles API
export const articlesApi = {
  // Get all articles with filtering
  getArticles: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    publisher?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
    pinned?: string;
  } = {}) => {
    const queryString = new URLSearchParams(params as any).toString();
    return apiRequest(`/articles${queryString ? `?${queryString}` : ''}`);
  },

  // Get single article
  getArticle: async (id: string) => {
    return apiRequest(`/articles/${id}`);
  },

  // Create new article
  createArticle: async (data: any) => {
    return apiRequest('/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update article
  updateArticle: async (id: string, data: any) => {
    return apiRequest(`/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete article
  deleteArticle: async (id: string) => {
    return apiRequest(`/articles/${id}`, {
      method: 'DELETE',
    });
  },

  // Toggle pin status
  togglePin: async (id: string) => {
    return apiRequest(`/articles/${id}/pin`, {
      method: 'POST',
    });
  },

  // Get statistics
  getStats: async () => {
    return apiRequest('/articles/stats');
  },
};

// Auth API
export const authApi = {
  // Verify token
  verifyToken: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    return response.json();
  },
};
