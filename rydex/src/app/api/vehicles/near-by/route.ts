import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb();
        const { latitude, longitude, vehicleType } = await req.json();

        if (!latitude || !longitude) {
            return NextResponse.json({ message: "coordinates not found" }, { status: 400 });
        }

        const lat = Number(latitude);
        const lon = Number(longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return NextResponse.json({ message: "Invalid coordinates" }, { status: 400 });
        }

        console.log(`[NEARBY] searching: lat=${lat} lon=${lon} type=${vehicleType}`);

        const partnerQuery: any = {
            role: "partner",
            isOnline: true,
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        // GeoJSON: [longitude, latitude]
                        coordinates: [lon, lat]
                    },
                    $maxDistance: 50000000  // 50,000km radius to allow easy testing from anywhere
                }
            }
        };

        const partners = await User.find(partnerQuery).lean();
        console.log(`[NEARBY] found ${partners.length} online approved partners within 10km`);

        if (partners.length === 0) {
            return NextResponse.json([], { status: 200 });
        }

        const partnerIds = partners.map((p: any) => p._id);

        const vehicleQuery: any = {
            owner: { $in: partnerIds },
            status: "approved",
            isActive: true,
        };
        // Only filter by type when a valid vehicleType is provided
        if (vehicleType && typeof vehicleType === "string" && vehicleType.trim()) {
            vehicleQuery.type = vehicleType.trim().toLowerCase();
        }

        const vehicles = await Vehicle.find(vehicleQuery)
            .select("owner type vehicleModel number baseFare pricePerKM waitingCharge imageUrl")
            .lean();

        console.log(`[NEARBY] found ${vehicles.length} vehicles matching query`);

        return NextResponse.json(vehicles, { status: 200 });

    } catch (error) {
        console.error("[NEARBY] error:", error);
        return NextResponse.json({ message: "Nearby vehicles error" }, { status: 500 });
    }
}
