import type { Metadata } from 'next'
import './globals.css'
import '@/components/drawer/Drawer.css'

export const metadata: Metadata = {
  title: 'Drawer Component Test',
  description: 'Interactive test page for the drawer component',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}