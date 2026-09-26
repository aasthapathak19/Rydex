/** Retired endpoints must never parse bodies, access storage, or call providers. */
export function advancedVerificationUnavailable() {
    return Response.json(
        { code: "FEATURE_UNAVAILABLE", message: "Advanced Verification — Future Incoming" },
        { status: 410, headers: { "Cache-Control": "no-store" } }
    )
}
