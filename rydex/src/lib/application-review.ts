import { auth } from "@/auth"
import connectDb from "@/lib/db"
import { applicationComplete, onlyFields, PROFILE_FIELDS, validText, VEHICLE_FIELDS } from "@/lib/partner-application"
import User from "@/models/user.model"
import Vehicle from "@/models/vehicle.model"
import mongoose from "mongoose"

export type ReviewContext = { params: Promise<{ id: string }> }
export async function reviewApplication(req: Request, context: ReviewContext, kind: "partner" | "vehicle", action: "read" | "approve" | "reject") {
    try {
        const session = await auth()
        if (!session?.user?.email) return Response.json({ message: "Unauthorized" }, { status: 401 })
        await connectDb()
        const admin = await User.findOne({ email: session.user.email }).select("role")
        if (admin?.role !== "admin") return Response.json({ message: "Admin access required" }, { status: 403 })
        const { id } = await context.params
        if (!mongoose.isValidObjectId(id)) return Response.json({ message: "Application not found" }, { status: 404 })
        const vehicle = await (kind === "partner" ? Vehicle.findOne({ owner: id }) : Vehicle.findById(id)).select(VEHICLE_FIELDS)
        const partner = await User.findById(kind === "partner" ? id : vehicle?.owner).select(PROFILE_FIELDS)
        if (!partner || partner.role !== "partner" || !vehicle) return Response.json({ message: "Application not found" }, { status: 404 })
        if (action === "read") return Response.json({ partner, vehicle })
        if (!partner.partnerApplicationSubmittedAt || !applicationComplete(partner, vehicle)) {
            return Response.json({ message: "The partner must complete and submit the application first" }, { status: 409 })
        }
        if (partner.partnerStatus !== "pending" || vehicle.status !== "pending") {
            return Response.json({ message: "This application is no longer pending review" }, { status: 409 })
        }
        const body: unknown = await req.json()
        if (!onlyFields(body, action === "reject" ? ["reason"] : [])) return Response.json({ message: "Unsupported review fields" }, { status: 400 })
        if (action === "reject" && !validText(body.reason, 500)) return Response.json({ message: "Enter a rejection reason (up to 500 characters)" }, { status: 400 })
        const status = action === "approve" ? "approved" : "rejected"
        const reason = action === "reject" ? (body.reason as string).trim() : undefined
        vehicle.status = status
        vehicle.rejectionReason = reason
        await vehicle.save()
        partner.partnerStatus = status
        partner.rejectionReason = reason
        partner.partnerOnBoardingSteps = 3
        await partner.save()
        return Response.json({ message: action === "approve" ? "Partner application and vehicle approved" : "Partner application rejected" })
    } catch {
        return Response.json({ message: "Unable to review application" }, { status: 500 })
    }
}
