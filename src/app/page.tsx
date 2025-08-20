import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <main className="text-center">
          {/* Hero */}
          <div className="mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              ⚽ UsualOdds
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Système de prédiction de matchs de football utilisant l'intelligence artificielle
              et l'apprentissage automatique pour générer des prédictions précises
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>1760 matchs analysés</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>IA opérationnelle</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Prédictions temps réel</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <Link href="/dashboard" className="group">
              <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent group-hover:border-blue-200">
                <div className="text-4xl mb-4">📊</div>
                <h2 className="text-2xl font-semibold mb-3 text-gray-900">Dashboard</h2>
                <p className="text-gray-600 mb-4">
                  Visualisez toutes les prédictions en cours avec probabilités détaillées
                </p>
                <div className="text-blue-600 font-medium group-hover:text-blue-700">
                  Voir les prédictions →
                </div>
              </div>
            </Link>

            <Link href="/predictions" className="group">
              <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent group-hover:border-green-200">
                <div className="text-4xl mb-4">🔮</div>
                <h2 className="text-2xl font-semibold mb-3 text-gray-900">Prédictions Live</h2>
                <p className="text-gray-600 mb-4">
                  Interface temps réel pour suivre les prédictions avec mise à jour automatique
                </p>
                <div className="text-green-600 font-medium group-hover:text-green-700">
                  Accéder au live →
                </div>
              </div>
            </Link>

            <Link href="/admin" className="group">
              <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent group-hover:border-purple-200">
                <div className="text-4xl mb-4">⚙️</div>
                <h2 className="text-2xl font-semibold mb-3 text-gray-900">Administration</h2>
                <p className="text-gray-600 mb-4">
                  Gestion système, collecte données, entraînement modèles IA
                </p>
                <div className="text-purple-600 font-medium group-hover:text-purple-700">
                  Panel admin →
                </div>
              </div>
            </Link>
          </div>

          {/* Stats rapides */}
          <div className="bg-white rounded-xl shadow-md p-8">
            <h3 className="text-xl font-semibold mb-6">Système Opérationnel</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">18</div>
                <div className="text-gray-600">Équipes Ligue 1</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">75%</div>
                <div className="text-gray-600">Confiance IA</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">7</div>
                <div className="text-gray-600">Prédictions actives</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">5</div>
                <div className="text-gray-600">Saisons analysées</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}