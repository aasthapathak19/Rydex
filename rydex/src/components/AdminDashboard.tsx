'use client'
import { useEffect, useState } from "react"
import axios from "axios"
import { CheckCircle2, Clock, Truck, Users, XCircle } from "lucide-react"
import Kpi from "./Kpi"
import TabButton from "./TabButton"
import ContentList, { type ReviewItem } from "./ContentList"
import AdminEarning from "./AdminEarning"
import AdvancedVerification from "./AdvancedVerification"

type Dashboard = { stats: { totalPartners: number; totalApprovedPartners: number; totalPendingPartners: number; totalRejectedPartners: number }; pendingPartnersReviews: ReviewItem[]; pendingVehicles: ReviewItem[] }
export default function AdminDashboard() {
    const [data, setData] = useState<Dashboard | null>(null)
    const [tab, setTab] = useState<"partner" | "vehicle">("partner")
    const [error, setError] = useState("")
    useEffect(() => {
        axios.get("/api/admin/dashboard").then(result => setData(result.data)).catch(() => setError("Unable to load applications. Refresh to retry."))
    }, [])
    return <main className="min-h-screen bg-linear-to-br from-gray-100 to-gray-200 px-4 py-12">
        <div className="mx-auto max-w-7xl space-y-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            {error ? <p role="alert" className="text-red-700">{error}</p> : !data ? <p role="status">Loading applications…</p> : <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Kpi label="Total Partners" value={data.stats.totalPartners} icon={<Users />} variant="totalPartners" />
                    <Kpi label="Approved Applications" value={data.stats.totalApprovedPartners} icon={<CheckCircle2 />} variant="approved" />
                    <Kpi label="Pending Applications" value={data.stats.totalPendingPartners} icon={<Clock />} variant="pending" />
                    <Kpi label="Rejected Applications" value={data.stats.totalRejectedPartners} icon={<XCircle />} variant="rejected" />
                </div>
                <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm">
                    <TabButton active={tab === "partner"} count={data.pendingPartnersReviews.length} icon={<Users size={16} />} onClick={() => setTab("partner")}>Partner Applications</TabButton>
                    <TabButton active={tab === "vehicle"} count={data.pendingVehicles.length} icon={<Truck size={16} />} onClick={() => setTab("vehicle")}>Vehicle Reviews</TabButton>
                </div>
                <ContentList data={tab === "partner" ? data.pendingPartnersReviews : data.pendingVehicles} type={tab} />
            </>}
            <AdvancedVerification />
            <AdminEarning />
        </div>
    </main>
}
