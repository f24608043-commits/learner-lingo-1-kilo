# Database Connection Incident Postmortem & Pooler Architecture

**Date**: September 2026  
**Component**: Supabase PostgreSQL / Drizzle ORM / Next.js Serverless Runtime  
**Severity**: High (Connection exhaustion / timeout errors under concurrent load)  
**Status**: Resolved

---

## 1. Executive Summary
Under concurrent load or frequent server-side page transitions, the application experienced intermittent connection timeouts (`Max client connections reached` or query timeout errors). The issue was traced to:
1. Connecting through the direct or session pooler (port `5432`) rather than Supabase's **Transaction Pooler** (port `6543` / `pgbouncer=true`).
2. Re-instantiating `postgres` connection pools during Next.js server module evaluations without a cached global singleton.

---

## 2. Root Cause Analysis

### A. Session Pooler vs. Transaction Pooler
- **Session Pooling (Port 5432)**:
  - Allocates 1 dedicated Postgres backend process per connected client for the entire duration of the client connection.
  - In serverless / edge environments (Next.js App Router Server Components, Server Actions, API routes), multiple concurrent requests rapidly exhaust the database's max connection ceiling (often 15–60 connections on starter tiers).
- **Transaction Pooling (Port 6543 / PgBouncer)**:
  - Holds backend Postgres connections in a shared pool and assigns a backend process only for the duration of a transaction or single query.
  - Allows hundreds of concurrent serverless clients to share a modest pool of Postgres processes.
  - **Requirement**: `prepare: false` must be configured in `postgres.js` to prevent prepared statement errors across connection switches.

### B. Connection Pool Lifecycle in Next.js Server Runtimes
- In Next.js (both local development Fast Refresh and serverless execution environments), top-level client instantiations without `globalThis` caching cause new connection pools to be allocated upon module re-evaluations.
- Over time or during bursts, orphan pools accumulate idle connections before hitting idle timeouts.

---

## 3. Remediation Actions

1. **Transaction Pooler URL Specification**:
   - Connection strings in production/serverless must target port `6543` (e.g. `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true`).
2. **Global Singleton Cache (`db/index.ts`)**:
   - Implemented `globalThis.conn` singleton caching for `postgres.js` and Drizzle client.
   - Enforced `prepare: false` for PgBouncer transaction mode compatibility.
   - Configured sensible connection timeouts (`timeout: 30000`, `idle_timeout: 10`, `max: 10` in prod, `5` in dev).
3. **Database Performance Indexing**:
   - Added indexes on high-traffic foreign keys and lookup columns (`role`, `course_id`, `user_id`, `conversation_id`, `lesson_id`) to minimize query lock durations.

---

## 4. Acceptance Criteria & Load Verification
- **Load Test**: Concurrency test (`scripts/load_test_db.ts`) simulating 50 concurrent database operations.
- **Result**: 0 connection errors, connection reuse verified.
