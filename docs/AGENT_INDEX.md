# Agent Index

All coding agents should read files in this order before implementing anything.

## Required Reading Order
1. `docs/product/PRD.md`
2. `docs/architecture/ARCHITECTURE.md`
3. `docs/data/DB_SCHEMA.md`
4. `docs/data/RLS_POLICIES.md`
5. `docs/api/API_CONTRACTS.md`
6. `docs/api/GOOGLE_PLACES.md`
7. `docs/ux/UI_UX_DIRECTION.md`
8. `docs/process/IMPLEMENTATION_PHASES.md`
9. Relevant prompt in `docs/PROMPTS/`

## Working Rules
- Use `src/app` for App Router.
- Keep routes, components, and services modular.
- Do not add new major features unless they are documented.
- Respect owner/admin/editor/viewer permissions.
- Treat Google Maps reviews as read-only external content.
- Keep expense splitting simple in MVP.
- Prefer clear server boundaries and RLS-safe data access.

## Definition of Done
- Implementation matches the current phase.
- Files changed are listed explicitly.
- Edge cases are documented.
- Manual testing checklist is included.
- No undocumented schema or API changes.
