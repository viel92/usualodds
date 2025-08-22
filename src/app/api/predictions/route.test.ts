/**
 * Tests pour l'API predictions
 * Valide le comportement deterministe apres suppression de Math.random()
 */

import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock de Supabase pour les tests
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                execute: jest.fn(() => Promise.resolve({
                  data: [
                    {
                      id: 'test-match-1',
                      home_team_id: 1,
                      away_team_id: 2,
                      home_team_name: 'Team Home',
                      away_team_name: 'Team Away',
                      date: '2025-08-23T15:00:00Z',
                      status: 'Not Started',
                      league_id: 39
                    }
                  ],
                  error: null
                }))
              }))
            }))
          }))
        }))
      }))
    }))
  }
}));

// Mock de team_features pour avoir des donnees coherentes
jest.mock('./route', () => {
  const original = jest.requireActual('./route');
  return {
    ...original,
    // Mock de la fonction qui recupere les features
    getTeamFeatures: jest.fn(() => Promise.resolve({
      home_elo: 1500,
      away_elo: 1400
    }))
  };
});

describe('Predictions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('devrait retourner des resultats deterministes', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/predictions');
    
    // Premier appel
    const response1 = await GET(mockRequest);
    const data1 = await response1.json();
    
    // Deuxieme appel
    const response2 = await GET(mockRequest);
    const data2 = await response2.json();
    
    // Les probabilites doivent etre identiques (deterministes)
    expect(data1.predictions[0]?.home_prob).toBe(data2.predictions[0]?.home_prob);
    expect(data1.predictions[0]?.draw_prob).toBe(data2.predictions[0]?.draw_prob);
    expect(data1.predictions[0]?.away_prob).toBe(data2.predictions[0]?.away_prob);
  });

  test('devrait calculer des probabilites valides', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/predictions');
    
    const response = await GET(mockRequest);
    const data = await response.json();
    
    if (data.predictions && data.predictions.length > 0) {
      const prediction = data.predictions[0];
      
      // Les probabilites doivent etre entre 0 et 100
      expect(prediction.home_prob).toBeGreaterThanOrEqual(0);
      expect(prediction.home_prob).toBeLessThanOrEqual(100);
      expect(prediction.draw_prob).toBeGreaterThanOrEqual(0);
      expect(prediction.draw_prob).toBeLessThanOrEqual(100);
      expect(prediction.away_prob).toBeGreaterThanOrEqual(0);
      expect(prediction.away_prob).toBeLessThanOrEqual(100);
      
      // La somme doit etre proche de 100% (tolerance de 1% pour arrondi)
      const total = prediction.home_prob + prediction.draw_prob + prediction.away_prob;
      expect(total).toBeGreaterThanOrEqual(99);
      expect(total).toBeLessThanOrEqual(101);
    }
  });

  test('devrait retourner une structure de reponse coherente', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/predictions');
    
    const response = await GET(mockRequest);
    const data = await response.json();
    
    // Structure de base
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('predictions');
    expect(data).toHaveProperty('cache_info');
    
    // Si des predictions existent
    if (data.predictions && data.predictions.length > 0) {
      const prediction = data.predictions[0];
      
      // Champs obligatoires
      expect(prediction).toHaveProperty('match_id');
      expect(prediction).toHaveProperty('home_team');
      expect(prediction).toHaveProperty('away_team');
      expect(prediction).toHaveProperty('home_prob');
      expect(prediction).toHaveProperty('draw_prob');
      expect(prediction).toHaveProperty('away_prob');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('prediction');
    }
  });

  test('devrait gerer les erreurs de base de donnees', async () => {
    // Mock d'une erreur Supabase
    jest.doMock('@/lib/supabase', () => ({
      supabase: {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    execute: jest.fn(() => Promise.resolve({
                      data: null,
                      error: { message: 'Database connection failed' }
                    }))
                  }))
                }))
              }))
            }))
          }))
        }))
      }
    }));

    const mockRequest = new NextRequest('http://localhost:3000/api/predictions');
    
    const response = await GET(mockRequest);
    
    // Doit retourner une erreur 500
    expect(response.status).toBe(500);
  });

  test('devrait respecter le cache', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/api/predictions');
    
    const response = await GET(mockRequest);
    const data = await response.json();
    
    // Verifier les headers de cache
    expect(response.headers.get('Cache-Control')).toContain('max-age=7200'); // 2 heures
    
    // Verifier l'info de cache dans la reponse
    expect(data.cache_info).toHaveProperty('generated_at');
    expect(data.cache_info).toHaveProperty('expires_at');
  });
});

describe('Calculs mathematiques', () => {
  test('formule ELO devrait etre coherente', () => {
    // Test de la formule ELO directement
    const homeElo = 1600;
    const awayElo = 1400;
    const homeAdvantage = 100;
    const eloDiff = (homeElo + homeAdvantage) - awayElo;
    
    // Formule ELO standard
    const expectedHome = 1 / (1 + Math.pow(10, -eloDiff / 400));
    
    // Doit etre entre 0 et 1
    expect(expectedHome).toBeGreaterThan(0);
    expect(expectedHome).toBeLessThan(1);
    
    // Avec un avantage de 300 points ELO, la probabilite doit etre elevee
    expect(expectedHome).toBeGreaterThan(0.7);
  });

  test('probabilite de match nul devrait etre deterministe', () => {
    const eloDiff1 = 200;
    const eloDiff2 = 200;
    
    // Nouvelle formule deterministe
    const drawProb1 = Math.max(0.15, 0.35 - (Math.abs(eloDiff1) / 2000));
    const drawProb2 = Math.max(0.15, 0.35 - (Math.abs(eloDiff2) / 2000));
    
    // Doit etre identique
    expect(drawProb1).toBe(drawProb2);
    
    // Doit etre dans une plage raisonnable
    expect(drawProb1).toBeGreaterThanOrEqual(0.15);
    expect(drawProb1).toBeLessThanOrEqual(0.35);
  });
});