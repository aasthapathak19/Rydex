import { auth } from "@/auth"
import connectDb from "@/lib/db"
import User from "@/models/user.model"

export async function partnerAccess(allowNew = false) {
    const session = await auth()
    if (!session?.user?.email) return { error: Response.json({ message: "Unauthorized" }, { status: 401 }) }
    await connectDb()
    const partner = await User.findOne({ email: session.user.email })
    if (!partner || (partner.role !== "partner" && !(allowNew && partner.role === "user"))) {
        return { error: Response.json({ message: "Partner access required" }, { status: 403 }) }
    }
    return { partner }
}
