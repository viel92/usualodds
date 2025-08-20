'use client'

import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header moderne */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ⚽ UsualOdds
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 font-medium">
                Dashboard
              </Link>
              <Link href="/predictions" className="text-gray-600 hover:text-gray-900 font-medium">
                Prédictions
              </Link>
              <Link 
                href="/dashboard"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Commencer
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section Premium */}
      <section className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge de statut */}
            <div className="inline-flex items-center px-4 py-2 mb-8 bg-blue-50 border border-blue-200 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-blue-700">
                ✨ Système opérationnel • 54.2% Accuracy • Temps réel
              </span>
            </div>

            {/* Titre principal */}
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 leading-tight">
              Prédictions Football
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Alimentées par IA
              </span>
            </h1>

            {/* Sous-titre */}
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              Système de prédiction avancé utilisant l'apprentissage automatique 
              pour analyser les matchs de Ligue 1 avec une précision validée de 54.2%
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link 
                href="/dashboard"
                className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl flex items-center justify-center"
              >
                🚀 Voir les Prédictions
              </Link>
              <Link 
                href="/predictions"
                className="bg-white text-gray-700 px-8 py-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 font-semibold text-lg flex items-center justify-center"
              >
                📊 Explorer les Données
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>1,760+ matchs analysés</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Temps réel</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>19 équipes Ligue 1</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Pourquoi UsualOdds ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              La technologie de pointe au service de la prédiction sportive
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">IA Avancée</h3>
              <p className="text-gray-600 leading-relaxed">
                Algorithmes d'apprentissage automatique entraînés sur 5 saisons de données Ligue 1
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">54.2% Précision</h3>
              <p className="text-gray-600 leading-relaxed">
                Performance validée sur données historiques avec méthodologie rigoureuse
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Temps Réel</h3>
              <p className="text-gray-600 leading-relaxed">
                Prédictions mises à jour automatiquement avant chaque match
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Système Opérationnel
              </h2>
              <p className="text-xl text-blue-100">
                Des données fiables pour des prédictions précises
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-black mb-2">19</div>
                <div className="text-blue-100">Équipes Ligue 1</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-black mb-2">54.2%</div>
                <div className="text-blue-100">Précision IA</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-black mb-2">1760+</div>
                <div className="text-blue-100">Matchs analysés</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-black mb-2">5</div>
                <div className="text-blue-100">Saisons de données</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Prêt à découvrir les prédictions ?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Accédez dès maintenant au dashboard et explorez nos prédictions temps réel
          </p>
          <Link 
            href="/dashboard"
            className="bg-blue-600 text-white px-10 py-5 rounded-xl hover:bg-blue-700 transition-all duration-200 font-bold text-xl shadow-xl hover:shadow-2xl inline-flex items-center"
          >
            🚀 Accéder au Dashboard
          </Link>
        </div>
      </section>

      {/* Footer Simple */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2025 UsualOdds. Système de prédictions football alimenté par IA.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}