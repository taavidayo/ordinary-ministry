import Link from "next/link"

export default function PublicFooter() {
  return (
    <footer className="border-t bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Ordinary Ministry. All rights reserved.</p>
        <div className="flex gap-4">
          <Link href="/about" className="hover:text-foreground">About</Link>
          <Link href="/contact" className="hover:text-foreground">Contact</Link>
          <Link href="/give" className="hover:text-foreground">Give</Link>
          <Link href="/admin/dashboard" className="hover:text-foreground">Staff Login</Link>
        </div>
      </div>
    </footer>
  )
}
