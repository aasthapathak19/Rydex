import type { IVehicle } from "@/models/vehicle.model"

export type PartnerProfile = {
    name: string; email: string; mobileNumber?: string;
    partnerStatus: "pending" | "approved" | "rejected";
    partnerApplicationSubmittedAt?: string; rejectionReason?: string;
}

export default function ApplicationSummary({ partner, vehicle }: { partner: PartnerProfile; vehicle: IVehicle }) {
    const rows = [
        ["Name", partner.name], ["Email", partner.email], ["Phone", partner.mobileNumber || "Not added"],
        ["Vehicle type", vehicle.type], ["Vehicle model", vehicle.vehicleModel], ["Registration number", vehicle.number],
        ["Base fare", vehicle.baseFare == null ? "Not added" : `₹${vehicle.baseFare}`],
        ["Price per KM", vehicle.pricePerKM == null ? "Not added" : `₹${vehicle.pricePerKM}`],
        ["Waiting charge / minute", vehicle.waitingCharge == null ? "Not added" : `₹${vehicle.waitingCharge}`]
    ]
    return <section className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
        <h2 className="text-xl font-semibold">Partner Application</h2>
        <dl className="mt-5 divide-y divide-gray-100">{rows.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><dt className="text-gray-500">{label}</dt><dd className="break-all font-medium">{value}</dd></div>)}</dl>
        {vehicle.imageUrl ? <img src={vehicle.imageUrl} alt="Partner vehicle" className="mt-6 max-h-72 w-full rounded-2xl object-contain bg-gray-50" /> : <p className="mt-4 text-gray-500">Vehicle photo not added.</p>}
    </section>
}
