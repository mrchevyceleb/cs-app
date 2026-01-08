import '@/app/globals.css'

export const metadata = {
  title: 'R-Link Support Widget',
  description: 'AI-powered customer support widget',
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-transparent">{children}</body>
    </html>
  )
}
