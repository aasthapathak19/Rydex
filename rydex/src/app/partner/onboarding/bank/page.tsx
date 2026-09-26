import AdvancedVerification from "@/components/AdvancedVerification"
import Link from "next/link"

export default function FutureVerificationPage() {
    return <main className="mx-auto min-h-screen max-w-3xl px-4 py-20"><AdvancedVerification /><Link href="/" className="mt-6 inline-block rounded-xl bg-black px-5 py-3 text-white">Return to dashboard</Link></main>
}
