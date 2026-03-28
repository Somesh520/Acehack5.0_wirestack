# Wirestack Copilot Instructions

These instructions are always-on for this workspace.

## Primary Goal

Ship frontend pages that feel intentional, content-rich, and scroll-worthy rather than minimal placeholder screens.

## Frontend Quality Bar

- Default to 6 to 9 narrative sections for marketing or landing-style pages.
- Each section must have a clear purpose, not just visual decoration.
- Default to MVP-friendly structure that ships fast and stays easy to edit.
- Avoid boilerplate copy like "Lorem ipsum", "Best solution", or repetitive generic claims.
- Use concrete copy blocks: headline, supporting paragraph, and one actionable CTA where relevant.
- Keep mobile-first readability: short paragraphs, scannable spacing, and meaningful heading hierarchy.
- Include at least one trust-building block (proof, metrics, testimonial, partner logos, or case highlight).
- Include at least one objection-handling block (FAQ, comparison, or risk reversal).
- Do not add quizzes or gamified learning mechanics unless explicitly requested.
- Do not stop at a hero-only layout unless explicitly requested.

## Visual Direction

- Do not default to plain white with generic card grid.
- Use a deliberate visual system with CSS variables for color, spacing, radius, and typography.
- Prefer neo-brutalism-inspired UI for generated MVP pages: thick borders, offset shadows, bold blocks, and high-contrast accents.
- Prefer layered backgrounds (gradients, subtle patterns, or geometric shapes) over flat canvases.
- Ensure smooth scrolling is enabled for long-form pages.
- Add purposeful motion where it improves comprehension (section reveal, stagger, emphasis), not random animation.

## Code and Structure

- Use reusable sections and data-driven rendering where possible.
- Keep components focused and readable; split if a file becomes difficult to scan.
- Preserve existing project patterns if a design system already exists in that area.
- Ensure accessibility basics: semantic headings, alt text, sufficient contrast, and keyboard reachable controls.

## Build Loop

When asked to generate frontend quickly:

1. Produce a section blueprint first.
2. Generate or update components.
3. Self-critique against originality, content depth, mobile flow, and CTA clarity.
4. Refine weak sections before finalizing.
