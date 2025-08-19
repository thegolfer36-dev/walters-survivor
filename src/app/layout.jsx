 
export const metadata = {
  title: 'Walters Survivor League',
  description: 'NFL Survivor Pool',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-gray-100 min-h-screen">
        <nav className="bg-blue-800 text-white p-4">
          <div className="container mx-auto">
            <h1 className="text-xl font-bold">Walters Survivor League</h1>
            <div className="mt-2 space-x-4">
              <a href="/" className="hover:underline">Picks</a>
              <a href="/leaderboard" className="hover:underline">Leaderboard</a>
              <a href="/admin" className="hover:underline">Admin</a>
            </div>
          </div>
        </nav>
        <main className="container mx-auto p-4">
          {children}
        </main>
      </body>
    </html>
  );
}