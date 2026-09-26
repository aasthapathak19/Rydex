import { partnerAccess } from "@/lib/partner-access"
import { onlyFields, validText, VEHICLE_FIELDS } from "@/lib/partner-application"
import Vehicle from "@/models/vehicle.model"

export async function POST(req: Request) {
    try {
        const access = await partnerAccess(true)
        if (access.error) return access.error
        const { partner } = access
        const body: unknown = await req.json()
        if (!onlyFields(body, ["name", "mobileNumber", "type", "number", "vehicleModel"])) {
            return Response.json({ message: "Unsupported application fields" }, { status: 400 })
        }
        const { name, mobileNumber, type, number, vehicleModel } = body
        if (!validText(name, 100) || typeof mobileNumber !== "string" || !/^\+?[0-9]{10,15}$/.test(mobileNumber) ||
            typeof type !== "string" || !["bike", "car", "auto", "loading", "truck"].includes(type) ||
            !validText(vehicleModel, 80) || typeof number !== "string" || !/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{4}$/.test(number.trim().toUpperCase())) {
            return Response.json({ message: "Enter a name, valid phone number and complete vehicle information" }, { status: 400 })
        }
        const vehicleNumber = number.trim().toUpperCase()
        const duplicate = await Vehicle.findOne({ number: vehicleNumber, owner: { $ne: partner._id } }).select("_id")
        if (duplicate) return Response.json({ message: "Vehicle already registered" }, { status: 409 })
        const vehicle = await Vehicle.findOneAndUpdate({ owner: partner._id }, {
            $set: { type, number: vehicleNumber, vehicleModel: vehicleModel.trim(), status: "pending" },
            $unset: { rejectionReason: 1 }
        }, { upsert: true, new: true, runValidators: true }).select(VEHICLE_FIELDS)
        partner.name = name.trim()
        partner.mobileNumber = mobileNumber
        partner.role = "partner"
        partner.partnerStatus = "pending"
        partner.partnerOnBoardingSteps = 1
        partner.partnerApplicationSubmittedAt = undefined
        partner.rejectionReason = undefined
        await partner.save()
        return Response.json(vehicle)
    } catch {
        return Response.json({ message: "Unable to save vehicle information" }, { status: 400 })
    }
}

export async function GET() {
    try {
        const access = await partnerAccess(true)
        if (access.error) return access.error
        return Response.json(await Vehicle.findOne({ owner: access.partner._id }).select(VEHICLE_FIELDS))
    } catch {
        return Response.json({ message: "Unable to load vehicle information" }, { status: 500 })
    }
}
