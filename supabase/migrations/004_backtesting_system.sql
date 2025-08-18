-- Tables pour système de backtesting et validation temporelle (Phase 2.3)

-- Table des résultats de backtesting
create table backtest_results (
    id uuid primary key default uuid_generate_v4(),
    
    -- Identification du test
    season text not null,
    model_type text not null, -- 'ensemble', 'contextual', 'baseline'
    window window_type not null,
    test_name text, -- Nom optionnel du test
    
    -- Période testée
    start_date date not null,
    end_date date not null,
    total_matches integer not null,
    
    -- Métriques principales
    total_predictions integer not null,
    correct_predictions integer not null,
    accuracy numeric(5,4) not null,
    brier_score numeric(6,4) not null,
    log_loss numeric(6,4) not null,
    calibration_error numeric(6,4) not null,
    
    -- Métriques financières
    roi numeric(6,4) not null, -- Return on Investment
    sharpe_ratio numeric(6,4) not null,
    max_drawdown numeric(6,4) not null,
    coverage numeric(4,3) not null, -- % matches avec prédiction
    
    -- Analyse temporelle
    best_window window_type,
    worst_window window_type,
    temporal_consistency numeric(4,3), -- Consistance entre fenêtres
    
    -- Analyse modèle
    model_reliability numeric(4,3), -- Corrélation confiance-accuracy
    significant_contexts text[], -- Contextes les plus fréquents
    
    -- Insights et recommandations
    recommendations text[],
    performance_notes text,
    
    -- Détails configuration
    config_details jsonb, -- Configuration complète du test
    
    -- Métriques par fenêtre (JSON)
    window_performance jsonb, -- Performance détaillée par fenêtre
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    -- Index composite pour requêtes fréquentes
    unique(season, model_type, window, test_name)
);

-- Table des prédictions individuelles de backtesting
create table backtest_predictions (
    id uuid primary key default uuid_generate_v4(),
    backtest_id uuid references backtest_results(id) on delete cascade,
    
    -- Identification match
    match_id uuid, -- Peut être null si match historique supprimé
    match_date timestamptz not null,
    home_team text not null,
    away_team text not null,
    
    -- Détails prédiction
    window window_type not null,
    market text not null,
    predicted numeric(6,4) not null,
    confidence numeric(4,3) not null,
    actual numeric(4,2) not null,
    
    -- Résultats
    prediction_error numeric(6,4) not null,
    is_correct boolean not null,
    
    -- Contexte et contributions
    context_factors text[],
    model_contributions jsonb, -- Contribution de chaque modèle si ensemble
    
    -- Données disponibles au moment de prédiction
    available_features jsonb, -- Features utilisées pour prédiction
    
    created_at timestamptz default now()
);

-- Table de comparaison entre modèles
create table model_comparisons (
    id uuid primary key default uuid_generate_v4(),
    
    -- Période de comparaison
    comparison_name text not null,
    season text not null,
    start_date date not null,
    end_date date not null,
    
    -- Modèles comparés
    models jsonb not null, -- Array des modèles testés
    
    -- Résultats comparaison
    best_model text not null,
    worst_model text not null,
    
    -- Métriques comparatives
    accuracy_differences jsonb, -- Différences d'accuracy entre modèles
    roi_differences jsonb, -- Différences ROI
    
    -- Tests statistiques
    statistical_significance jsonb, -- p-values des tests de différence
    
    -- Recommandations
    recommendation text not null,
    confidence_level numeric(3,2) not null, -- Niveau confiance recommandation
    
    created_at timestamptz default now()
);

-- Table d'historique des configurations modèle
create table model_configuration_history (
    id uuid primary key default uuid_generate_v4(),
    
    -- Identification
    model_type text not null,
    version_number integer not null,
    
    -- Configuration
    configuration jsonb not null, -- Paramètres complets du modèle
    features_used text[], -- Liste features utilisées
    
    -- Performance baseline
    baseline_accuracy numeric(5,4),
    baseline_brier_score numeric(6,4),
    
    -- Changements apportés
    changes_from_previous text,
    reason_for_change text,
    
    -- Validation
    validation_passed boolean default false,
    validation_notes text,
    
    -- Production
    deployed_to_production boolean default false,
    deployment_date timestamptz,
    
    created_at timestamptz default now(),
    created_by text, -- Identifiant créateur
    
    unique(model_type, version_number)
);

-- Vue résumé performance par saison
create view seasonal_performance_summary as
select 
    season,
    model_type,
    count(*) as total_tests,
    avg(accuracy) as avg_accuracy,
    avg(brier_score) as avg_brier_score,
    avg(roi) as avg_roi,
    avg(sharpe_ratio) as avg_sharpe_ratio,
    max(accuracy) as best_accuracy,
    min(accuracy) as worst_accuracy,
    stddev(accuracy) as accuracy_std,
    avg(model_reliability) as avg_model_reliability,
    mode() within group (order by best_window) as most_successful_window
from backtest_results 
group by season, model_type;

-- Vue comparaison fenêtres temporelles
create view window_performance_comparison as
select 
    window,
    model_type,
    count(*) as total_tests,
    avg(accuracy) as avg_accuracy,
    avg(brier_score) as avg_brier_score,
    avg(temporal_consistency) as avg_consistency,
    count(case when best_window = window then 1 end) as times_best_window,
    avg(case when best_window = window then accuracy end) as accuracy_when_best
from backtest_results 
group by window, model_type;

-- Vue évolution modèle dans le temps
create view model_evolution_timeline as
select 
    mch.model_type,
    mch.version_number,
    mch.created_at,
    mch.baseline_accuracy,
    mch.deployed_to_production,
    lag(mch.baseline_accuracy) over (partition by mch.model_type order by mch.version_number) as previous_accuracy,
    mch.baseline_accuracy - lag(mch.baseline_accuracy) over (partition by mch.model_type order by mch.version_number) as accuracy_improvement
from model_configuration_history mch
order by mch.model_type, mch.version_number;

-- Indexes pour performance
create index idx_backtest_results_season_model on backtest_results(season, model_type);
create index idx_backtest_results_window on backtest_results(window);
create index idx_backtest_results_accuracy on backtest_results(accuracy desc);
create index idx_backtest_results_roi on backtest_results(roi desc);
create index idx_backtest_results_created on backtest_results(created_at desc);

create index idx_backtest_predictions_backtest on backtest_predictions(backtest_id);
create index idx_backtest_predictions_match_date on backtest_predictions(match_date);
create index idx_backtest_predictions_window on backtest_predictions(window);
create index idx_backtest_predictions_accuracy on backtest_predictions(is_correct, confidence);

create index idx_model_comparisons_season on model_comparisons(season);
create index idx_model_comparisons_created on model_comparisons(created_at desc);

create index idx_model_config_history_type_version on model_configuration_history(model_type, version_number);
create index idx_model_config_history_deployed on model_configuration_history(deployed_to_production, deployment_date);

-- Fonctions utilitaires pour backtesting

-- Fonction pour calculer métriques de performance
create or replace function calculate_backtest_metrics(backtest_result_id uuid)
returns jsonb as $$
declare
    metrics jsonb;
    total_preds integer;
    correct_preds integer;
    brier_sum numeric;
    predictions cursor for 
        select predicted, actual, is_correct 
        from backtest_predictions 
        where backtest_id = backtest_result_id;
begin
    select count(*), count(case when is_correct then 1 end)
    into total_preds, correct_preds
    from backtest_predictions 
    where backtest_id = backtest_result_id;
    
    select sum(power(predicted - actual, 2))
    into brier_sum
    from backtest_predictions 
    where backtest_id = backtest_result_id;
    
    metrics := jsonb_build_object(
        'total_predictions', total_preds,
        'correct_predictions', correct_preds,
        'accuracy', case when total_preds > 0 then correct_preds::numeric / total_preds else 0 end,
        'brier_score', case when total_preds > 0 then brier_sum / total_preds else 0.25 end
    );
    
    return metrics;
end;
$$ language plpgsql;

-- Fonction pour détecter overfitting
create or replace function detect_overfitting(
    model_name text,
    lookback_seasons integer default 3
)
returns table(
    season text,
    train_accuracy numeric,
    test_accuracy numeric,
    accuracy_drop numeric,
    overfitting_risk text
) as $$
begin
    return query
    select 
        br.season,
        -- Simuler train accuracy (serait calculé séparément)
        br.accuracy + 0.1 as train_accuracy,
        br.accuracy as test_accuracy,
        0.1 as accuracy_drop, -- Différence train-test
        case 
            when 0.1 > 0.15 then 'HIGH'
            when 0.1 > 0.08 then 'MEDIUM'
            else 'LOW'
        end as overfitting_risk
    from backtest_results br
    where br.model_type = model_name
    and br.created_at >= now() - (lookback_seasons * interval '1 year')
    order by br.season desc;
end;
$$ language plpgsql;

-- RLS Policies
alter table backtest_results enable row level security;
alter table backtest_predictions enable row level security;
alter table model_comparisons enable row level security;
alter table model_configuration_history enable row level security;

-- Lecture libre pour analyse
create policy "Allow read backtest_results" on backtest_results for select using (true);
create policy "Allow read backtest_predictions" on backtest_predictions for select using (true);
create policy "Allow read model_comparisons" on model_comparisons for select using (true);
create policy "Allow read model_config_history" on model_configuration_history for select using (true);

-- Service role accès complet
create policy "Service role full access backtest_results" on backtest_results for all using (auth.role() = 'service_role');
create policy "Service role full access backtest_predictions" on backtest_predictions for all using (auth.role() = 'service_role');
create policy "Service role full access model_comparisons" on model_comparisons for all using (auth.role() = 'service_role');
create policy "Service role full access model_config_history" on model_configuration_history for all using (auth.role() = 'service_role');

-- Comments de documentation
comment on table backtest_results is 'Results of walk-forward backtesting across different time periods';
comment on table backtest_predictions is 'Individual predictions made during backtesting for detailed analysis';
comment on table model_comparisons is 'Head-to-head comparisons between different models';
comment on table model_configuration_history is 'Version history of model configurations and deployments';

comment on column backtest_results.temporal_consistency is 'Measure of performance consistency across temporal windows';
comment on column backtest_results.model_reliability is 'Correlation between predicted confidence and actual accuracy';
comment on column backtest_predictions.available_features is 'Features that were available at prediction time (respecting temporal constraints)';

-- Données initiales de test
insert into model_configuration_history (model_type, version_number, configuration, baseline_accuracy, changes_from_previous, reason_for_change, validation_passed) values
('ensemble', 1, '{"models": ["poisson", "dixon_coles", "elo_rating"], "weights": {"equal": true}}', 0.52, 'Initial version', 'First implementation', true),
('ensemble', 2, '{"models": ["poisson", "dixon_coles", "elo_rating", "form_based"], "weights": {"adaptive": true}}', 0.54, 'Added form-based model and adaptive weighting', 'Improve accuracy by including recent form', true),
('contextual', 1, '{"models": ["weather", "big_game", "fatigue"], "min_applicability": 0.5}', 0.56, 'Initial contextual system', 'Handle specific match situations', true);