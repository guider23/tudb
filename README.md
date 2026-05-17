<div align="center">

<img src="./logo.svg" alt="TUDB Logo" width="75%" />


**Natural language → SQL, instantly.**

Convert plain English to SQL queries across PostgreSQL, MySQL, RDS, Supabase, Neon, and Railway — powered by AI.

[**Try it live →**](https://tudb.bcworks.in.net)

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-ISC-yellow?style=flat-square)](LICENSE)

</div>

---

## What is TUDB?

TUDB lets you query any database using plain English. No SQL knowledge required — just ask a question and get results.

```
You:   "Show top 10 products by revenue last quarter"

SQL:   SELECT name, SUM(revenue) AS total
       FROM products
       WHERE created_at >= NOW() - INTERVAL '3 months'
       GROUP BY name
       ORDER BY total DESC
       LIMIT 10
```

**Key features:**
- Connect to multiple databases simultaneously (PostgreSQL, MySQL, RDS, Supabase, Neon, Railway)
- AI-generated SQL with query optimization suggestions
- Built-in analytics dashboard
- Collaborative query sharing across your team

---

## Getting started

**1. Clone and install**

```bash
git clone https://github.com/your-org/tudb
cd tudb
npm install
```

**2. Configure environment**

```bash
cp .env.example .env
```

```env
# Database (TUDB's own storage)
DATABASE_URL=postgresql://user:password@host:5432/tudb

# AI backend
AWS_BEARER_TOKEN_BEDROCK=your_token_here

# Auth
CLERK_SECRET_KEY=sk_...

# Security
ENCRYPTION_KEY=your_32_char_key_here
```

**3. Run migrations and start**

```bash
npm run db:migrate
npm run dev
```

The dashboard is available at `http://localhost:5173` and the API at `http://localhost:3000`.

---

## Project structure

```
tudb/
├── admin-dashboard/    # React + TypeScript frontend
├── backend/            # Express API + AI query agents
├── db/                 # Database abstraction layer
└── database/           # Migrations and seed data
```

---

## API reference

### Run a natural language query

```http
POST /api/query
Content-Type: application/json

{
  "question": "How many users signed up this week?",
  "connectionId": "conn_abc123"
}
```

**Response**

```json
{
  "sql": "SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days'",
  "results": [{ "count": 142 }],
  "suggestions": ["Add an index on created_at for faster queries"]
}
```

---

### Manage database connections

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/connections` | List all connections |
| `POST` | `/api/admin/connections` | Add a new connection |
| `PUT` | `/api/admin/connections/:id` | Update a connection |
| `DELETE` | `/api/admin/connections/:id` | Remove a connection |

---

### Inspect schema

```http
GET /api/inspect/tables
GET /api/inspect/schema?table=users
```

---

## Development

```bash
# Run backend and frontend separately
npm run dev:backend    # API server on :3000
npm run dev:dashboard  # Vite dev server on :5173

# Run tests
npm test
```

---

## Deployment

```bash
npm run build
npm start
```

For production, we recommend setting `NODE_ENV=production` and using a process manager like PM2.

---

## Environment variables reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✓ | PostgreSQL connection string for TUDB's storage |
| `AWS_BEARER_TOKEN_BEDROCK` | ✓ | AWS Bedrock token for AI query generation |
| `CLERK_SECRET_KEY` | ✓ | Clerk secret key for authentication |
| `ENCRYPTION_KEY` | ✓ | Key for encrypting stored connection credentials |

---

## Contributing

We welcome contributions! Please open an issue before submitting a large PR so we can discuss the approach.

<p align="center">
  <img src="https://bcworks.in.net/contributors.svg" alt="Contributors" />
</p>

---

<div align="center">
  <sub>Built with metanoia · <a href="https://tudb.bcworks.in.net">tudb.bcworks.in.net</a></sub>
</div>
