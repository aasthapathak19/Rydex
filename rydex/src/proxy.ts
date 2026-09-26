import { NextRequest, NextResponse } from "next/server"
import { auth } from "./auth"

const PUBLIC_ROUTES = ["/"]


export async function proxy(req: NextRequest) {

    const { pathname } = req.nextUrl
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico")||
        (!pathname.startsWith("/api/") && /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(pathname))
    ) {
        return NextResponse.next()
    }


    if (PUBLIC_ROUTES.includes(pathname)) {
        return NextResponse.next()
    }
    if (pathname.startsWith("/api/auth")) {
        return NextResponse.next()
    }

    const session = await auth()
    if (!session?.user) {
        if (pathname.startsWith("/api/")) return Response.json({ message: "Unauthorized" }, { status: 401 })
        return NextResponse.redirect(new URL("/", req.url))
    }

    const role = session.user?.role

    if (pathname.startsWith("/api/admin/") && role !== "admin") {
        return Response.json({ message: "Admin access required" }, { status: 403 })
    }
    if (pathname.startsWith("/api/partner/") && role !== "partner" &&
        !(pathname === "/api/partner/onboarding/vehicle" && role === "user")) {
        return Response.json({ message: "Partner access required" }, { status: 403 })
    }

    if (pathname.startsWith("/admin")) {
        if (role != "admin") {
            return NextResponse.redirect(new URL("/", req.url))
        }
    }
    if (pathname.startsWith("/partner")) {
         if(pathname.startsWith("/partner/onboarding")){
              return NextResponse.next()
         }
        if (role != "partner") {
            return NextResponse.redirect(new URL("/", req.url))
        }
    }

    if (pathname.startsWith("/api")) {
        if (!session || !session.user) {
            return Response.json({
                message: "unauthorize"
            }, { status: 401 })
        }
    }

    return NextResponse.next()

}


export const config={
    matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]
}
