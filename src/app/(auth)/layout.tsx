export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <span className="text-2xl font-bold text-indigo-600 mb-6">FreshCRM</span>
      {children}
    </div>
  )
}
