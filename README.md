# Usual Odds - Football Prediction Platform

Internal platform for football match predictions and betting analysis using advanced ML models and Monte Carlo simulation.

## Overview

Usual Odds is a comprehensive football prediction system implementing:

- **Multi-market predictions**: 1X2, Over/Under, Player props, Goal timing
- **Advanced ML models**: Dixon-Coles, Elo, GBM, Player-specific models
- **Monte Carlo simulation**: For fair odds calculation
- **Montante betting system**: All-in bankroll strategy with strict criteria
- **Feature engineering**: Team styles, player synergies, contextual factors

## Architecture

### Data Sources
- **API-Football**: Fixtures, teams, players, odds, statistics
- **Supabase**: Database, real-time updates, edge functions

### ML Pipeline
1. **Data Collection**: Automated collectors for leagues, teams, fixtures, odds
2. **Feature Engineering**: Team/player/context features at T-24, T-6, T-1, T-30 windows
3. **Model Training**: Hierarchical models with temporal validation
4. **Prediction**: Multi-layer ensemble with uncertainty quantification
5. **Simulation**: Monte Carlo for market probabilities and fair odds

### Betting Strategy
- **Decision Window**: T-1h (no information leakage)
- **Criteria**: Odds ≥1.50, EV >0, High confidence
- **Montante**: 100% bankroll stake, reset on loss
- **Correlation**: Max 2-3 legs if uncorrelated

## Setup

### 1. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
# Supabase (create project at supabase.com)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Football (get key at rapidapi.com/api-sports/api/api-football)
API_FOOTBALL_KEY=your_api_football_rapidapi_key
```

### 2. Database Setup

```bash
# Run Supabase migration
npx supabase db push

# Or manually run the SQL in supabase/migrations/001_initial_schema.sql
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Development Server

```bash
npm run dev
```

## Data Collection

### Initial Setup
1. **Initialize Database**: `/admin` → "Initialize" (leagues, teams, players)
2. **Historical Data**: Collect 5 seasons for model training
3. **Daily Collection**: Fixtures and T-24 odds

### Automated Collection
```bash
# Initialize (run once)
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{"action": "initialize"}'

# Daily collection
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{"action": "daily"}'

# Odds updates (T-6, T-1, T-30)
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{"action": "odds"}'
```

## Feature Engineering

### Build Features
```bash
# Build features for all upcoming matches at T-24
curl -X POST http://localhost:3000/api/features \
  -H "Content-Type: application/json" \
  -d '{"action": "build_all", "window": "T24"}'

# Build features for specific match
curl -X POST http://localhost:3000/api/features \
  -H "Content-Type: application/json" \
  -d '{"action": "build_match", "matchId": "uuid", "window": "T1"}'
```

### Feature Categories

**Team Features**:
- Force: Elo, Dixon-Coles attack/defense, form (5/10 games)
- Style: Possession, tempo, pressing, verticality, width
- Set-pieces: Corner/penalty rates for/against
- Context: Rest days, travel, congestion, UCL proximity
- Volatility: Performance variance, giant-killer/choker flags

**Player Features**:
- Role: Expected minutes, starter probability
- Performance: xG/xA/shots/passes per 90
- Set-pieces: Penalty/corner/free-kick taker roles
- Physical: Recent load, injury return, age
- Synergies: Frequent teammate combinations

## File Structure

```
src/
├── app/                    # Next.js app router
│   ├── admin/             # Admin panel for data management
│   ├── matches/           # Matches and predictions UI
│   ├── montante/          # Betting system UI
│   ├── analytics/         # Performance analytics
│   └── api/               # API endpoints
├── lib/
│   ├── collectors/        # Data collection from API-Football
│   ├── features/          # Feature engineering pipeline
│   ├── models/           # ML models (TODO)
│   ├── simulation/       # Monte Carlo simulation (TODO)
│   └── montante/         # Betting system logic (TODO)
├── types/
│   └── database.ts       # TypeScript definitions
└── supabase/
    └── migrations/       # Database schema
```

## API Endpoints

### Data Collection
- `POST /api/collect` - Trigger data collection
- `GET /api/collect` - View available collection actions

### Feature Engineering
- `POST /api/features` - Build/manage features
- `GET /api/features` - View feature endpoints

### Next Steps (TODO)
- Model training pipeline
- Prediction generation
- Monte Carlo simulation
- Montante betting system
- Advanced UI components

## License

Internal use only. Not for distribution.
