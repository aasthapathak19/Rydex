import { partnerAccess } from "@/lib/partner-access"
import { applicationComplete, onlyFields } from "@/lib/partner-application"
import Vehicle from "@/models/vehicle.model"

export async function POST(req: Request) {
    try {
        const access = await partnerAccess()
        if (access.error) return access.error
        const body: unknown = await req.json()
        if (!onlyFields(body, [])) return Response.json({ message: "Unsupported application fields" }, { status: 400 })
        const { partner } = access
        const vehicle = await Vehicle.findOne({ owner: partner._id })
        if (!applicationComplete(partner, vehicle)) return Response.json({ message: "Complete your profile, vehicle image and pricing first" }, { status: 409 })
        if (partner.partnerStatus === "approved" && vehicle.status === "approved") return Response.json({ message: "Application already approved" }, { status: 409 })
        vehicle.status = "pending"
        vehicle.rejectionReason = undefined
        await vehicle.save()
        partner.partnerStatus = "pending"
        partner.partnerOnBoardingSteps = 3
        partner.partnerApplicationSubmittedAt = new Date()
        partner.rejectionReason = undefined
        await partner.save()
        return Response.json({ message: "Application submitted for admin review." })
    } catch {
        return Response.json({ message: "Unable to submit application" }, { status: 500 })
    }
}
