# Psy-Fi 🧠💸

**Psy-Fi** (Mindful Finance Expense Tracker) is a next-generation personal finance application that shifts the focus from purely quantitative tracking to qualitative, psychological spending analysis. Understand not just *where* your money goes, but *why* you spend it.

## 🌟 Core Value Proposition

Traditional budget apps only show you the numbers. Psy-Fi bridges the gap by highlighting mood-spending correlations (e.g., "Stress Relief", "FOMO", "Emotional Eating") to help you actively curb detrimental financial habits and build a healthier relationship with your money.

## ✨ Features

- **Real-Time Expense Tracking:** Log discretionary entries (amounts, categories, and moods) and fixed recurring commitments with instant UI updates.
- **Behavioral Analytics (Insight Engine):** A local algorithmic logic engine that instantly evaluates transactions using keyword mapping and scoring to assign a Risk Score (Low/Medium/High).
- **AI-Powered Spending Reports:** Generates a comprehensive portfolio-level behavioural analysis using Google's Gemini AI, identifying emotional triggers, anomalies, and actionable suggestions.
- **Dynamic Safety Meter:** Automatically calculates your "Safe Balance" by subtracting your discretionary spending and paid fixed expenses from your initial budget.
- **Secure & Private:** Strict Role-Based Access Control (RBAC) powered by Firebase Firestore ensures that your financial data is completely private to you.

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, Custom CSS Variables, Lucide React (Icons)
- **State Management:** React Context API & Hooks
- **Backend & Database:** Firebase (Authentication, Firestore NoSQL Database)
- **AI Integration:** Google Gen AI SDK (`@google/genai`) using Gemini 3.5 Flash

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Firebase Project (with Authentication and Firestore enabled)
- A Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/psy-fi.git
   cd psy-fi
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add your Firebase configuration and Gemini API Key:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   VITE_GEMINI_API_KEY=your_gemini_api_key_starting_with_AIzaSy
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
