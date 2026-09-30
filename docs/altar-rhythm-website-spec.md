# ALTAR Rhythm website: review, specification, and implementation plan

**Status:** Draft for content and integration decisions

**Reviewed:** 2026-09-28

**Source:** [ALTAR RHYTHM Website (Andrew)](https://app.notion.com/p/anthemministries/ALTAR-RHYTHM-Website-Andrew-3e615fd940ff8076a26ec34226ec6353), including its linked Home, Rhythm, Initiatives, Resources, Plant, and email embed pages.
**Target:** The React/Vite public site in this repository. This document specifies changes; it does not authorize a production deployment.

**Implementation progress (2026-09-28):** The public brand and four-page navigation, five-section Home, Rhythm anchors and teaching, Initiatives and Resources pages, and shared Denver-local day helper are implemented. The Home headline, signup jump, prayer card layout, playlist card, and signup palette reflect the browser review. The public signup now embeds the supplied Kit form in the local code; a complete Kit confirmation, delivery, and unsubscribe test and production deployment remain pending. Existing Supabase subscribers remain separate, and their token routes are preserved. The published gatherings projection remains the source for event previews. The October initiative and its 30-playlist cycle end on **October 30**, as confirmed in review; no October 31 playlist is planned. The 60 playlist URLs, live Zoom URL, bookmark, short links, and domain changes remain pending.

**Scripture update (2026-09-30):** The supplied [October Psalm schedule](https://docs.google.com/document/d/1yIY2LtoP0NLjpzoeiMLF_rwuFSBQ-A57/edit) is the repeating monthly plan: five Psalms per day on days 1–30, Proverbs chapter matching the calendar day at noon, and day 31 for catch-up or reflection. Home and Rhythm now use the same schedule.

## Product direction

Make **The ALTAR Rhythm** the public identity and organize the visitor experience around three questions: how to pray today, how the rhythm works, and where to gather. Keep **ALTAR Initiative** as the name for a particular shared season, beginning with October 2026. Keep the private volunteer/coordinator workspace and its access boundaries intact.

The proposed primary navigation is **Home · Rhythm · Initiatives · Resources**. **Plant** is a later release. Public updates belong in a reusable signup section on relevant pages, rather than a primary navigation destination. Preserve the existing `/calendar`, `/updates`, and `/serve` URLs during the transition so shared links and confirmation/unsubscribe flows continue to work.

| Treatment | Items |
| --- | --- |
| Retain | Published public calendar data, the interest-to-approval serving path, private coordinator and volunteer functions, double opt-in and unsubscribe guarantees, and the no-prayer-request boundary. |
| Change | Public brand, navigation, Home content, Rhythm teaching, initiative context, and day-specific content selection. |
| Remove from primary public presentation | “Receive updates” as a top-level nav item, the old initiative-only site lockup, and any expired campaign invitation. Keep their underlying routes or data until replacement behavior is verified. |
| Defer | Plant page, unprovided resources, day-specific music links, the bookmark promise, and short links whose destinations are not ready. |

## What the review found

| Area | Current repository | Requested direction |
| --- | --- | --- |
| Brand | Header says “THE ALTAR INITIATIVE”; brand docs and decision log use that as the product name. | Header and public site say “The ALTAR Rhythm”; initiative becomes the October campaign. |
| Navigation | Home, Rhythm, Gatherings (`/calendar`), Receive updates (`/updates`). | Home, Rhythm, Initiatives, Resources; Plant eventually. |
| Home | Intro, three moments, latest published focus, three upcoming events, serving CTA. | Five sections: introduction; pray today with shared hours, live participation, focus, prayers, playlists; October initiative; rhythm explainer; email/bookmark CTA. |
| Daily focus | Home reads the **latest published** focus, while the Rhythm page uses the browser's local weekday. October focuses are seeded by date. | Both pages show the focus for **today in America/Denver**, with one approved set of weekday names and descriptions. |
| Scripture | Rhythm currently shows weekly focuses only. | Full monthly Psalm reading schedule for days 1–30, the matching daily noon Proverbs chapter, day 31 reflection, and the Lord's Prayer. |
| Gatherings | Public-safe Supabase event projection and calendar exist. | Initiatives page gives campaign context, times, locations, online/in-person details, and signup links; homepage links there. |
| Updates | The original `/updates` used a Supabase double opt-in flow and Resend delivery. | Public pages now reuse the Kit form; the bookmark offer waits for its asset and delivery automation. |
| Resources | No public Resources route. | Playlists, wristbands, teachings, courses, and downloads with actual destinations. |
| Domains | Repository documents `altar.lighthouseprayerroom.org` as the site/auth origin. | `altarrhythm.com` as canonical public domain; `altar.day/...` as managed short links. |

**Content conflicts to resolve:** The Home notes call Tuesday *Revival Tuesdays*, while the Rhythm notes and current seed call it *Ministries Tuesdays*. The Home notes call Wednesday *Next Gen / Awakening Wednesdays* and use slightly different labels for other days. The approved weekday title, summary, and supporting passages must be one shared content set. The Home overview says “4 Section Overview” but lists five sections; implement the five described sections. The source says “MST” while the site calendar uses `America/Denver`; display **Mountain Time** and let the IANA zone handle daylight saving.

## Functional specifications

### S1. Site shell, routes, and brand

- Change the public lockup to **The ALTAR Rhythm** and update page titles, metadata, and public-facing naming. Retain “ALTAR Initiative” where it describes the October campaign.
- Provide `/`, `/rhythm`, `/initiatives`, and `/resources` with responsive navigation, active state, keyboard access, and a working skip link. Omit Plant from primary navigation until its content and launch decision are ready.
- Keep coordinator, portal, access, serve, and token routes functioning. Give `/calendar` a deliberate destination within Initiatives or retain it as the full calendar route linked from Initiatives. Keep `/updates` functional while its subscribers and provider are reconciled.
- Homepage links: “Join the rhythm” → the final signup section on Home; “Today's Prayer Focus” → `/rhythm#weekly-focus`; “Today's Prayers” → `/rhythm#praying-the-scriptures`; gathering details → `/initiatives`; music buttons → their actual platform playlists when supplied. Anchor targets must scroll correctly after client-side navigation and be reachable by keyboard.

### S2. Home

1. **Introduction:** Use the approved brief ALTAR Rhythm invitation and an “Explore the rhythm” action.
2. **Pray with us today:** Show shared prayer hours (morning 6:30–7:30 AM, noon 12–1 PM, evening 5–6 PM Mountain Time), explain that people may pray wherever they are, and show a disabled “Join live on Zoom” button until a publishable meeting URL is supplied. Show the Denver-local weekday focus and the Denver-local day-of-month Psalm assignments. The Lord's Prayer invitation stays fixed; the noon Proverbs chapter matches the day of month on days 1–30. On day 31, show catch-up or reflection without a new reading. Show the day-specific Spotify and Apple Music controls, disabled until verified links exist. The editorial playlist map has one entry per day from October 1–30; October 31 has no playlist.
3. **Current initiative:** Give a short October 1–30, 2026 invitation and lead to `/initiatives` for full schedule and participation details. Avoid implying a gathering runs after its published end date.
4. **Discover the rhythm:** Explain daily moments, weekly focuses, and monthly Scripture cycle, then link to Rhythm.
5. **Carry the rhythm:** Place the reusable updates signup here. Offer the printable bookmark only after the file, consent copy, Kit automation, and delivery email have been verified. Until then, use a truthful updates invitation without promising a download.

When daily content is missing, show a clear editorial fallback; never show a stale focus or a button with a placeholder destination. Treat `America/Denver` as the single calendar day for all visitors, including those outside Colorado.

### S3. Rhythm

- Explain morning, noon, and evening as repeatable prayer practices, distinguishing the personal noon pause from a room booking.
- Show all seven approved weekday focuses with a short description and supporting passages. Mark the current Denver-local day and expose `#weekly-focus`.
- Explain how Scripture shapes prayer. Publish the full, approved 1–30 Psalm assignment table with morning, noon, and evening columns and the matching Proverbs chapter at noon. Mark day 31 for catch-up or reflection. Expose `#praying-the-scriptures` and indicate what happens in shorter months: use only dates that occur, then restart at day 1.
- Include the approved Lord's Prayer wording and a concise explanation of its use at each prayer moment. Do not choose a translation or reproduce a full text until rights and editorial wording are approved.
- Reuse the same date and content helpers as Home, so the two pages cannot disagree around midnight or on a visitor's local date.

### S4. Initiatives and gathering participation

- Make `/initiatives` the canonical explanation of the current and forthcoming campaign: dates, purpose, venue, published morning/evening times, noon participation, online details, and public signup actions.
- Reuse the existing **published public-events projection** for the gathering list or calendar. Keep private room notes, volunteer identities, coverage needs, and shift claims out of public queries and pages.
- Keep “express interest in serving” separate from public campaign signup. A “watchman” commitment may have its own public form only after its fields, consent, destination, and coordinator workflow are defined; it must not grant volunteer portal access or claim shifts.
- Replace or archive the October hero copy after the initiative ends, with a current initiative or evergreen state.

### S5. Resources and later Plant page

- Build `/resources` with sections for playlists, wristbands, teachings, courses, and downloads. Each item needs approved title, description, owner, and valid destination before display. Explain how to use playlists and wristbands; show registration details only for real courses.
- Defer `/plant` until the two pathways have approved copy and support: **Plant an Altar** (ongoing local gathering) and **Launch an Initiative** (focused community season). Answer whom to invite, where to meet, what to do together, and where to get help. Do not put an empty Plant page in navigation.

### S6. Email, consent, and bookmark

- The source includes a Kit form and recommends the heading “Carry the Rhythm Into Your Day.” The current app already has a separate Supabase/Resend double opt-in subscriber flow. Choose one **public marketing list of record** before replacing the form. Recommended: use Kit for public ALTAR Rhythm resources and invitations, while retaining Resend for volunteer and coordinator transactional mail.
- Confirm Kit's double opt-in, unsubscribe behavior, consent wording, form accessibility, responsive layout, and delivery automation in a test subscription. Avoid copying raw third-party form HTML into React. If an embed cannot meet accessibility/consent requirements, use a supported Kit integration path or keep the current flow until it can.
- Do not silently import Supabase subscribers into Kit. Define a consent-preserving migration or keep the existing confirmed list separately until recipients re-subscribe. Preserve `/updates/confirm` and `/updates/unsubscribe` for links already sent.
- The linked Notion embed page contains a URL with an `api_key` parameter. Treat it as a credential: remove the exposed URL from shared notes and rotate the key if it is active. Never copy it into the repository, browser bundle, or spec.

### S7. Domains and short links

- Treat `altarrhythm.com` as the proposed canonical public origin. Inventory current Cloudflare DNS, redirects, certificates, deploy settings, Supabase Auth Site URL/redirect allowlist, Edge Function `SITE_URL`/`ALLOWED_ORIGINS`, and email links before changing traffic. Keep old links working with redirects and verify auth and unsubscribe callbacks end to end.
- Treat `altar.day` as a short-link service with an owner-controlled destination map for `/join`, `/psalms`, `/playlist`, `/wristband`, `/october`, `/give`, and `/guide`. Only publish a slug when its target exists. Use permanent printed links with changeable targets and verify redirects, analytics/privacy expectations, and failure behavior. Domain ownership and DNS settings in the Notion note are proposals, not proof of a working production setup.

## Data and implementation design

1. **Content registry:** Maintain a single reviewed source for the seven weekday names, summaries, and passages; the 30-day Psalm and Proverbs assignments; and playlist URLs. Static versioned content is appropriate for the fixed teaching schedule. Record editorial ownership and a way to update links without touching private scheduling data.
2. **Current focus:** The Home query must select a focus for the current **Denver date**, not the latest `published_at`. The public projection currently omits `focus_date`; add a public-safe date field with a repository migration and verify its RLS/published filtering through the connected Supabase plugin. Use a stable static weekly fallback only if the editors approve it. Never expose `prayer_focuses.volunteer_notes`.
3. **Campaign data:** Reuse `public_events` for published gathering dates and formats. Add campaign metadata only if actual upcoming initiatives need it; a static October introduction can ship first. No new public access to `room_events` or volunteer tables.
4. **Integration boundaries:** Keep marketing signup and bookmark delivery separate from the existing operational email jobs. Do not write subscribers directly from browser code to privileged tables or put Kit keys in Vite environment variables.
5. **Routing and deployment:** Implement public routes in the existing React app. For the eventual new host, verify direct loading of nested routes on Cloudflare and update canonical URLs and callback configuration together.

## Delivery sequence

| Phase | Deliverable | Exit criterion |
| --- | --- | --- |
| 0. Editorial and integration decisions | Approved weekly labels, Psalm table, Lord's Prayer wording, playlist links, Zoom/public signup links, October schedule, bookmark asset, email provider decision, domain owner. | No placeholder links or contradictory copy remain in the content inventory. |
| 1. Public information architecture | Brand, nav, Home structure, Rhythm anchors, Initiatives and Resources pages; old routes preserved. | Mobile/desktop navigation and every internal CTA lead to real content. |
| 2. Daily content | Shared Denver-date logic, approved schedule, published focus query, day-specific music links. | Home and Rhythm agree for all seven weekdays and 1–31, including date boundaries. |
| 3. Participation and email | Initiative schedule and signup actions; chosen marketing form; bookmark delivery when ready. | Public form test confirms consent, delivery, unsubscribe, and no access to private scheduling. |
| 4. Domain launch | Canonical domain, redirects, short links, auth/Edge URL updates, production smoke checks. | Old and new links, nested routes, sign-in, confirm, and unsubscribe work on production; Cloudflare build succeeds. |
| Later | Plant page and broader resource catalog. | Two pathways and support process are approved and functional. |

## Acceptance checks

- A visitor can answer **how to participate today** from Home without entering a private portal.
- At 11:59 PM and 12:01 AM Denver time, Home and Rhythm show the appropriate matching focus, Psalm assignments, Proverb, and, during October 1–30, playlist; a visitor in another time zone sees the same Denver day. No playlist is offered on October 31.
- Every homepage CTA goes to the specified page/anchor or verified external URL; no placeholder music, Zoom, resource, or download links render.
- Initiatives shows only published event data and correct participation mode; expired October copy does not remain a current invitation.
- The public signup clearly states what emails it sends and supports confirmation and unsubscribe. Existing confirmation and unsubscribe links remain valid during any provider transition.
- Private volunteer/coordinator access and the no-prayer-request boundary are unchanged. Anonymous users cannot fetch internal notes, shift data, or subscriber lists.
- Direct loads of all public and token routes work on the final domain; the prior domain redirects without breaking callbacks.

## Decisions needed before build or launch

1. **Weekday content:** Is Tuesday *Ministries* or *Revival*, and which wording/passage set is final for all seven days? The current app and October seed use Ministries.
2. **Scripture/music:** The supplied October document now establishes the repeating 30-day Psalm plan and day 31 reflection. Approved Lord's Prayer wording and the Apple Music/Spotify URL map remain pending.
3. **Participation:** Supply the live Zoom URL policy, October schedule/venue confirmation, and the destination and fields for “watchman” commitment. Clarify whether that differs from the existing serve-interest form.
4. **Email:** Confirm Kit as the public marketing system of record, consent wording, handling of currently confirmed Supabase subscribers, and who owns the bookmark file and delivery automation.
5. **Domains:** Confirm control of `altarrhythm.com` and `altar.day`, the Cloudflare project configuration, and who maintains short-link destinations.

No production mutation is part of this planning document. When implementation is approved, database/Auth/Edge Function work should use the connected Supabase plugin, with matching migrations and verification; static-site changes should be committed and pushed only after review, then the Cloudflare build verified.
