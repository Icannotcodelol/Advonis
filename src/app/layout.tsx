import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Advonis - German Contract Analysis',
  description: 'AI-powered analysis of German contracts for legal compliance and risk assessment',
  keywords: ['legal tech', 'contract analysis', 'German law', 'BGB', 'compliance', 'Advonis'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="glass-nav fixed top-6 left-1/2 -translate-x-1/2 z-50 flex gap-8 px-8 py-3 items-center shadow-glass backdrop-blur-glass">
          <a href="/" className="text-authority font-bold text-lg hover:text-accent transition-colors">LexChecker</a>
          <a href="/analyze" className="text-authority/80 font-medium hover:text-accent transition-colors">Analyze</a>
          <a href="/settings" className="text-authority/80 font-medium hover:text-accent transition-colors">Settings</a>
        </nav>
        <div className="pt-24 max-w-6xl mx-auto px-4">
          {children}
        </div>
      </body>
    </html>
  );
} 