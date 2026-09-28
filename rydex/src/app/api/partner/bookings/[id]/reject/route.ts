import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await context.params).id;
        await connectDb();

        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const partner = await User.findOne({ email: session.user.email });
        if (!partner || partner.role !== "partner") {
            return NextResponse.json({ message: "Partner access required" }, { status: 403 });
        }

        const booking = await Booking.findById(id);
        if (!booking) {
            return NextResponse.json({ message: "Booking not found" }, { status: 404 });
        }

        // SECURITY: Only the assigned driver can reject
        if (String(booking.driver) !== String(partner._id)) {
            return NextResponse.json({ message: "Not authorized for this booking" }, { status: 403 });
        }

        if (booking.bookingStatus !== "requested") {
            return NextResponse.json({ message: "Booking is no longer in requested state" }, { status: 400 });
        }

        booking.bookingStatus = "rejected";
        await booking.save();

        console.log(`[REJECT] bookingId=${booking._id} by driverId=${partner._id}`);

        try {
            await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                event: "reject-booking",
                userId: String(booking.user),
                data: booking.bookingStatus
            });
        } catch (e) {
            console.error("[REJECT] socket emit failed:", e);
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("[REJECT] error:", error);
        return NextResponse.json({ message: "Reject booking error" }, { status: 500 });
    }
}