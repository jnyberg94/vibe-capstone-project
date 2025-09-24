import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ErrorPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold text-black">Authentication Error</h1>
        
        <div className="space-y-4">
          <p className="text-gray-600">
            There was an issue with your authentication link. This could be because:
          </p>
          
          <ul className="text-sm text-gray-500 space-y-2 text-left max-w-sm mx-auto">
            <li>• The link has expired</li>
            <li>• The link has already been used</li>
            <li>• The link is invalid</li>
          </ul>
          
          <p className="text-gray-600">
            Please try signing in again with your email address.
          </p>
        </div>

        <Link href="/auth">
          <Button className="bg-black text-white hover:bg-gray-800 rounded-lg py-3 px-6">
            Try Again
          </Button>
        </Link>
      </div>
    </div>
  )
}
