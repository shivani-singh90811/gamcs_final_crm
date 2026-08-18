# LeadPulse CRM - Executive CFO & Advisory Portal

A high-performance enterprise Lead Management & CRM application built for executive CFO advisory practice firms, M&A consultants, and financial advisory practices.

This project features a full-stack architecture with a React 19 + Vite frontend and an integrated Express / Spring Boot-compliant REST API backend with JWT authentication, RBAC matrix control, AI deal scoring, proposal generator, invoice management, and document vault.

---

## 🚀 Key Features

- **Executive Lead & Opportunity Management**: Deal stages, deal probability, value tracking, and AI deal scoring recommendations.
- **REST API Integration**: Fully decoupled architecture communicating via `/api/v1` endpoints with Bearer JWT tokens.
- **Role-Based Access Control (RBAC)**: Fine-grained permission matrix (`ROLE_PARTNER`, `ROLE_SENIOR_CONSULTANT`, `ROLE_FINANCIAL_ANALYST`).
- **Client & Engagement Portfolio**: Contract statuses, SLA levels, AUM tracking, and client health metrics.
- **Proposal Generator**: Interactive line-item costing, fee structure builder, and instant proposal exports.
- **Invoicing & Billing**: Invoice generation, payment tracking, overdue warnings, and service breakdown.
- **Document Vault**: Confidential document categorisation, security classification, and download management.
- **Activity Timeline & Notifications**: Live audit logging and real-time executive alerts.

---

## 🛠️ Tech Stack & Requirements

- **Frontend**: React 19, TypeScript 5, Vite 6, Tailwind CSS 4, Lucide Icons, Recharts, Framer Motion.
- **Backend**: Express + TS Node engine implementing Spring Boot REST API specification `/api/v1`.
- **Authentication**: JSON Web Token (JWT) with bcrypt password hashing and Bearer header interceptor.
- **Prerequisites**:
  - **Node.js**: v18.0.0 or higher
  - **npm**: v9.0.0 or higher

---

## 💻 Local Setup & Running in VS Code

1. **Extract / Clone the repository** into your local workstation.
2. **Open the folder in VS Code**:
   ```bash
   code .
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Environment Setup**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
5. **Start the Local Development Server**:
   ```bash
   npm run dev
   ```
   The application will start at `http://localhost:3000`.

---

## ☕ Opening & Running in IntelliJ IDEA / WebStorm

1. Open **IntelliJ IDEA** or **WebStorm**.
2. Select **File -> Open...** and select the root directory of this project.
3. IntelliJ will automatically detect `package.json`.
4. Open the built-in terminal in IntelliJ (`Alt + F12` or `Option + F12`) and run:
   ```bash
   npm install
   npm run dev
   ```
5. Alternatively, create an `npm` Run/Debug Configuration:
   - **Command**: `run`
   - **Scripts**: `dev`

---

## 🔐 Demo Credentials

When running locally, you can log in using these demo credentials:

- **Email**: `s.jenkins@archicorp.com`
- **Password**: `Password123!`
- **Role**: Managing Partner (`ROLE_PARTNER`)

---

## 📦 Building for Production

To create an optimized production build:

```bash
npm run build
```

To run the production server:

```bash
npm run start
```

---

## 📄 License

Internal Enterprise Application. All rights reserved.
