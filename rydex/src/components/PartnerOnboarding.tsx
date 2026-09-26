'use client'
import { useEffect, useState, type FormEvent } from "react"
import axios from "axios"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useDispatch } from "react-redux"
import { setUserData } from "@/redux/userSlice"
import type { IVehicle } from "@/models/vehicle.model"
import AdvancedVerification from "./AdvancedVerification"
import ApplicationSummary, { type PartnerProfile } from "./ApplicationSummary"

const paths = ["vehicle", "pricing", "review"]
const titles = ["Profile & Vehicle", "Vehicle Image & Pricing", "Review & Submit"]
const fieldClass = "mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:border-black disabled:bg-gray-100"

export default function PartnerOnboarding({ step }: { step: 1 | 2 | 3 }) {
    const router = useRouter()
    const dispatch = useDispatch()
    const { update } = useSession()
    const [partner, setPartner] = useState<PartnerProfile | null>(null)
    const [vehicle, setVehicle] = useState<IVehicle | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const [name, setName] = useState("")
    const [phone, setPhone] = useState("")
    const [type, setType] = useState("bike")
    const [model, setModel] = useState("")
    const [number, setNumber] = useState("")
    const [prices, setPrices] = useState({ baseFare: "", pricePerKM: "", waitingCharge: "" })
    const [image, setImage] = useState<File | null>(null)
    const [preview, setPreview] = useState("")

    useEffect(() => {
        let cancelled = false
        Promise.all([axios.get("/api/user/me"), axios.get("/api/partner/onboarding/vehicle")]).then(([profile, result]) => {
            if (cancelled) return
            const p = profile.data as PartnerProfile
            const v = result.data as IVehicle | null
            setPartner(p); setVehicle(v); setName(p.name); setPhone(p.mobileNumber || "")
            if (v) { setType(v.type); setModel(v.vehicleModel); setNumber(v.number); setPrices({ baseFare: v.baseFare?.toString() ?? "", pricePerKM: v.pricePerKM?.toString() ?? "", waitingCharge: v.waitingCharge?.toString() ?? "" }) }
        }).catch(() => { if (!cancelled) setError("Unable to load your application. Please refresh to retry.") })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        if (!image) return
        const url = URL.createObjectURL(image)
        setPreview(url)
        return () => URL.revokeObjectURL(url)
    }, [image])

    async function submit(event: FormEvent) {
        event.preventDefault(); setSaving(true); setError("")
        try {
            if (step === 1) {
                await axios.post("/api/partner/onboarding/vehicle", { name, mobileNumber: phone, type, number, vehicleModel: model })
                await update()
            } else if (step === 2) {
                const form = new FormData()
                for (const [key, value] of Object.entries(prices)) form.append(key, value)
                if (image) form.append("image", image)
                await axios.post("/api/partner/onboarding/pricing", form)
            } else await axios.post("/api/partner/onboarding/submit", {})
            const { data } = await axios.get("/api/user/me")
            dispatch(setUserData(data))
            router.push(step === 3 ? "/" : `/partner/onboarding/${paths[step]}`)
            router.refresh()
        } catch (failure) {
            setError(axios.isAxiosError(failure) ? failure.response?.data?.message || "Unable to save. Please retry." : "Unable to save. Please retry.")
        } finally { setSaving(false) }
    }

    return <main className="min-h-screen bg-linear-to-br from-gray-100 to-gray-200 px-4 py-12">
        <div className="mx-auto max-w-3xl space-y-6">
            <Link href="/" className="text-sm font-medium underline">Back to dashboard</Link>
            <header><p className="text-sm text-gray-500">Step {step} of 3</p><h1 className="mt-2 text-3xl font-bold">{titles[step - 1]}</h1></header>
            <ol className="grid grid-cols-3 gap-2 text-xs sm:text-sm">{titles.map((title, index) => <li key={title} aria-current={step === index + 1 ? "step" : undefined} className={`rounded-xl border p-3 ${step === index + 1 ? "bg-black text-white" : "bg-white text-gray-500"}`}>{index + 1}. {title}</li>)}</ol>
            {loading ? <p role="status">Loading application…</p> : partner && <form onSubmit={submit} className="space-y-6">
                {step === 1 && <section className="rounded-3xl bg-white p-6 sm:p-8 space-y-5 shadow-sm">
                    <label className="block text-sm font-medium">Name<input className={fieldClass} value={name} onChange={e => setName(e.target.value)} required maxLength={100} autoComplete="name" /></label>
                    <label className="block text-sm font-medium">Email<input className={fieldClass} value={partner.email} readOnly type="email" /><span className="mt-1 block text-xs text-gray-500">Uses your signed-in account email.</span></label>
                    <label className="block text-sm font-medium">Phone<input className={fieldClass} type="tel" value={phone} onChange={e => setPhone(e.target.value)} required pattern="\+?[0-9]{10,15}" maxLength={16} autoComplete="tel" /></label>
                    <label className="block text-sm font-medium">Vehicle type<select className={fieldClass} value={type} onChange={e => setType(e.target.value)}>{["bike", "auto", "car", "loading", "truck"].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
                    <label className="block text-sm font-medium">Vehicle model<input className={fieldClass} value={model} onChange={e => setModel(e.target.value)} required maxLength={80} placeholder="Tata Ace" /></label>
                    <label className="block text-sm font-medium">Vehicle registration number<input className={fieldClass} value={number} onChange={e => setNumber(e.target.value.toUpperCase())} required maxLength={12} placeholder="MH12AB1234" /></label>
                </section>}
                {step > 1 && !vehicle && <p>Complete your <Link href="/partner/onboarding/vehicle" className="underline">profile and vehicle information</Link> first.</p>}
                {step === 2 && vehicle && <section className="rounded-3xl bg-white p-6 sm:p-8 space-y-5 shadow-sm">
                    <label className="block text-sm font-medium">Vehicle photo<input className={fieldClass} type="file" accept="image/jpeg,image/png,image/webp" required={!vehicle.imageUrl} onChange={e => setImage(e.target.files?.[0] || null)} /></label>
                    <p className="text-sm text-gray-500">Upload only a photo of the vehicle (JPEG, PNG or WebP, up to 5 MB). Do not upload identity or registration documents.</p>
                    {(preview || vehicle.imageUrl) && <img src={preview || vehicle.imageUrl} alt="Vehicle photo preview" className="max-h-64 w-full rounded-xl object-contain" />}
                    {([ ["baseFare", "Base fare"], ["pricePerKM", "Price per KM"], ["waitingCharge", "Waiting charge / minute"] ] as const).map(([key, label]) => <label key={key} className="block text-sm font-medium">{label} (₹)<input className={fieldClass} type="number" min="0" max="100000" step="0.01" required value={prices[key]} onChange={e => setPrices(previous => ({ ...previous, [key]: e.target.value }))} /></label>)}
                </section>}
                {step === 3 && vehicle && <><ApplicationSummary partner={partner} vehicle={vehicle} /><p className="text-sm text-gray-600">Review the details above. Submitting sends your application to an admin for review.</p></>}
                <div className="flex flex-wrap gap-3">
                    {step > 1 && <Link className="rounded-xl border px-5 py-3" href={`/partner/onboarding/${paths[step - 2]}`}>Back</Link>}
                    <button disabled={saving || (step > 1 && !vehicle)} className="rounded-xl bg-black px-6 py-3 font-semibold text-white disabled:opacity-40">{saving ? "Saving…" : step === 3 ? "Submit application" : "Save & Continue"}</button>
                </div>
            </form>}
            {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
            <AdvancedVerification />
        </div>
    </main>
}
