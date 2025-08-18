-- Tables pour les modèles adaptatifs Phase 2
-- Performances des modèles individuels et poids d'ensemble

-- Table des performances des modèles individuels
create table model_performance (
    id uuid primary key default uuid_generate_v4(),
    model_name text not null,
    window window_type not null,
    
    -- Métriques de performance
    brier_score numeric(6,4) not null, -- Brier Score (0-1, plus bas = meilleur)
    log_loss numeric(6,4) not null, -- Log Loss (plus bas = meilleur)
    calibration_error numeric(6,4) not null, -- Expected Calibration Error (0-1)
    recent_performance numeric(4,3) not null, -- Performance 30 derniers jours (0-1)
    
    -- Performance par contexte (JSON)
    context_performance jsonb default '{}', -- Performance par condition météo, rivalité, etc.
    
    -- Patterns d'erreur identifiés
    error_patterns text[] default '{}', -- Array de patterns détectés
    
    -- Métadonnées
    total_predictions integer default 0,
    correct_predictions integer default 0,
    accuracy numeric(4,3) generated always as (
        case when total_predictions > 0 
        then correct_predictions::numeric / total_predictions::numeric 
        else 0 end
    ) stored,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    unique(model_name, window)
);

-- Table des poids d'ensemble par fenêtre temporelle
create table ensemble_weights (
    id uuid primary key default uuid_generate_v4(),
    window window_type not null unique,
    
    -- Poids des modèles (JSON: model_name -> weight)
    weights jsonb not null,
    
    -- Performance globale de l'ensemble
    performance numeric(4,3) not null default 0.5,
    
    -- Métadonnées de l'ensemble
    total_models integer generated always as (jsonb_object_length(weights)) stored,
    dominant_model text, -- Modèle avec le plus grand poids
    diversity_score numeric(4,3), -- Mesure de diversité des poids (0-1)
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Table des prédictions d'ensemble (pour tracking)
create table ensemble_predictions (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id) on delete cascade,
    window window_type not null,
    market text not null default '1X2',
    
    -- Prédiction finale
    probability numeric(6,4) not null,
    confidence numeric(4,3) not null,
    
    -- Détails des contributions
    model_contributions jsonb not null, -- Détail contribution de chaque modèle
    ensemble_weights jsonb not null, -- Poids utilisés pour cette prédiction
    
    -- Contexte de la prédiction
    match_context jsonb, -- Contexte du match (météo, rivalité, etc.)
    features jsonb, -- Features agrégées utilisées
    
    -- Résultat et erreur (rempli post-match)
    actual_result numeric(2,1), -- Résultat réel (0, 0.5, 1 pour 1X2)
    prediction_error numeric(6,4), -- |predicted - actual|
    error_type text, -- Type d'erreur identifié
    
    -- Feedback et apprentissage
    feedback_processed boolean default false,
    contributed_to_retraining boolean default false,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    unique(match_id, window, market)
);

-- Table d'historique des réentraînements
create table model_retraining_history (
    id uuid primary key default uuid_generate_v4(),
    
    -- Modèle concerné
    model_name text not null,
    retraining_type text not null, -- 'scheduled', 'performance_degradation', 'error_pattern'
    
    -- Métriques avant/après
    performance_before numeric(4,3),
    performance_after numeric(4,3),
    improvement numeric(5,4) generated always as (performance_after - performance_before) stored,
    
    -- Données d'entraînement
    training_samples integer not null,
    error_samples integer not null,
    training_duration interval,
    
    -- Résultats
    success boolean not null,
    error_message text,
    
    -- Contexte du réentraînement
    trigger_reason text, -- Raison du déclenchement
    error_patterns_addressed text[], -- Patterns d'erreur traités
    
    created_at timestamptz default now()
);

-- Vue pour suivi performance globale
create view model_performance_summary as
select 
    window,
    count(*) as total_models,
    avg(brier_score) as avg_brier_score,
    avg(log_loss) as avg_log_loss,
    avg(calibration_error) as avg_calibration_error,
    avg(recent_performance) as avg_recent_performance,
    max(recent_performance) as best_model_performance,
    min(recent_performance) as worst_model_performance,
    stddev(recent_performance) as performance_std,
    max(updated_at) as last_update
from model_performance
group by window;

-- Vue pour tracking prédictions récentes
create view recent_ensemble_predictions as
select 
    ep.*,
    m.match_date,
    m.status as match_status,
    ht.name as home_team,
    at.name as away_team
from ensemble_predictions ep
join matches m on ep.match_id = m.id
join teams ht on m.home_team_id = ht.id
join teams at on m.away_team_id = at.id
where ep.created_at >= now() - interval '7 days'
order by ep.created_at desc;

-- Indexes pour performance
create index idx_model_performance_model_window on model_performance(model_name, window);
create index idx_model_performance_recent on model_performance(recent_performance desc);
create index idx_model_performance_updated on model_performance(updated_at desc);

create index idx_ensemble_weights_window on ensemble_weights(window);
create index idx_ensemble_weights_performance on ensemble_weights(performance desc);

create index idx_ensemble_predictions_match_window on ensemble_predictions(match_id, window);
create index idx_ensemble_predictions_created on ensemble_predictions(created_at desc);
create index idx_ensemble_predictions_error on ensemble_predictions(prediction_error desc);
create index idx_ensemble_predictions_feedback on ensemble_predictions(feedback_processed) where not feedback_processed;

create index idx_retraining_history_model on model_retraining_history(model_name);
create index idx_retraining_history_created on model_retraining_history(created_at desc);
create index idx_retraining_history_success on model_retraining_history(success);

-- Functions pour calculs automatiques

-- Fonction pour calculer diversité des poids
create or replace function calculate_weight_diversity(weights jsonb)
returns numeric as $$
declare
    weight_values numeric[];
    n integer;
    mean_weight numeric;
    variance numeric;
begin
    -- Extraire valeurs des poids
    select array_agg((value::text)::numeric) into weight_values
    from jsonb_each(weights);
    
    n := array_length(weight_values, 1);
    if n <= 1 then return 0; end if;
    
    -- Calculer moyenne
    select avg(w) into mean_weight from unnest(weight_values) as w;
    
    -- Calculer variance
    select avg(power(w - mean_weight, 2)) into variance 
    from unnest(weight_values) as w;
    
    -- Retourner coefficient de variation normalisé
    return case when mean_weight > 0 then sqrt(variance) / mean_weight else 0 end;
end;
$$ language plpgsql;

-- Trigger pour calculer automatiquement diversité et modèle dominant
create or replace function update_ensemble_metadata()
returns trigger as $$
begin
    -- Calculer diversité
    NEW.diversity_score := calculate_weight_diversity(NEW.weights);
    
    -- Trouver modèle dominant
    select key into NEW.dominant_model
    from jsonb_each(NEW.weights)
    order by (value::text)::numeric desc
    limit 1;
    
    return NEW;
end;
$$ language plpgsql;

create trigger ensemble_weights_metadata_trigger
    before insert or update on ensemble_weights
    for each row execute function update_ensemble_metadata();

-- RLS Policies
alter table model_performance enable row level security;
alter table ensemble_weights enable row level security;
alter table ensemble_predictions enable row level security;
alter table model_retraining_history enable row level security;

-- Allow read access for authenticated users
create policy "Allow read model_performance" on model_performance for select using (true);
create policy "Allow read ensemble_weights" on ensemble_weights for select using (true);
create policy "Allow read ensemble_predictions" on ensemble_predictions for select using (true);
create policy "Allow read retraining_history" on model_retraining_history for select using (true);

-- Service role full access
create policy "Service role full access model_performance" on model_performance for all using (auth.role() = 'service_role');
create policy "Service role full access ensemble_weights" on ensemble_weights for all using (auth.role() = 'service_role');
create policy "Service role full access ensemble_predictions" on ensemble_predictions for all using (auth.role() = 'service_role');
create policy "Service role full access retraining_history" on model_retraining_history for all using (auth.role() = 'service_role');

-- Comments
comment on table model_performance is 'Individual model performance metrics tracked over time';
comment on table ensemble_weights is 'Dynamic weights for ensemble model combination by temporal window';
comment on table ensemble_predictions is 'All ensemble predictions with detailed tracking for learning';
comment on table model_retraining_history is 'History of model retraining events and their outcomes';

comment on column model_performance.brier_score is 'Brier Score: measures accuracy of probabilistic predictions (lower is better)';
comment on column model_performance.calibration_error is 'Expected Calibration Error: measures reliability of confidence scores';
comment on column ensemble_weights.diversity_score is 'Coefficient of variation of weights: measures how evenly distributed the ensemble is';
comment on column ensemble_predictions.feedback_processed is 'Flag indicating if this prediction contributed to model learning';

-- Initial default weights (equal weights for all models)
insert into ensemble_weights (window, weights, performance) values
('T24', '{"poisson": 0.2, "dixon_coles": 0.2, "elo_rating": 0.2, "form_based": 0.2, "weather_adjusted": 0.2}', 0.5),
('T6', '{"poisson": 0.2, "dixon_coles": 0.2, "elo_rating": 0.2, "form_based": 0.2, "weather_adjusted": 0.2}', 0.5),
('T1', '{"poisson": 0.2, "dixon_coles": 0.2, "elo_rating": 0.2, "form_based": 0.2, "weather_adjusted": 0.2}', 0.5),
('T30', '{"poisson": 0.2, "dixon_coles": 0.2, "elo_rating": 0.2, "form_based": 0.2, "weather_adjusted": 0.2}', 0.5);

-- Initial model performances (neutral starting point)
insert into model_performance (model_name, window, brier_score, log_loss, calibration_error, recent_performance) values
-- Poisson model
('poisson', 'T24', 0.25, 0.693, 0.1, 0.5),
('poisson', 'T6', 0.24, 0.680, 0.09, 0.52),
('poisson', 'T1', 0.23, 0.670, 0.08, 0.55),
('poisson', 'T30', 0.23, 0.670, 0.08, 0.55),

-- Dixon-Coles model
('dixon_coles', 'T24', 0.24, 0.685, 0.09, 0.52),
('dixon_coles', 'T6', 0.23, 0.675, 0.08, 0.54),
('dixon_coles', 'T1', 0.22, 0.665, 0.07, 0.57),
('dixon_coles', 'T30', 0.22, 0.665, 0.07, 0.57),

-- Elo rating model
('elo_rating', 'T24', 0.26, 0.700, 0.11, 0.48),
('elo_rating', 'T6', 0.25, 0.690, 0.10, 0.50),
('elo_rating', 'T1', 0.24, 0.680, 0.09, 0.52),
('elo_rating', 'T30', 0.24, 0.680, 0.09, 0.52),

-- Form-based model
('form_based', 'T24', 0.27, 0.710, 0.12, 0.46),
('form_based', 'T6', 0.26, 0.700, 0.11, 0.48),
('form_based', 'T1', 0.25, 0.690, 0.10, 0.50),
('form_based', 'T30', 0.25, 0.690, 0.10, 0.50),

-- Weather-adjusted model
('weather_adjusted', 'T24', 0.28, 0.720, 0.13, 0.44),
('weather_adjusted', 'T6', 0.26, 0.700, 0.11, 0.48),
('weather_adjusted', 'T1', 0.24, 0.680, 0.09, 0.52),
('weather_adjusted', 'T30', 0.24, 0.680, 0.09, 0.52);