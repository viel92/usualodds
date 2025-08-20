'use client'

import Link from "next/link";
import { Button } from "@/components/ui/button-premium";
import { Badge, StatusBadge } from "@/components/ui/badge-premium";
import { Card } from "@/components/ui/card-premium";
import { Target, Zap, Brain, TrendingUp, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Pas d'header ici - c'est dans Navigation.tsx */}

      {/* Hero Section Premium avec gradient background */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        {/* Background mesh gradient */}
        <div className="absolute inset-0 gradient-mesh"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge de statut premium */}
            <div className="mb-8">
              <Badge variant="gradient" size="lg" className="shadow-lg">
                <StatusBadge status="online" className="mr-2" />
                Powered by AI • 54.2% Accuracy • Temps réel
              </Badge>
            </div>

            {/* Titre principal avec meilleure hiérarchie */}
            <h1 className="text-display-lg font-black text-neutral-900 mb-6">
              Prédictions Football
              <br />
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Alimentées par IA
              </span>
            </h1>

            {/* Sous-titre amélioré */}
            <p className="text-body-lg text-neutral-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              Système de prédiction avancé utilisant l'apprentissage automatique 
              pour analyser les matchs de Ligue 1 avec une précision validée de <strong>54.2%</strong>
            </p>

            {/* CTA Buttons Premium */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/dashboard">
                <Button size="xl" leftIcon={<TrendingUp className="w-5 h-5" />} rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Voir les Prédictions
                </Button>
              </Link>
              <Link href="/predictions">
                <Button variant="secondary" size="xl" leftIcon={<Target className="w-5 h-5" />}>
                  Explorer les Données
                </Button>
              </Link>
            </div>

            {/* Social Proof Premium */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-8 text-sm">
              <Badge variant="success" dot dotColor="bg-success-500">
                1,760+ matchs analysés
              </Badge>
              <Badge variant="primary" dot dotColor="bg-primary-500">
                Temps réel
              </Badge>
              <Badge variant="secondary" dot dotColor="bg-secondary-500">
                19 équipes Ligue 1
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section Premium */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-headline-lg font-bold text-neutral-900 mb-4">
              Pourquoi UsualOdds ?
            </h2>
            <p className="text-body-lg text-neutral-600 max-w-2xl mx-auto">
              La technologie de pointe au service de la prédiction sportive
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card variant="elevated" interactive="hover" className="group">
              <div className="p-8">
                <div className="p-4 bg-primary-50 text-primary-600 rounded-xl mb-6 inline-flex group-hover:scale-110 transition-transform">
                  <Brain className="w-8 h-8" />
                </div>
                <h3 className="text-headline-md font-bold text-neutral-900 mb-4">IA Avancée</h3>
                <p className="text-neutral-600 leading-relaxed">
                  Algorithmes d'apprentissage automatique entraînés sur 5 saisons de données Ligue 1
                </p>
              </div>
            </Card>

            <Card variant="elevated" interactive="hover" className="group">
              <div className="p-8">
                <div className="p-4 bg-success-50 text-success-600 rounded-xl mb-6 inline-flex group-hover:scale-110 transition-transform">
                  <Target className="w-8 h-8" />
                </div>
                <h3 className="text-headline-md font-bold text-neutral-900 mb-4">54.2% Précision</h3>
                <p className="text-neutral-600 leading-relaxed">
                  Performance validée sur données historiques avec méthodologie rigoureuse
                </p>
              </div>
            </Card>

            <Card variant="elevated" interactive="hover" className="group">
              <div className="p-8">
                <div className="p-4 bg-warning-50 text-warning-600 rounded-xl mb-6 inline-flex group-hover:scale-110 transition-transform">
                  <Zap className="w-8 h-8" />
                </div>
                <h3 className="text-headline-md font-bold text-neutral-900 mb-4">Temps Réel</h3>
                <p className="text-neutral-600 leading-relaxed">
                  Prédictions mises à jour automatiquement avant chaque match
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section Premium */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card variant="gradient" className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-8 md:p-12 text-white">
              <div className="text-center mb-12">
                <h2 className="text-headline-lg font-bold mb-4">
                  Système Opérationnel
                </h2>
                <p className="text-body-lg text-primary-100">
                  Des données fiables pour des prédictions précises
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-black mb-2 animate-bounce-in">19</div>
                  <div className="text-primary-100">Équipes Ligue 1</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-black mb-2 animate-bounce-in">54.2%</div>
                  <div className="text-primary-100">Précision IA</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-black mb-2 animate-bounce-in">1760+</div>
                  <div className="text-primary-100">Matchs analysés</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-black mb-2 animate-bounce-in">5</div>
                  <div className="text-primary-100">Saisons de données</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Final Premium */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-headline-lg font-bold text-neutral-900 mb-6">
            Prêt à découvrir les prédictions ?
          </h2>
          <p className="text-body-lg text-neutral-600 mb-10">
            Accédez dès maintenant au dashboard et explorez nos prédictions temps réel
          </p>
          <Link href="/dashboard">
            <Button size="2xl" leftIcon={<TrendingUp className="w-6 h-6" />} className="shadow-2xl">
              Accéder au Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer déjà dans layout.tsx */}
    </div>
  );
}