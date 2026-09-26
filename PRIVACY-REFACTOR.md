# Partner application privacy refactor

## Current behavior

Rydex collects a basic partner profile (name, signed-in email, phone), vehicle type/model/registration number, vehicle photo and pricing. The three active steps are Profile & Vehicle → Vehicle Image & Pricing → Review & Submit. Submission displays “Application submitted for admin review.”

Admin review covers this application and vehicle together. Approval does not represent identity, document, bank or video verification. Editing a saved application resets it to draft and requires submission and approval again. Already-approved partners with approved vehicles remain usable. Incomplete legacy applications resume from their available profile/vehicle/pricing data, without relying on old KYC step numbers. Legacy drafts must explicitly submit before appearing in the review queue.

## Main files changed

- `rydex/src/components/PartnerOnboarding.tsx`, `PartnerDashboard.tsx`, `ApplicationSummary.tsx`: three-step form, dashboard status and shared review details.
- `rydex/src/components/AdminDashboard.tsx`, `ApplicationReview.tsx`, `ContentList.tsx`: submitted application queues and approval/rejection, including vehicle photo and pricing.
- `rydex/src/components/AdvancedVerification.tsx`: reusable “Advanced Verification — Future Incoming” card used on onboarding, dashboards, reviews and retired pages.
- `rydex/src/app/partner/onboarding/{vehicle,pricing,review}/page.tsx` and `src/app/admin/reviews/{partner,vehicle}/[id]/page.tsx`: page entry points.
- `rydex/src/app/api/partner/onboarding/{vehicle,pricing,submit}/route.ts`: explicit field allowlists, validation, draft/submitted state, vehicle-only uploads.
- `rydex/src/lib/{partner-access,partner-application,application-review,vehicle-image,advanced-verification}.ts`: shared access checks, validation, review handlers and disabled endpoint response.
- `rydex/src/app/api/admin/dashboard/route.ts` and all six partner/vehicle review routes: admin database-role checks, safe fields, review only after submission. Approval actions now use POST, not GET.
- Both User schemas, `auth.ts`, `proxy.ts`, `api/user/me`: removed obsolete fields, safe serialization, refreshed database roles after onboarding, protected API role checks. Fixed the existing first-Google-sign-in null-user bug.
- `api/vehicles/near-by`, `VehicleCard.tsx`, booking-history and active-ride APIs: discovery omits vehicle images and registration numbers; booking participants retain vehicle identification. Active-ride lookup now enforces rider ownership. Populated users are limited to basic contact fields.
- `Footer.tsx`, `layout.tsx`, `CheckOutContent.tsx`: honest product positioning; removed the unsupported verified/insured-driver claim.
- Cloudinary helper: raster vehicle images only (JPEG/PNG/WebP), plus upload size/signature validation at the only remaining upload route. Other API/UI edits remove payload/error debug logging and raw exception responses.
- Package manifest/lock, root and socket `.gitignore`, and `rydex/tests/partner-privacy.test.mjs`.

## Removed and disabled

Removed `partnerDocs.model.ts`, `partnerBank.model.ts`, `DocPreview.tsx`, the obsolete `PricingModal.tsx`, and `@zegocloud/zego-uikit-prebuilt` from dependencies.

These compatibility endpoints return HTTP 410 with `FEATURE_UNAVAILABLE`. Their handlers do not read request bodies, connect to MongoDB, upload files, create rooms or call any provider:

- `/api/partner/onboarding/documents`
- `/api/partner/onboarding/bank`
- `/api/partner/video-kyc/request`
- `/api/admin/video-kyc/pending`
- `/api/admin/video-kyc/start/[id]`
- `/api/admin/video-kyc/complete`

GET/POST/PUT/PATCH/DELETE are explicitly disabled; unsupported methods are rejected by Next.js. Existing authentication/role checks can reject callers earlier. Old document/bank onboarding pages and `/video-kyc/[roomId]` show the Future Incoming card only, with no form, camera access or API calls.

Removed `videoKycStatus`, `videoKycRoomId`, `videoKycRejectionReason` from both app and socket User schemas. Active `partnerOnBoardingSteps` is now 0–3; `partnerApplicationSubmittedAt` distinguishes an explicitly submitted application from a legacy stage number. User JSON serialization allowlists supported fields so historical MongoDB fields, passwords and email OTPs cannot leak through full-document responses.

## Environment and existing stored data

- `NEXT_PUBLIC_ZEGO_APP_ID` and `NEXT_PUBLIC_ZEGO_SERVER_SECRET` have no remaining runtime consumers. No local environment values were deleted or displayed.
- All three `CLOUDINARY_*` credentials remain required for vehicle photos. Razorpay, Google auth, email, MongoDB, maps, Gemini and Socket.IO settings remain in use.
- `rydex/.env.local` and `socketServer/.env` were already tracked. They are now removed from the Git index, with local copies preserved. `.env` and `.env.*` are ignored at all project levels. Git reports no remaining tracked environment files.
- Removing files from Git tracking does **not** remove historical commits. Rotate previously committed credentials, especially the former public video-service secret, and arrange repository-history cleanup.
- No live database, Cloudinary assets or backups were deleted. Removing a Mongoose model does **not** erase existing `partnerdocs` / `partnerbanks` records or legacy User fields. An operator must audit and purge any historical sensitive records/assets and retained backups under the intended retention policy. Identify old document assets before deleting their database references; keep vehicle photos. Restart/deploy both services to replace cached schemas and old endpoint code. The new source does not query those collections or expose historical fields.

## Validation

- `npm test`: 18 passing tests. Includes all six retired endpoints and write methods, unknown sensitive fields, invalid file types, role restrictions, complete mocked onboarding/approval/rejection/resubmission, legacy-field suppression, discovery privacy and ride ownership.
- Regression coverage also exercises credentials/first Google sign-in/role refresh, booking creation/acceptance, cash and Razorpay contracts, pickup/drop OTP lifecycle, chat, Gemini replies and Socket.IO ride rooms/location events.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed (the initial sandbox attempt could not fetch existing Google Fonts; the network-enabled retry succeeded).
- Focused ESLint on new/reworked onboarding, reviews, APIs, helpers, models and tests: zero errors, two existing-style `<img>` optimization warnings.
- Full `npm run lint`: 131 errors remain versus 216 before the refactor, primarily existing hook naming and explicit-any rules outside the rewritten flows. No refactor-caused TypeScript/build errors remain.
- `node --check` for both socket files and `git diff --check`: passed.
- Final source scan: verification terminology remains only in future-feature copy, retired paths, synthetic regression fixtures and this report. Browser DOM `document`, Mongoose `Document`/`countDocuments`, and email/pickup/drop OTP verification are intentionally retained.
- Tests use synthetic in-memory model/provider substitutes. No real charges, production uploads or database mutations were performed. Live browser onboarding, OAuth redirects, GPS/maps and third-party integrations still require a staging smoke test.

## Existing security concerns outside this refactor

The original Socket.IO server trusts client identity/room membership and exposes `/emit` without authentication. Several booking, OTP, chat and payment handlers still rely on broad session access rather than per-booking ownership checks (the active-ride data disclosure was fixed here). Harden those boundaries before production. Package removal also reported 24 dependency vulnerabilities (including four critical); no unrelated dependency upgrades were made.
