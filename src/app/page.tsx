import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 items-center">
        <h1 className="text-4xl font-bold">Usual Odds</h1>
        <p className="text-xl text-center max-w-2xl">
          Internal platform for football match predictions and betting analysis
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          <Link href="/matches" className="p-6 border rounded-lg hover:bg-gray-50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">Matches</h2>
            <p className="text-gray-600">View upcoming matches and predictions</p>
          </Link>
          
          <Link href="/montante" className="p-6 border rounded-lg hover:bg-gray-50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">Montante System</h2>
            <p className="text-gray-600">Manage betting strategy and bankroll</p>
          </Link>
          
          <Link href="/analytics" className="p-6 border rounded-lg hover:bg-gray-50 transition-colors">
            <h2 className="text-xl font-semibold mb-2">Analytics</h2>
            <p className="text-gray-600">Model performance and insights</p>
          </Link>
          
          <Link href="/learning" className="p-6 border rounded-lg hover:bg-gray-50 transition-colors bg-blue-50 border-blue-200">
            <h2 className="text-xl font-semibold mb-2">🧠 Apprentissage</h2>
            <p className="text-gray-600">Adaptive learning and error analysis</p>
          </Link>
        </div>
      </main>
    </div>
  );
}