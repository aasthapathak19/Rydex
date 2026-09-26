import { reviewApplication, type ReviewContext } from "@/lib/application-review"

export async function GET(req: Request, context: ReviewContext) {
    return reviewApplication(req, context, "vehicle", "read")
}
