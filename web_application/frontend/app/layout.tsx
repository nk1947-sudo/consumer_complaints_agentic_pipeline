import type { Metadata } from 'next'
import { Inter, DM_Mono } from 'next/font/google'
import './globals.css'

/* ── Typefaces ───────────────────────────────────────────────────────────── */
const inter = Inter({
  subsets:  ['latin'],
  variable: '--font-sans',
  display:  'swap',
})

const mono = DM_Mono({
  weight:   ['400', '500'],
  subsets:  ['latin'],
  variable: '--font-mono',
  display:  'swap',
})

/* ── Metadata ────────────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  title:       'FinComplaint',
  description: 'Financial complaint triage and remediation platform',
  themeColor:  '#131C2B',
}

/* ── Root layout ─────────────────────────────────────────────────────────── */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`h-full dark ${inter.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="h-full bg-background text-foreground font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
