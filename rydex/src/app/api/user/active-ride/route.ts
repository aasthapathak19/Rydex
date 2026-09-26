import { auth } from "@/auth"
import connectDb from "@/lib/db"
import Booking from "@/models/booking.model"
import User from "@/models/user.model"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req:NextRequest) {
    try {
         await connectDb()
        const session = await auth()
        if (!session || !session.user?.email) {
            return NextResponse.json({ message: "unauthorized" }
                , { status: 400 }
            )
        }
const {bookingId}=await req.json()

const user = await User.findOne({ email: session.user.email }).select("_id")
if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
const booking=await Booking.findOne({ _id: bookingId, user: user._id })
    .populate("user driver", "name email mobileNumber")
    .populate("vehicle", "type vehicleModel number")
if (!booking) return NextResponse.json({ message: "Ride not found" }, { status: 404 })

return NextResponse.json(booking
                , { status: 200 }
            )

    } catch (error) {
        return NextResponse.json({ message: "get active ride user error" }
                , { status: 500 }
            )
    }
}
