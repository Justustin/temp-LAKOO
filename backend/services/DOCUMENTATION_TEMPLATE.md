# Service Documentation Template (1:1)

Use this exact section order and headings for every service `DOCUMENTATION.md`.

## 1) Purpose
- What the service owns
- What it does **not** own

## 2) Architecture (layers & request flow)
- Layers: routes → controllers → services → repositories → database
- Typical request flow

## 3) Runtime contracts

### Environment variables
- List env vars used by code (and defaults if any)

### Authentication & authorization (gateway + service-to-service)
- Gateway headers: `x-gateway-key`, `x-user-id`, `x-user-role`
- Service-to-service headers: `x-service-auth`, `x-service-name` + `SERVICE_SECRET`
- Role values (use `internal` consistently for internal calls)

### Response format
- Success envelope (and any 204/no-body endpoints)
- Error envelope (centralized error handler)

## 4) Endpoint map (route → controller → service/repo)
- Map each route group to controller and underlying service/repo calls

## 5) Middleware
- `auth` (what it checks, what it sets on `req.user`)
- `validation`
- `error-handler`

## 6) Database & Prisma
- Prisma schema location
- Generated client location and `dist/` copy step
- `db push` vs migrations (MVP vs production)

## 7) Outbox events
- Outbox table + publishing approach
- Event types emitted (and notable gaps)

## 8) Local development & scripts
- Install / dev / build
- Useful scripts (`db:*`, `lint`, `format`, `test`)

## 9) Docker
- Dockerfile overview
- docker-compose overview (DB init container command)
- Known caveats (lockfiles, Prisma engines, etc.)

## 10) Tests
- What tests exist
- How to run smoke / DB smoke

## 11) Future-me problems / tech debt
- High-signal pitfalls and cleanup items

## 12) File-by-file
- Short description of important files and directories

