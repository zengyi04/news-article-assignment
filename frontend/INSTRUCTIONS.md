# Chronicle News - Setup Instructions

This is a React-based news article management system built with TypeScript, Tailwind CSS, and Firebase.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository** (or download the files).
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Firebase Configuration**:
   - Create a project on the [Firebase Console](https://console.firebase.google.com/).
   - Enable **Firestore Database**.
   - Enable **Authentication** and activate the **Email/Password** and **Google** sign-in providers.
   - Create a Web App in your project settings and copy the configuration.
   - Create a file named `firebase-applet-config.json` in the root directory with the following structure:
     ```json
     {
       "apiKey": "YOUR_API_KEY",
       "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
       "projectId": "YOUR_PROJECT_ID",
       "storageBucket": "YOUR_PROJECT_ID.firebasestorage.app",
       "messagingSenderId": "YOUR_SENDER_ID",
       "appId": "YOUR_APP_ID",
       "firestoreDatabaseId": "(default)"
     }
     ```

### Running Locally

1. **Start the development server**:
   ```bash
   npm run dev
   ```
2. **Open your browser**:
   Navigate to `http://localhost:3000` (or the port specified in your terminal).

## Features
- **Article Dashboard**: View all published articles in a clean, editorial layout.
- **Search & Filter**: Real-time searching across titles, publishers, and summaries.
- **Article Editor**: Create and update news articles with full validation.
- **Persistence**: Powered by Google Cloud Firestore.
- **Responsive Design**: Optimized for both desktop and mobile viewing with a sidebar navigation.
