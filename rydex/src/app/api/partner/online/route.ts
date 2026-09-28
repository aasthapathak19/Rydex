import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

// POST /api/partner/online  — toggle driver online/offline status
export async function POST(req: NextRequest) {
    try {
        await connectDb();
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { isOnline } = await req.json();
        if (typeof isOnline !== "boolean") {
            return NextResponse.json({ message: "isOnline must be a boolean" }, { status: 400 });
        }

        const partner = await User.findOne({ email: session.user.email });
        if (!partner || partner.role !== "partner") {
            return NextResponse.json({ message: "Partner access required" }, { status: 403 });
        }
        if (partner.partnerStatus !== "approved") {
            return NextResponse.json({ message: "Your account is not approved yet" }, { status: 403 });
        }

        partner.isOnline = isOnline;
        if (!isOnline) {
            // clear location when going offline so stale coords don't persist
            partner.socketId = null;
        }
        await partner.save();

        console.log(`[ONLINE] partner ${partner._id} isOnline=${isOnline}`);
        return NextResponse.json({ isOnline: partner.isOnline });
    } catch (error) {
        console.error("[ONLINE] error:", error);
        return NextResponse.json({ message: "Toggle online error" }, { status: 500 });
    }
}
