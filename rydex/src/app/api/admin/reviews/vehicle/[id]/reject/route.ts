import { reviewApplication, type ReviewContext } from "@/lib/application-review"

export async function POST(req: Request, context: ReviewContext) {
    return reviewApplication(req, context, "vehicle", "reject")
}
