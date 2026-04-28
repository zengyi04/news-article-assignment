# News Backend API

A robust Node.js backend API for the News Article Management System, built with Express.js and Firebase Admin SDK.

## Features

- 🔐 Firebase Authentication integration
- 📊 Firestore database operations
- 🚀 RESTful API endpoints
- 🛡️ Security middleware (Helmet, CORS, Rate Limiting)
- 📝 Request validation with Joi
- 📝 Comprehensive error handling
- 📊 Article statistics and analytics
- 🔄 Optimistic updates support

## Prerequisites

- Node.js 18.0.0 or higher
- Firebase project with Admin SDK configured
- Firebase service account key

## Installation

1. Clone the repository
2. Navigate to the backend directory:
   ```bash
   cd backend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

5. Configure Firebase service account:
   - Download the service account key from Firebase Console
   - Save it as `firebase-service-account.json` in the backend directory
   - Update the `.env` file with your Firebase configuration

## Configuration

### Environment Variables

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=news-fa2f1
FIREBASE_PRIVATE_KEY_ID=your_private_key_id_here
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@news-fa2f1.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id_here

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Security
JWT_SECRET=your_jwt_secret_key_here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Firebase Service Account

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `firebase-service-account.json`
4. Update the environment variables with the key values

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000` by default.

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/verify
Verify Firebase ID token and return user information.

**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "token": "firebase_id_token"
}
```

**Response:**
```json
{
  "uid": "user_uid",
  "email": "user@example.com",
  "emailVerified": true,
  "displayName": "John Doe",
  "photoURL": "https://example.com/photo.jpg",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "lastSignInTime": "2023-01-01T12:00:00.000Z"
}
```

### Article Endpoints

#### GET /api/articles
Get all articles with filtering and pagination.

**Headers:**
- `Authorization: Bearer firebase_id_token`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for title/summary/publisher
- `publisher` (optional): Filter by publisher
- `type` (optional): Filter by type (standard, website, pdf, doc)
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): Sort order (asc/desc, default: desc)
- `pinned` (optional): Filter pinned articles (true/false)

**Response:**
```json
{
  "articles": [
    {
      "id": "article_id",
      "title": "Article Title",
      "summary": "Article summary...",
      "date": "2023-01-01",
      "publisher": "Publisher Name",
      "type": "standard",
      "sourceUrl": "https://example.com",
      "imageUrl": "https://example.com/image.jpg",
      "isPinned": false,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalArticles": 50,
    "limit": 10
  },
  "filters": {
    "publishers": ["All", "Publisher 1", "Publisher 2"],
    "types": ["All", "standard", "website", "pdf", "doc"]
  }
}
```

#### GET /api/articles/:id
Get a single article by ID.

**Headers:**
- `Authorization: Bearer firebase_id_token`

#### POST /api/articles
Create a new article.

**Headers:**
- `Authorization: Bearer firebase_id_token`
- `Content-Type: application/json`

**Body:**
```json
{
  "title": "Article Title",
  "summary": "Article summary...",
  "date": "2023-01-01",
  "publisher": "Publisher Name",
  "type": "standard",
  "sourceUrl": "https://example.com",
  "imageUrl": "https://example.com/image.jpg",
  "isPinned": false
}
```

#### PUT /api/articles/:id
Update an existing article.

**Headers:**
- `Authorization: Bearer firebase_id_token`
- `Content-Type: application/json`

#### DELETE /api/articles/:id
Delete an article.

**Headers:**
- `Authorization: Bearer firebase_id_token`

#### POST /api/articles/:id/pin
Toggle the pinned status of an article.

**Headers:**
- `Authorization: Bearer firebase_id_token`

#### GET /api/articles/stats
Get articles statistics.

**Headers:**
- `Authorization: Bearer firebase_id_token`

**Response:**
```json
{
  "total": 100,
  "pinned": 5,
  "byType": {
    "standard": 60,
    "website": 25,
    "pdf": 10,
    "doc": 5
  },
  "byPublisher": {
    "Publisher 1": 30,
    "Publisher 2": 25
  },
  "recentActivity": [
    {
      "id": "article_id",
      "title": "Recent Article",
      "publisher": "Publisher Name",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

### Health Check

#### GET /health
Check server health and status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "projectId": "news-fa2f1"
}
```

## Error Handling

The API provides comprehensive error handling with appropriate HTTP status codes:

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication errors)
- `403` - Forbidden (permission errors)
- `404` - Not Found (resource not found)
- `409` - Conflict (resource already exists)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

Error responses include:
```json
{
  "error": "Error message",
  "code": "error_code",
  "details": "Additional error details"
}
```

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Prevent abuse (100 requests per 15 minutes)
- **Token Verification**: Firebase ID token validation
- **Input Validation**: Joi schema validation
- **Compression**: Response compression

## Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production environment variables
3. Ensure Firebase service account is properly configured

### PM2 Deployment

```bash
npm install -g pm2
pm2 start server.js --name "news-backend"
pm2 startup
pm2 save
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Monitoring

The server includes:
- Health check endpoint
- Request logging with Morgan
- Error logging
- Graceful shutdown handling

## License

MIT License
