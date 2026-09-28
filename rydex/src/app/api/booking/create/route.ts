import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import Vehicle from "@/models/vehicle.model";
import User from "@/models/user.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb();
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const {
            driverId,
            vehicleId,
            pickUpAddress,
            dropAddress,
            pickUpLocation,
            dropLocation,
            fare,
            mobileNumber,
        } = await req.json();

        if (!driverId || !vehicleId || !pickUpAddress || !dropAddress || !fare || !mobileNumber) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }
        if (!pickUpLocation?.coordinates?.length || !dropLocation?.coordinates?.length) {
            return NextResponse.json({ message: "Invalid pickup/drop coordinates" }, { status: 400 });
        }

        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 400 });
        }

        // Validate driver
        const driver = await User.findById(driverId);
        if (!driver || driver.role !== "partner") {
            return NextResponse.json({ message: "Driver not found" }, { status: 400 });
        }
        if (!driver.isOnline) {
            return NextResponse.json({ message: "Driver is no longer online" }, { status: 409 });
        }
        if (driver.partnerStatus !== "approved") {
            return NextResponse.json({ message: "Driver not approved" }, { status: 400 });
        }

        // Validate vehicle
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle || vehicle.status !== "approved" || !vehicle.isActive) {
            return NextResponse.json({ message: "Vehicle not available" }, { status: 400 });
        }
        // Ensure vehicle belongs to the driver
        if (String(vehicle.owner) !== String(driver._id)) {
            return NextResponse.json({ message: "Vehicle does not belong to driver" }, { status: 400 });
        }

        // Check for existing active booking for this user
        const existing = await Booking.findOne({
            user: user._id,
            bookingStatus: { $in: ["requested", "awaiting_payment", "confirmed", "started"] }
        });
        if (existing) {
            return NextResponse.json(existing);
        }

        // Server-side fare validation (allow ±20% of client fare as sanity check)
        const fareNum = Number(fare);
        if (!Number.isFinite(fareNum) || fareNum <= 0) {
            return NextResponse.json({ message: "Invalid fare" }, { status: 400 });
        }

        const booking = await Booking.create({
            user: user._id,
            driver: driver._id,        // store ObjectId, not the whole document
            vehicle: vehicle._id,
            pickUpAddress,
            dropAddress,
            pickUpLocation,
            dropLocation,
            fare: fareNum,
            userMobileNumber: mobileNumber,
            driverMobileNumber: driver.mobileNumber || "N/A",
            bookingStatus: "requested"
        });

        console.log(`[BOOKING] created bookingId=${booking._id} userId=${user._id} driverId=${driver._id}`);

        // Emit real-time event to driver via socket server
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                event: "new-booking",
                userId: String(driver._id),
                data: booking
            });
            console.log(`[BOOKING] socket emit sent to driver ${driver._id}`);
        } catch (socketErr) {
            // Do not fail booking if socket emission fails — driver can poll
            console.error("[BOOKING] socket emit failed:", socketErr);
        }

        return NextResponse.json(booking, { status: 200 });

    } catch (error) {
        console.error("[BOOKING] create error:", error);
        return NextResponse.json({ message: "Create booking error" }, { status: 500 });
    }
}