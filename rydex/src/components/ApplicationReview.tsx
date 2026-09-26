'use client'
import { useEffect, useState } from "react"
import axios from "axios"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import type { IVehicle } from "@/models/vehicle.model"
import AdvancedVerification from "./AdvancedVerification"
import ApplicationSummary, { type PartnerProfile } from "./ApplicationSummary"

export default function ApplicationReview({ kind }: { kind: "partner" | "vehicle" }) {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [application, setApplication] = useState<{ partner: PartnerProfile; vehicle: IVehicle } | null>(null)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")
    const [reason, setReason] = useState("")
    const [action, setAction] = useState<"approve" | "reject" | null>(null)
    const endpoint = `/api/admin/reviews/${kind}/${id}`
    useEffect(() => {
        let cancelled = false
        axios.get(endpoint).then(({ data }) => { if (!cancelled) setApplication(data) })
            .catch(() => { if (!cancelled) setError("Unable to load this application. Return to the dashboard and retry.") })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [endpoint])
    async function decide() {
        setBusy(true); setError("")
        try {
            await axios.post(`${endpoint}/${action}`, action === "reject" ? { reason } : {})
            router.push("/"); router.refresh()
        } catch (failure) {
            setError(axios.isAxiosError(failure) ? failure.response?.data?.message || "Unable to save review" : "Unable to save review")
        } finally { setBusy(false) }
    }
    const pending = application?.partner.partnerStatus === "pending" && application?.vehicle.status === "pending" && !!application.partner.partnerApplicationSubmittedAt
    return <main className="min-h-screen bg-linear-to-br from-gray-100 to-gray-200 px-4 py-12">
        <div className="mx-auto max-w-5xl space-y-6">
            <Link href="/" className="text-sm underline">Back to admin dashboard</Link>
            <h1 className="text-3xl font-bold">{kind === "partner" ? "Partner Application" : "Vehicle Approval"}</h1>
            {loading ? <p role="status">Loading application…</p> : application && <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2"><ApplicationSummary {...application} /></div>
                <section className="h-fit rounded-3xl bg-white p-6 shadow-sm space-y-4">
                    <h2 className="font-semibold">Application Status</h2>
                    <p className="capitalize">{application.partner.partnerStatus}{!application.partner.partnerApplicationSubmittedAt && application.partner.partnerStatus === "pending" ? " (draft)" : ""}</p>
                    {application.partner.rejectionReason && <p className="text-sm text-red-700">{application.partner.rejectionReason}</p>}
                    <p className="text-sm text-gray-600">Review the basic profile, vehicle photo and pricing. Approval applies to the partner application and vehicle.</p>
                    {pending && <div className="flex flex-col gap-3"><button onClick={() => setAction("approve")} className="rounded-xl bg-black px-4 py-3 text-white">Approve application</button><button onClick={() => setAction("reject")} className="rounded-xl border px-4 py-3">Reject application</button></div>}
                </section>
            </div>}
            {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
            <AdvancedVerification />
            {action && <section role="dialog" aria-modal="true" aria-labelledby="decision-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 space-y-4">
                    <h2 id="decision-title" className="text-xl font-semibold">{action === "approve" ? "Approve application and vehicle?" : "Reject application?"}</h2>
                    <p className="text-sm text-gray-600">This decision covers the submitted profile, vehicle and pricing information.</p>
                    {action === "reject" && <label className="block text-sm">Reason<textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={500} className="mt-2 w-full rounded-xl border p-3" placeholder="Describe what needs to change" /></label>}
                    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                    <div className="flex gap-3"><button disabled={busy} onClick={() => setAction(null)} className="flex-1 rounded-xl border py-3">Cancel</button><button disabled={busy || (action === "reject" && !reason.trim())} onClick={decide} className="flex-1 rounded-xl bg-black py-3 text-white disabled:opacity-40">{busy ? "Saving…" : "Confirm"}</button></div>
                </div>
            </section>}
        </div>
    </main>
}
