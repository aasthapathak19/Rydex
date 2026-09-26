import { partnerAccess } from "@/lib/partner-access"
import { VEHICLE_FIELDS } from "@/lib/partner-application"
import { validVehicleImage } from "@/lib/vehicle-image"
import uploadOnCloudinary from "@/lib/cloudinary"
import Vehicle from "@/models/vehicle.model"

export async function POST(req: Request) {
    try {
        const access = await partnerAccess()
        if (access.error) return access.error
        const { partner } = access
        const vehicle = await Vehicle.findOne({ owner: partner._id })
        if (!vehicle || !partner.mobileNumber) return Response.json({ message: "Complete your profile and vehicle information first" }, { status: 409 })
        const form = await req.formData()
        const allowed = ["image", "baseFare", "pricePerKM", "waitingCharge"]
        if ([...form.keys()].some(key => !allowed.includes(key) || form.getAll(key).length !== 1)) {
            return Response.json({ message: "Unsupported application fields" }, { status: 400 })
        }
        const pricing = ["baseFare", "pricePerKM", "waitingCharge"].map(key => form.get(key))
        if (pricing.some(value => typeof value !== "string" || value.trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100000)) {
            return Response.json({ message: "Enter valid non-negative prices up to 100000" }, { status: 400 })
        }
        const image = form.get("image")
        if (image !== null && (!(image instanceof File) || !await validVehicleImage(image))) {
            return Response.json({ message: "Upload a JPEG, PNG or WebP vehicle photo up to 5 MB" }, { status: 400 })
        }
        if (!image && !vehicle.imageUrl) return Response.json({ message: "A vehicle photo is required" }, { status: 400 })
        if (image instanceof File) {
            const url = await uploadOnCloudinary(image)
            if (!url) return Response.json({ message: "Vehicle photo upload failed. Please retry." }, { status: 502 })
            vehicle.imageUrl = url
        }
        ;[vehicle.baseFare, vehicle.pricePerKM, vehicle.waitingCharge] = pricing.map(Number)
        vehicle.status = "pending"
        vehicle.rejectionReason = undefined
        await vehicle.save()
        partner.partnerStatus = "pending"
        partner.partnerOnBoardingSteps = 2
        partner.partnerApplicationSubmittedAt = undefined
        partner.rejectionReason = undefined
        await partner.save()
        return Response.json({ message: "Saved. Review your application before submitting." })
    } catch {
        return Response.json({ message: "Unable to save vehicle image and pricing" }, { status: 500 })
    }
}

export async function GET() {
    try {
        const access = await partnerAccess()
        if (access.error) return access.error
        return Response.json(await Vehicle.findOne({ owner: access.partner._id }).select(VEHICLE_FIELDS))
    } catch {
        return Response.json({ message: "Unable to load pricing" }, { status: 500 })
    }
}
