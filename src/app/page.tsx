'use client'

import Link from "next/link";
import { Button } from "@/components/ui/button-premium";
import { Badge, StatusBadge } from "@/components/ui/badge-premium";
import { Card } from "@/components/ui/card-premium";
import { 
  Target, Zap, Brain, TrendingUp, ArrowRight, Activity, 
  Play, Users, Clock, Trophy, Star, Flame, ChevronRight,
  BarChart3, Shield, Cpu, Eye
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section Style SofaScore */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            {/* Badge Live Style SofaScore */}
            <div className="mb-6">
              <Badge className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                <Activity className="w-3 h-3 mr-1" />
                En direct • 54.2% Précision
              </Badge>
            </div>

            {/* Titre compact style SofaScore */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Prédictions Football IA
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              Interface moderne inspirée de SofaScore pour analyser les matchs de Ligue 1 avec précision
            </p>

            {/* CTA Style SofaScore */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
              <Link href="/predictions">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center">
                  <Play className="w-4 h-4 mr-2" />
                  Voir les Prédictions
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="px-6 py-3 rounded-lg font-medium flex items-center border border-gray-300 hover:bg-gray-50">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>

            {/* Stats rapides style SofaScore */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">19</div>
                <div className="text-sm text-gray-500">Équipes</div>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">54.2%</div>
                <div className="text-sm text-gray-500">Précision</div>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">1760+</div>
                <div className="text-sm text-gray-500">Matchs</div>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">5</div>
                <div className="text-sm text-gray-500">Saisons</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section Style SofaScore */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Interface Style SofaScore
            </h2>
            <p className="text-gray-600">
              Design moderne et intuitif pour l'analyse footballistique
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">IA Avancée</h3>
              <p className="text-gray-600 text-sm">
                Algorithmes d'apprentissage automatique entraînés sur 5 saisons de données Ligue 1
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Interface Compacte</h3>
              <p className="text-gray-600 text-sm">
                Design inspiré de SofaScore avec vue compacte et détaillée, filtres rapides
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Temps Réel</h3>
              <p className="text-gray-600 text-sm">
                Prédictions mises à jour automatiquement avec widgets premium
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Preview Section Style SofaScore */}
      <section className="py-12 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Aperçu de l'Interface
            </h2>
            <p className="text-gray-600">
              Découvrez notre design moderne inspiré des meilleures apps sportives
            </p>
          </div>

          {/* Mock interface preview */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-50 rounded-xl border p-6">
              {/* Mock header */}
              <div className="bg-white rounded-lg border-b p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-6 h-6 bg-gray-300 rounded"></div>
                    <div>
                      <div className="w-32 h-4 bg-gray-300 rounded mb-1"></div>
                      <div className="w-20 h-3 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-16 h-6 bg-blue-600 rounded text-xs text-white flex items-center justify-center">
                      Compact
                    </div>
                    <div className="w-16 h-6 bg-gray-200 rounded"></div>
                  </div>
                </div>
                {/* Mock filters */}
                <div className="flex space-x-2 mt-3">
                  <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs">Tous</div>
                  <div className="px-3 py-1 bg-gray-100 rounded-full text-xs">Aujourd'hui</div>
                  <div className="px-3 py-1 bg-gray-100 rounded-full text-xs">Demain</div>
                </div>
              </div>

              {/* Mock match cards */}
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg p-3 border">
                    <div className="flex items-center justify-between">
                      <div className="w-12 text-center">
                        <div className="text-xs text-gray-500">Sam</div>
                        <div className="text-sm font-semibold">15:00</div>
                      </div>
                      <div className="flex-1 mx-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">PSG</span>
                          <span className="text-sm font-bold text-blue-600">65%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Lyon</span>
                          <span className="text-sm font-bold text-blue-600">25%</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold">
                          75%
                        </div>
                        <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs">1</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-8">
            <Link href="/predictions">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium">
                <Eye className="w-4 h-4 mr-2" />
                Découvrir l'Interface
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* System Status Style SofaScore */}
      <section className="py-8 bg-gray-50 border-t">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-6 mb-4 md:mb-0">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-900">Système en ligne</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600">ML v2.1 Actif</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-gray-600">Dernière MAJ: 2h</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm">
                <Star className="w-3 h-3 mr-1" />
                54.2% Précision
              </Badge>
              <Badge className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-sm">
                <Trophy className="w-3 h-3 mr-1" />
                1760+ Matchs
              </Badge>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}