# Cash&Choices — Smarter Financial Decisions (Client & Server Monorepo)

This project consists of a modern, lightweight frontend (`client/`) powered by React, TanStack Start & Tailwind CSS, and a high-performance REST API backend (`server/`) written in **Go (Golang)**.

---

## Directory Structure

```
cash-choices/
├── client/                      # Frontend Application (React, TanStack Start, Tailwind)
│   ├── src/                     # UI Components, Routes, Data & Hooks
│   ├── public/                  # Static Assets
│   ├── package.json             # Frontend Dependencies
│   └── vite.config.ts           # Vite Config (with /api proxy to localhost:8080)
└── server/                      # Backend Application (Go / Golang)
    ├── go.mod                   # Go module definition
    ├── main.go                  # Entry point & HTTP server router
    ├── config/                  # Configuration & Environment loading
    ├── models/                  # Struct definitions
    ├── services/                # Business logic (MF API, AI Gateway, Tax Calculations)
    └── handlers/                # HTTP API handlers (/api/funds/*, /api/recommend, /api/calculators/*)
```

---

## Getting Started

### 1. Run the Go Backend Server

Requirements: [Go 1.22+](https://go.dev/dl/)

```sh
cd server
go run main.go
```

The Go server will start on `http://localhost:8080`.

### 2. Run the Frontend Client

Requirements: Node.js 18+ and npm

```sh
cd client
npm install
npm run dev
```

The frontend client will start on `http://localhost:3000` (or `http://localhost:8081`), with all `/api/*` requests automatically proxied to the Go backend.

---

## API Endpoints (Go Backend)

- `GET /api/health`: Health status check.
- `GET /api/funds/search?q={query}`: Search Indian mutual funds via `mfapi.in` integration.
- `GET /api/funds/detail?code={schemeCode}`: Get scheme NAV history, 1M/6M/1Y/3Y returns, 52-week High/Low, and drawdown.
- `POST /api/funds/explain`: AI breakdown of fund performance.
- `POST /api/recommend`: AI recommendation engine.
- `POST /api/calculators/tax`: Investment withdrawal tax calculation engine.
