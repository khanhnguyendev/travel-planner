# API Contracts

All endpoints require an authenticated Supabase session. Route handlers must verify membership and role per `docs/RLS_POLICIES.md` before mutating data.

Common response envelope:
```json
{ "ok": true, "data": {...} }
```
Errors: `{ "ok": false, "error": { "code": "forbidden|invalid|not_found|conflict|rate_limited|server_error", "message": "..." } }`

## POST /api/places/resolve

Resolve a Google Maps link and return normalized place details; upsert place if not present.
Request:
```json
{
  "projectId": "uuid",
  "categoryId": "uuid",
  "googleMapsUrl": "https://maps.google.com/...",
  "forceRefresh": false
}
```
Behavior: validates URL, extracts `externalPlaceId`, fetches Google Places details (field mask: name, formatted_address, location, rating, price_level, editorial_summary, photos?, reviews limited to 3 recent/high-quality), caches by `externalPlaceId`. Prevents duplicates via unique `(projectId, externalPlaceId)`. `categoryId` must belong to the same `projectId` — validate before insert.
Response:
```json
{
  "ok": true,
  "data": {
    "place": { "id": "uuid", "name": "...", "address": "...", "rating": 4.6, "externalPlaceId": "abc123" },
    "reviews": [
      { "authorName": "Jane", "rating": 5, "text": "...", "publishedAt": "2024-06-01T00:00:00Z", "sourceProvider": "google" }
    ]
  }
}
```

## POST /api/votes

Create or update a vote for a place (idempotent upsert on `(placeId, userId)`).
Request:
```json
{
  "projectId": "uuid",
  "placeId": "uuid",
  "voteType": "upvote|downvote|score",
  "score": 1   // required and must be 1–10 when voteType = "score"; omit otherwise
}
```
Rules: caller must be accepted member of project; place must belong to project; archived projects block mutation.

## DELETE /api/votes

Remove a vote. Use this instead of sending `voteType: null`.
Request:
```json
{
  "projectId": "uuid",
  "placeId": "uuid"
}
```
Rules: caller must be the vote owner (`userId = auth.uid()`); archived projects block mutation.
Response: `{ "ok": true }`

Vote response (POST):
```json
{ "ok": true, "data": { "placeId": "uuid", "userId": "uuid", "voteType": "upvote", "score": null } }
```

## POST /api/expenses

Create an expense and split entries in one transaction.
Request:
```json
{
  "projectId": "uuid",
  "title": "Lunch",
  "amount": 120.50,
  "currency": "USD",
  "expenseDate": "2024-06-01T12:00:00Z",
  "note": "Seafood place",
  "paidByUserId": "uuid",
  "splits": [
    { "userId": "uuid", "amountOwed": 60.25 },
    { "userId": "uuid", "amountOwed": 60.25 }
  ],
  "receiptPath": "project/<projectId>/expenses/<newExpenseId>/receipt.jpg" // optional, post-upload path
}
```
Rules:
- Caller role must be owner/admin/editor.
- `splits` total must equal `amount`.
- All `userId` values in `splits` must be accepted members of the project.
- `paidByUserId` must be an accepted member of the project. It may differ from `auth.uid()` to support recording an expense on behalf of another member.
- `expenseDate` defaults to `now()` if omitted.

Response:
```json
{ "ok": true, "data": { "expenseId": "uuid" } }
```

## POST /api/uploads/receipt

Create a signed URL for a receipt upload.
Request:
```json
{
  "projectId": "uuid",
  "expenseId": "uuid",          // optional — omit during draft creation
  "filename": "receipt.jpg",
  "contentType": "image/jpeg"
}
```
Behavior: builds path `project/<projectId>/expenses/<expenseId|temp>/<filename>`, checks role owner/admin/editor, returns short-lived signed PUT URL and canonical `receiptPath` to store on the expense.

Temp path cleanup: when `expenseId` is omitted, the file is stored under `.../expenses/temp/...`. The route handler for `POST /api/expenses` must move (copy + delete) the object to the final path `project/<projectId>/expenses/<expenseId>/<filename>` as part of expense creation. A scheduled cleanup job must also delete any objects under `.../expenses/temp/...` older than 24 hours to prevent orphan accumulation.

Response:
```json
{
  "ok": true,
  "data": {
    "uploadUrl": "https://storage...",
    "receiptPath": "project/<projectId>/expenses/<expenseId|temp>/receipt.jpg",
    "expiresAt": "2024-06-01T12:00:00Z"
  }
}
```

## POST /api/invites/send

Create an invite and send email (email provider TBD).
Request:
```json
{
  "projectId": "uuid",
  "email": "friend@example.com",
  "role": "editor"   // optional; one of owner|admin|editor|viewer; defaults to "editor"
}
```
Rules: owner/admin only; prevents duplicate pending invite for same email+project; `role` cannot exceed the caller's own role (e.g., an admin cannot invite an owner).
Response: `{ "ok": true, "data": { "inviteId": "uuid" } }`

## POST /api/invites/accept

Accept invite token and create membership.
Request:
```json
{ "token": "string" }
```
Behavior: verifies token not expired/revoked; creates `project_members` row using the `role` stored on the invite (not a hardcoded value); marks invite `accepted`.
Rate limiting: this endpoint must be rate-limited per IP to prevent token brute-forcing. Tokens must be at least 32 bytes of cryptographically random data.
Response: `{ "ok": true, "data": { "projectId": "uuid", "role": "editor" } }`
