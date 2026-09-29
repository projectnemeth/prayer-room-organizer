# Resources page: team feedback implementation

**Source:** Team's “Resources Page” feedback supplied September 29, 2026. Its final “Explanation Behind Sections” is planning context and does not appear on the page.

## Approach

Use one clear sequence on /resources: course, blog, playlists, wristbands, email signup. Numbered editorial sections keep the sequence legible on mobile and desktop. Reuse the site's palette, typography, and existing Kit signup embed. This is static public content; it needs no new table, Auth access, or API.

## Behavior and content

| Section | Public action | Current status |
| --- | --- | --- |
| Corporate Prayer Course | Open the supplied https://altar.day/CPC short link in a new tab | Verified September 29, 2026: it resolves to the Kit page titled “Free Corporate Prayer Course.” |
| Blog | No action until its destination is supplied | Describe the intended articles and say the link is coming soon. |
| Worship Playlists | Spotify and Apple Music controls become links when approved collection URLs are supplied | Disabled controls and an explanatory note until then. Day-specific October links on Home remain in the existing playlist registry. |
| ALTAR wristbands | No purchase action while fulfillment is local only | Explain the NFC purpose and local pay/pickup at The Rock Church. |
| Stay in the Rhythm | “Join the Rhythm” jumps to the existing Kit form on this page | Reuse the published embed and its consent/fallback text. |

## Acceptance checks

- All five sections appear in the requested order and remain readable at narrow widths.
- Every active action has a real target. Missing blog and music destinations are never placeholder links.
- The signup button lands on the form; the form's existing script and fallback behavior remain intact.
- The planning rationale in the feedback is absent from public copy.

## Content needed to finish links

The blog URL, Spotify collection URL, and Apple Music collection URL. If playlists are only day-specific, choose whether this page should link to a collection or a day selector before enabling its platform controls.
