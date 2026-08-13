# Design System and Figma Governance

## Scope

Tickets 6.1 and 6.10 share one executable boundary: new reusable UI components live under `src/components/ui` and consume semantic Design System tokens from `src/index.css`.

## Token contract

- Brand: `primary`, `primary-hover`, `primary-soft`
- Feedback: `success`, `warning`, `danger` and their soft surfaces
- Layout: `surface`, `surface-muted`, `card`, `border`
- Typography: `text`, `text-muted`, `text-subtle`
- Interaction: `focus`
- Shape and elevation: `--di-radius-*`, `--di-shadow-card`

## Figma to GitHub workflow

1. Export or manually translate Figma changes into a governed component under `src/components/ui`.
2. Use semantic Tailwind classes or `--di-*` variables; raw hex/rgb colors are rejected in governed files.
3. Run `npm run qa:design-system` locally.
4. Open a pull request; `.github/workflows/qa-gates.yml` runs the same gate through `scripts/quality-gates.mjs`.
5. Review screenshots and accessibility states before merge.

## Rollback

Revert the component change and its token change together. The QA artifact identifies the failing gate without requiring a production deployment.
