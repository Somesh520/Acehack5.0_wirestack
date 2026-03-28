---
mode: ask
description: "Generate a high-quality frontend page using build -> critic -> refine loop with section blueprint, implementation, and scoring gate."
---

# Generate Scroll-Worthy Frontend

Use this workflow to generate a non-generic frontend page with strong content and visual direction.

The page should be an MVP-friendly generic website with neo-brutalism styling and smooth scrolling.

## Inputs

- Product or feature:
- Target audience:
- Desired page type (landing, feature page, onboarding, pricing, etc.):
- Primary CTA:
- Constraints (brand colors, existing components, deadlines):

## Workflow

1. Use the `frontend-builder` agent to produce:
   - Section blueprint (6 to 9 sections)
   - Design token direction
   - Implementation plan
2. Implement React components and styles in the current project.
3. Use the `frontend-critic` agent to score the result.
4. If average score < 8, apply targeted rewrites only.
5. Re-score once. Stop after max 2 refinement loops.

## Hard Requirements

- No hero-only minimal output.
- No quiz or gamified challenge sections unless explicitly requested.
- Include one trust-building section.
- Include one objection-handling section.
- Use neo-brutalism cues (thick borders, offset shadows, bold blocks).
- Ensure smooth scrolling is enabled.
- Keep copy concrete and specific.
- Ensure mobile readability.

## Final Response Format

- Summary of what was built
- Files changed
- Scorecard before and after refinement
- Any remaining gaps
