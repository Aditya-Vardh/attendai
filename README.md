# AttendAI — AI-Powered Workforce Attendance & Intelligence Platform

AttendAI is an enterprise workforce management platform featuring automated attendance tracking, leave allocation & approval workflows, real-time analytics, AI anomaly detection, automatic report generation, and an interactive AI Workforce Copilot.

---

## 🌟 Key Features

### 🕒 Attendance & Time Tracking
- **One-Click Check-In / Check-Out**: Employees can record their start and end of workday with automatic late calculation against configurable workday schedules.
- **Attendance History & Adjustments**: Paginated and filterable attendance log (present, late, absent, half-day) with HR adjustment audit logs.

### 🌴 Leave Management
- **Automated Balances**: Automatic allocation of annual, sick, and unpaid leave balances upon employee onboarding.
- **Request & Approval Workflows**: Real-time request submitting, approval/rejection with status history and balance deduction.
- **In-App & Email Notifications**: Automated notification alerts sent when leave requests are approved or rejected.

### 🏢 Organization & Workforce Directory
- **Departments & Employees**: Full CRUD for departments, roles, contact details, and job titles.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for **Admin**, **HR Manager**, and **Employee**.

### 📊 Real-Time Analytics & Reports
- **Workforce Analytics**: Attendance trend tracking, department coverage metrics, and real-time dashboard stats.
- **Multi-Type AI Report Generation**: Generate comprehensive reports (Employee Performance, Department Summary, Attendance Anomaly, Leave Utilization, Monthly Executive Digest, Compliance & Overtime) with narrative AI insights and CSV/PDF export.

### 🤖 AI Workforce Copilot & Anomaly Detection
- **Rule-Based & LLM Anomaly Scanner**: Detects pattern anomalies (repeated late arrivals, sudden absences, irregular hours) with factual evidence and LLM explanations.
- **Interactive Copilot**: Natural language assistant powered by LLM tools with RBAC enforcement for querying employee status, policy insights, and team performance metrics.

---

## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Shadcn UI / Radix UI, Lucide Icons, Recharts, Wouter routing, TanStack Query, tRPC Client.
- **Backend**: Node.js, Express, tRPC Server v10, TypeScript.
- **Database & ORM**: MySQL / MariaDB with Drizzle ORM.
- **Authentication**: Session cookie-based authentication with OAuth support.
- **AI & LLM Services**: Integrated LLM service runner for text generation and structured prompt execution.
- **Notifications**: Resend for transactional email delivery + internal notification queue.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm 8+
- MySQL / MariaDB database instance

### Environment Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/Aditya-Vardh/attendai.git
   cd attendai
   ```

2. Copy `.env.example` to `.env` and configure your database credentials and API keys:
   ```bash
   cp .env.example .env
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Run database migrations / push schema:
   ```bash
   pnpm db:push
   ```

5. Start the development server:
   ```bash
   pnpm dev
   ```

---

## 🧪 Testing & Verification

Run the test suite:
```bash
pnpm test
```

Perform TypeScript type checks:
```bash
pnpm check
```

Build for production:
```bash
pnpm build
```

---

## 🔒 Security & RBAC

| Role | Access Scope |
| :--- | :--- |
| **Employee** | View own attendance, clock in/out, view own leave balances, request leave, view notifications, search permitted context. |
| **HR Manager** | Manage department employees, adjust attendance records, approve/reject leave requests, generate reports, access AI copilot. |
| **Admin** | Full system administration, department creation, system audit logs access, anomaly management, system settings. |

---

## 📄 License

MIT License. Developed for AttendAI Platform.
