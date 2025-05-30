import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Interactive Sound Ball",
  description: "Audio-reactive ASCII ball visualization",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ backgroundColor: "black" }}>
      <body className={`${inter.className} bg-black`} style={{ backgroundColor: "black" }}>
        {children}
      </body>
    </html>
  )
}
