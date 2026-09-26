import { auth } from "@/auth"
import connectDb from "@/lib/db"
import { PROFILE_FIELDS, VEHICLE_FIELDS } from "@/lib/partner-application"
import User from "@/models/user.model"
import Vehicle from "@/models/vehicle.model"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.email) return Response.json({ message: "Unauthorized" }, { status: 401 })
        await connectDb()
        const admin = await User.findOne({ email: session.user.email }).select("role")
        if (admin?.role !== "admin") return Response.json({ message: "Admin access required" }, { status: 403 })
        const [totalPartners, totalApprovedPartners, totalPendingPartners, totalRejectedPartners, pendingPartnersReviews] = await Promise.all([
            User.countDocuments({ role: "partner" }),
            User.countDocuments({ role: "partner", partnerStatus: "approved" }),
            User.countDocuments({ role: "partner", partnerStatus: "pending", partnerApplicationSubmittedAt: { $ne: null } }),
            User.countDocuments({ role: "partner", partnerStatus: "rejected" }),
            User.find({ role: "partner", partnerStatus: "pending", partnerApplicationSubmittedAt: { $ne: null } }).select(PROFILE_FIELDS)
        ])
        const pendingVehicles = await Vehicle.find({ owner: { $in: pendingPartnersReviews.map(partner => partner._id) }, status: "pending" })
            .select(VEHICLE_FIELDS).populate("owner", "name email")
        return Response.json({ stats: { totalPartners, totalApprovedPartners, totalPendingPartners, totalRejectedPartners }, pendingPartnersReviews, pendingVehicles })
    } catch {
        return Response.json({ message: "Unable to load applications" }, { status: 500 })
    }
}
