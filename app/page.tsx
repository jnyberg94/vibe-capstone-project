import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold text-black mb-8">Choose a UI</h1>

      <div className="flex gap-6">
        <Link href="/auth">
          <Button className="bg-black text-white hover:bg-gray-800 px-8 py-4 text-lg rounded-lg">
            Sign-In/Sign-Up Screen
          </Button>
        </Link>

        <Link href="/dashboard">
          <Button className="bg-black text-white hover:bg-gray-800 px-8 py-4 text-lg rounded-lg">
            Promptr Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
