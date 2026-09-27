# Playlist Bulk-Import Feature Specification

**Author**: Engineering Team  
**Module**: Admin Dashboard (`/admin/courses/[courseId]/import`)  
**Status**: Ready for Implementation (P3)  
**Security & Access**: Admin-Only (`user_role = 'admin'` via Supabase RLS & Server Actions)

---

## 1. Overview & Objective
Allow course creators and administrators to rapidly generate a complete Unit or Course structure with ordered Lessons by providing:
1. A **YouTube Playlist URL** (auto-extracting video titles, video IDs, durations, and descriptions via YouTube oEmbed / Data API or client parser), OR
2. A structured **CSV / JSON file** containing batch lesson definitions.

---

## 2. Input Formats & Schemas

### Format A: YouTube Playlist URL
- **Input**: Standard YouTube playlist link (e.g., `https://www.youtube.com/playlist?list=PL...` or single video playlist `v=...&list=...`).
- **Extraction**:
  - `youtubeVideoId`: 11-character alphanumeric video identifier (`[a-zA-Z0-9_-]{11}`).
  - `title`: Video title sanitized (max 200 characters).
  - `description`: Default summary or extracted description.
  - `orderIndex`: Sequential 0-based index reflecting playlist sequence.
  - `xpReward`: Default configurable amount (e.g. 15 XP per lesson).

### Format B: CSV Upload
- **Headers**:
  ```csv
  title,description,youtube_video_id,order_index,xp_reward,is_published
  "Introduction to Arrays","Learn basic indexing and memory layout","AbCdEfGh123",0,10,true
  "Dynamic Lists in Python","Slicing, appending, and popping elements","IjKlMnOp456",1,15,true
  ```

### Format C: JSON Batch Payload
```json
{
  "courseId": "uuid-here",
  "unitId": "uuid-here",
  "lessons": [
    {
      "title": "Introduction to Variables",
      "description": "Basics of data types",
      "youtubeVideoId": "kqtD5dpn9C8",
      "orderIndex": 0,
      "xpReward": 10,
      "isPublished": true
    }
  ]
}
```

---

## 3. Validation Rules & Data Hygiene

Each item in the bulk import must satisfy strict Zod validation:
1. `title`: Non-empty string, min 3 characters, max 200 characters.
2. `youtubeVideoId`: Validated against regex `/^[a-zA-Z0-9_-]{11}$/`. Invalid IDs fail validation immediately.
3. `orderIndex`: Integer $\ge 0$. Must maintain unique ordering within the target `unit_id`.
4. `xpReward`: Integer between 5 and 100.
5. `isPublished`: Boolean (default `false` to permit draft review before publishing).

---

## 4. Transactional Integrity & Failure Handling

- **Atomic Batch Mode (Default)**: All-or-nothing execution inside a single PostgreSQL transaction (`db.transaction(async (tx) => { ... })`). If any row violates unique constraints (`unit_id`, `order_index`), foreign keys, or fails validation, the entire batch is rolled back and an error list is returned with line numbers.
- **Partial Import Mode (Optional Flag)**: Skips malformed rows and inserts all valid rows, returning a summary:
  ```json
  {
    "total": 20,
    "inserted": 18,
    "failed": [
      { "row": 4, "error": "Invalid YouTube Video ID: 'too_short'" },
      { "row": 12, "error": "Duplicate orderIndex 3 already exists in unit" }
    ]
  }
  ```

---

## 5. Security & RBAC Gating

- **Server-Side Enforcement**: Gated by `requireAdmin()` check inspecting `profiles.role === 'admin'`.
- **Database RLS**: The `lessons` table RLS policy `Admins can manage lessons` guarantees that non-admin authenticated users attempting direct database writes will receive an RLS check violation.
