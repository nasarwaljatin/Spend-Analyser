# 💳 Spend Analyser — Personal Finance & Smart Cashflow Tracker

A full-stack, state-of-the-art Personal Finance & Spend Analysis Web Application built with **React (Vite)**, **Node.js (Express)**, and **Prisma ORM** with multi-database support (**SQLite** for instant zero-config local execution and **PostgreSQL** for scalable production deployment).

---

## 🌟 Key Features

- 💸 **Daily Inflow & Outflow Tracking**: Log daily expenses and incomes with amounts, customizable categories, payment dates, descriptions, and notes.
- 📂 **Multi-Category Management**:
  - Pre-seeded with 13 spend categories (Food & Dining, Rent, Groceries, Utilities, Subscriptions, Entertainment, Travel, etc.) and 6 earning categories (Salary, Freelance, Investments, Bonus, Refunds, etc.).
  - Custom category creator with emoji icon picker and color theming.
- 📊 **Monthly & Yearly Net Analysis**:
  - Real-time KPI summary cards: Total Inflow, Total Outflow, Net Balance, and Savings Rate.
  - Interactive **Recharts** charts: Monthly trend area curves, spend vs. earnings bar charts, and category distribution donut charts.
  - Monthly view with day-by-day cashflow breakdown and category share percentages.
  - Yearly view comparing all 12 months side-by-side with net surplus/deficit indicators.
- 🎯 **Budget Ceilings & Alerts**: Set monthly spending caps on individual categories with dynamic visual progress bars (Safe, Warning, Exceeded) and threshold notifications.
- 🔄 **Recurring Transactions & Subscriptions**: Track repeating bills (Netflix, Rent, Gym, SIP) with automated frequency scheduling (Daily, Weekly, Monthly, Yearly) and Pause/Resume controls.
- 📥 **Export to Excel & CSV**: Instant 1-click export of transactions and analytics reports to `.xlsx` spreadsheet files via SheetJS.
- 🎨 **Modern Design System**:
  - Deep Indigo Glassmorphism Dark Mode (Default) and Crisp Daylight Light Mode with persistent toggle.
  - Custom typography with Indian Number formatting (`₹`, Lakhs `L`, Crores `Cr`, and tabular numbers).
- ⚡ **Instant One-Click Demo Login**: Pre-seeded demo account (`demo@spendanalyser.com` / `Demo@1234`) with multi-month realistic financial data.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client["React Frontend (Vite + React Router + Recharts + Zustand)"]
    Server["Express.js API Server (Port 5000)"]
    DB[("Database (Prisma ORM: SQLite / PostgreSQL)")]
    
    Client -->|Axios REST API / JWT with HttpOnly Cookies| Server
    Server -->|Prisma Client| DB
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + Vite | Ultra-fast SPA development & bundling |
| **Routing** | React Router DOM v6 | Protected routes, layout nested routing |
| **State Management** | Zustand | Lightweight store for authentication, theme, and notifications |
| **Visualizations** | Recharts | Interactive Area, Bar, and Donut charts |
| **Icons** | React Icons (Ionicons v5) | Crisp semantic iconography |
| **Backend** | Node.js + Express 5 | Modular MVC REST API with middleware security |
| **ORM / Database** | Prisma ORM | Type-safe queries, migrations, SQLite & PostgreSQL support |
| **Security** | Helmet, bcryptjs, JWT | Password hashing, CORS whitelisting, rate limiting |
| **Export** | SheetJS (XLSX) | Client-side spreadsheet export |

---

## 🗄️ Database Schema & Models

```mermaid
erDiagram
    User ||--o{ Category : owns
    User ||--o{ Transaction : logs
    User ||--o{ Budget : sets
    User ||--o{ RecurringTransaction : schedules
    Category ||--o{ Transaction : categorizes
    Category ||--o{ Budget : monitors
    Category ||--o{ RecurringTransaction : classifies

    User {
        String id PK
        String email UK
        String passwordHash
        String name
        String preferredCurrency "INR"
        String theme "dark|light"
        DateTime createdAt
        DateTime updatedAt
    }

    Category {
        String id PK
        String userId FK
        String name
        String type "spend|earning"
        String icon
        String color
        Boolean isDefault
        DateTime createdAt
    }

    Transaction {
        String id PK
        String userId FK
        String categoryId FK
        String type "spend|earning"
        Decimal amount
        String currency
        String description
        DateTime transactionDate
        String notes
        Boolean isRecurring
        DateTime createdAt
        DateTime updatedAt
    }

    Budget {
        String id PK
        String userId FK
        String categoryId FK
        Decimal limitAmount
        String period "monthly|yearly"
        Int month
        Int year
        Boolean alertEnabled
        Decimal alertThreshold
        DateTime createdAt
    }

    RecurringTransaction {
        String id PK
        String userId FK
        String categoryId FK
        String type "spend|earning"
        Decimal amount
        String currency
        String description
        String frequency "daily|weekly|monthly|yearly"
        DateTime startDate
        DateTime endDate
        DateTime nextDueDate
        Boolean isActive
        DateTime createdAt
    }
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js** (v18 or newer)
- **npm** (comes with Node.js)

### 1. Clone & Install Dependencies

```bash
# In project root:
cd "d:\CODES\SPEND ANALYSER"

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Database Setup & Seeding

The application is pre-configured with **SQLite (`dev.db`)** for zero-setup execution (no Docker or PostgreSQL installation required).

```bash
cd server

# Push the schema to the database (creates dev.db automatically)
npx prisma db push

# Seed default categories, demo account, and realistic sample data
node prisma/seed.js
```

> **Optional PostgreSQL Setup**:
> If you have PostgreSQL or Docker installed, start the database with `docker-compose up -d`, update `DATABASE_URL` in `server/.env` to `postgresql://postgres:postgres123@localhost:5432/spend_analyser?schema=public`, and copy `server/prisma/schema.postgresql.prisma` to `schema.prisma`.

### 3. Run the Full Stack Application

In two separate terminals:

**Terminal 1 (Backend Server):**
```bash
cd server
npm start
# Runs on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

Open **http://localhost:5173** in your web browser.

---

## 🔐 Demo Credentials

Click the **"⚡ One-Click Demo Login"** button on the sign-in page, or use:

- **Email**: `demo@spendanalyser.com`
- **Password**: `Demo@1234`

---

## 📡 API Reference

### Authentication (`/api/auth`)
- `POST /register`: Create a new user account with base currency preference.
- `POST /login`: Authenticate with email & password, sets JWT tokens.
- `POST /logout`: Clears authentication cookies.
- `GET /me`: Fetch authenticated user profile.
- `PUT /profile`: Update name, currency, or theme.

### Transactions (`/api/transactions`)
- `GET /`: List paginated transactions (supports `?type=spend|earning`, `?categoryId=...`, `?search=...`, `?sortBy=...`, `?page=1&limit=10`).
- `POST /`: Create a new transaction.
- `PUT /:id`: Update transaction details.
- `DELETE /:id`: Delete a transaction.

### Categories (`/api/categories`)
- `GET /`: List categories (optional filter `?type=spend|earning`).
- `POST /`: Create a custom category with custom icon & color.
- `PUT /:id`: Update category properties.
- `DELETE /:id`: Delete a category (protected if linked to existing transactions).

### Reports & Analytics (`/api/reports`)
- `GET /monthly?year=2026&month=9`: Monthly summary, inflow/outflow totals, savings rate, daily breakdown, and category breakdown.
- `GET /yearly?year=2026`: 12-month net trajectory comparison.
- `GET /trends?months=6`: Rolling income vs. spend timeline.

### Budgets (`/api/budgets`)
- `GET /`: List all category budgets with spent vs. limit calculation.
- `POST /`: Create a category spending limit.
- `PUT /:id`: Update budget limit or alert threshold.
- `DELETE /:id`: Remove a budget.

### Recurring Schedules (`/api/recurring`)
- `GET /`: List all recurring transactions.
- `POST /`: Schedule a recurring payment.
- `POST /:id/pause`: Pause a recurring schedule.
- `POST /:id/resume`: Resume a recurring schedule.
- `DELETE /:id`: Remove recurring schedule.

---

## 📁 Project Directory Structure

```
SPEND ANALYSER/
├── client/                              # Vite + React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                  # Modal, Loader, Toast, ThemeToggle, ProtectedRoute
│   │   │   └── layout/                  # AppLayout, Header, Sidebar
│   │   ├── pages/                       # Login, Register, Dashboard, Transactions,
│   │   │                                # Categories, Reports, Budgets, Recurring, Settings
│   │   ├── services/                    # Axios API service clients
│   │   ├── store/                       # Zustand stores (auth, theme, toast)
│   │   ├── styles/                      # Comprehensive CSS design system (index.css)
│   │   ├── utils/                       # formatCurrency, formatDate, exportToExcel
│   │   ├── App.jsx                      # App root with toast & theme providers
│   │   ├── main.jsx                     # Vite DOM entry
│   │   └── router.jsx                   # React Router route definitions
│   └── package.json
│
├── server/                              # Express.js REST Backend
│   ├── prisma/
│   │   ├── schema.prisma                # Active Prisma schema (SQLite dev.db)
│   │   ├── schema.postgresql.prisma     # PostgreSQL production schema
│   │   └── seed.js                      # Realistic multi-month seed script
│   ├── src/
│   │   ├── config/                      # env validation (zod), db (prisma), cors, passport
│   │   ├── controllers/                 # Request handlers for all routes
│   │   ├── middleware/                  # auth guard, rateLimiter, error handling
│   │   ├── routes/                      # Express route endpoints
│   │   ├── services/                    # Business logic & financial aggregations
│   │   └── app.js                       # Express app configuration
│   ├── server.js                        # Server entry point (Port 5000)
│   ├── .env                             # Environment configuration
│   └── package.json
│
├── docker-compose.yml                   # Optional PostgreSQL container configuration
└── README.md                            # Complete Project Documentation
```

---

## 🛡️ Best Practices & Quality Assurance

- **Zero-Crash Verification**: Built and verified end-to-end using automated browser testing subagents.
- **Data Integrity**: Cascading deletes and unique constraints protect users from orphaned financial records.
- **Responsive Layout**: Designed mobile-first and optimized for desktops, tablets, and mobile screens.
- **Tabular Numerics**: Number alignments remain uniform across financial statement lists.
