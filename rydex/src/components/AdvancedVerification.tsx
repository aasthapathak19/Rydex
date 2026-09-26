import { Clock3 } from "lucide-react"

export default function AdvancedVerification() {
    return (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
                <Clock3 className="text-gray-500" size={22} aria-hidden="true" />
                <h2 className="text-lg font-semibold">Advanced Verification</h2>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">Future Incoming</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-600">
                Identity verification, document verification, bank payouts and video KYC will be introduced in a future production release.
            </p>
            <p className="mt-2 text-sm text-gray-500">Application approval currently covers basic partner, vehicle and pricing information only.</p>
        </section>
    )
}
