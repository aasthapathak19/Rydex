import Link from "next/link"
import { ArrowRight } from "lucide-react"

export type ReviewItem = { _id: string; name?: string; email?: string; owner?: { name: string; email: string } }
export default function ContentList({ data, type }: { data: ReviewItem[]; type: "partner" | "vehicle" }) {
    if (!data.length) return <div className="rounded-2xl border border-dashed bg-white py-12 text-center"><p className="font-semibold">All caught up</p><p className="mt-2 text-sm text-gray-500">No submitted applications awaiting review.</p></div>
    return <div className="space-y-3">{data.map(item => <div key={item._id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="min-w-0"><p className="font-semibold">{item.name || item.owner?.name || "Partner"}</p><p className="break-all text-sm text-gray-500">{item.email || item.owner?.email}</p></div><Link href={`/admin/reviews/${type}/${item._id}`} className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm text-white">Review <ArrowRight size={16} /></Link></div>)}</div>
}
