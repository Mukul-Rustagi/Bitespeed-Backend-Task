# Bitespeed Backend Task - Identity Reconciliation

This project implements the `POST /identify` endpoint described in the Bitespeed backend assignment.

## Tech stack

- Node.js
- TypeScript
- Express
- SQLite (`better-sqlite3`)

## Prerequisites

- Node.js 20+
- npm

## Setup

```bash
npm install
copy .env.example .env
```

## Run locally

```bash
npm run dev
```

Server starts on `http://localhost:3000`.

## Deployed API (Render)

Base URL:

`https://bitespeed-backend-task-fggm.onrender.com`

Production endpoints:

- `GET /health`
- `POST /identify`

Example request:

```bash
curl -X POST https://bitespeed-backend-task-fggm.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"mcfly@hillvalley.edu\",\"phoneNumber\":\"123456\"}"
```

## Environment variables (`.env`)

- `NODE_ENV=development`
- `PORT=3000`
- `DATABASE_FILE=./dev.db`

## Project structure (MVC)

```text
src/
  config/
  controllers/
  middlewares/
  models/
  repositories/
  routes/
  services/
  utils/
```

## Endpoint

`POST /identify`

Request JSON:

```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

Response JSON:

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

## Behavior implemented

- Creates a new primary contact when no existing contact matches by email or phone.
- Creates a secondary contact when one identifier matches an existing customer but the request introduces new info.
- Merges multiple primary clusters, preserving the oldest primary and converting newer primaries to secondaries.
- Returns consolidated unique emails, phone numbers, and secondary contact IDs for the resolved identity.

## Tests

```bash
npm test
```

Covered scenarios:

- new primary creation
- secondary creation for new info
- primary-to-secondary merge when two clusters connect
