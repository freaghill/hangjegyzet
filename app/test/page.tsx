export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <p>If you can see this, basic Next.js routing is working.</p>
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold">Environment Check:</h2>
        <ul className="mt-2 space-y-1">
          <li>NODE_ENV: {process.env.NODE_ENV}</li>
          <li>App URL: {process.env.NEXT_PUBLIC_APP_URL}</li>
          <li>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Not Set'}</li>
        </ul>
      </div>
    </div>
  )
}