'use client'
import { useEffect, useState } from "react"
import Link from "next/link"
import axios from "axios"
import { useSelector } from "react-redux"
import type { RootState } from "@/redux/store"
import type { IVehicle } from "@/models/vehicle.model"
import { hasPricing } from "@/lib/partner-application"
import AdvancedVerification from "./AdvancedVerification"
import PartnerEarning from "./PartnerEarning"

export default function PartnerDashboard() {
    const { userData } = useSelector((state: RootState) => state.user)
    const [vehicle, setVehicle] = useState<IVehicle | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    useEffect(() => {
        axios.get("/api/partner/onboarding/vehicle").then(({ data }) => setVehicle(data))
            .catch(() => setError("Unable to load your application. Refresh to retry."))
            .finally(() => setLoading(false))
    }, [])
    const approved = userData?.partnerStatus === "approved" && vehicle?.status === "approved"
    const rejected = userData?.partnerStatus === "rejected" || vehicle?.status === "rejected"
    const submitted = !!userData?.partnerApplicationSubmittedAt
    const stage = !vehicle || !userData?.mobileNumber ? 1 : !hasPricing(vehicle) ? 2 : 3
    const stages = [["Profile & Vehicle", "vehicle"], ["Vehicle Image & Pricing", "pricing"], ["Review & Submit", "review"]]
    return <main className="min-h-screen bg-linear-to-br from-gray-100 to-gray-200 px-4 pt-28 pb-16">
        <div className="mx-auto max-w-5xl space-y-8">
            <header><h1 className="text-3xl font-bold">Partner Dashboard</h1><p className="mt-2 text-gray-600">Manage your application, vehicle and rides.</p></header>
            {loading || !userData ? <p role="status">Loading application…</p> : error ? <p role="alert">{error}</p> : <>
                <section className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm">
                    <h2 className="text-xl font-semibold">Application Status: {approved ? "Approved" : rejected ? "Rejected" : submitted ? "Under review" : "Draft"}</h2>
                    <p className="mt-3 text-gray-600">{approved ? "Your partner application and vehicle are approved for ride booking." : rejected ? userData.rejectionReason || vehicle?.rejectionReason || "Update your application and resubmit." : submitted ? "Application submitted for admin review." : "Complete the three steps below to submit your application."}</p>
                    {approved && <Link className="mt-5 inline-block rounded-xl bg-black px-5 py-3 text-white" href="/partner/pending-requests">Go to ride requests</Link>}
                </section>
                <ol className="grid gap-4 sm:grid-cols-3">{stages.map(([title, path], index) => <li key={path} className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-xs text-gray-500">Step {index + 1}</p><h3 className="mt-2 font-semibold">{title}</h3>{index + 1 <= stage ? <Link href={`/partner/onboarding/${path}`} className="mt-4 inline-block text-sm underline">{approved || submitted || rejected ? "Review / edit" : "Continue"}</Link> : <p className="mt-4 text-sm text-gray-400">Complete the previous step</p>}</li>)}</ol>
                {(approved || submitted) && <p className="text-sm text-gray-500">Saving changes returns your application to draft. Submit it again for admin review.</p>}
            </>}
            <AdvancedVerification />
            <PartnerEarning />
        </div>
    </main>
}
