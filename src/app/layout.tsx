import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Advonis - German Contract Analysis',
  description: 'AI-powered analysis of German contracts for legal compliance and risk assessment',
  keywords: ['legal tech', 'contract analysis', 'German law', 'BGB', 'compliance', 'Advonis'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-primary-700">
                    Advonis
                  </h1>
                  <span className="ml-2 text-sm text-gray-500">
                    German Contract Analysis
                  </span>
                </div>
                <nav className="flex space-x-4">
                  <span className="text-sm text-gray-600">
                    Powered by AI for German Legal Compliance
                  </span>
                </nav>
              </div>
            </div>
          </header>
          
          <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </main>
          
          <footer className="bg-white border-t mt-auto">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
              <p className="text-center text-sm text-gray-500">
                © 2025 Advonis. Für die Analyse deutscher Verträge entwickelt.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
} 