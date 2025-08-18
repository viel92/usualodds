-- Learning System Tables for Post-Match Analysis and Adaptive ML

-- Add analysis_completed field to matches table
alter table matches add column analysis_completed timestamptz null;

-- Table for storing prediction errors and learning data
create table prediction_errors (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id) on delete cascade,
    window window_type not null,
    market text not null,
    predicted_prob numeric not null check (predicted_prob >= 0 and predicted_prob <= 1),
    actual_result numeric not null check (actual_result >= 0 and actual_result <= 1),
    brier_score numeric not null,
    error_type text not null check (error_type in ('over_confident', 'under_confident', 'wrong_direction', 'calibration_error')),
    confidence numeric not null check (confidence >= 0 and confidence <= 1),
    context jsonb not null,
    analyzed_at timestamptz not null default now(),
    created_at timestamptz default now()
);

-- Table for storing error patterns analysis
create table error_patterns (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id) on delete cascade,
    error_distribution jsonb not null,
    window_performance jsonb not null,
    total_errors integer not null,
    avg_brier_score numeric not null,
    context_analysis jsonb,
    analyzed_at timestamptz not null default now(),
    created_at timestamptz default now()
);

-- Table for storing learning insights
create table learning_insights (
    id uuid primary key default uuid_generate_v4(),
    pattern text not null,
    frequency integer not null,
    impact numeric not null,
    confidence numeric not null check (confidence >= 0 and confidence <= 1),
    actionable boolean not null default false,
    description text not null,
    suggested_features jsonb,
    model_adjustment jsonb,
    generated_at timestamptz not null default now(),
    applied_at timestamptz null,
    effectiveness_score numeric null,
    created_at timestamptz default now()
);

-- Table for model performance tracking
create table model_performance (
    id uuid primary key default uuid_generate_v4(),
    model_version text not null,
    evaluation_period_start timestamptz not null,
    evaluation_period_end timestamptz not null,
    
    -- Overall metrics
    total_predictions integer not null,
    overall_brier_score numeric not null,
    overall_log_loss numeric not null,
    calibration_error numeric not null,
    
    -- By window
    t24_brier_score numeric,
    t6_brier_score numeric,
    t1_brier_score numeric,
    t30_brier_score numeric,
    
    -- By market
    market_performance jsonb,
    
    -- By context
    derby_performance jsonb,
    weather_performance jsonb,
    importance_performance jsonb,
    
    -- Improvement metrics
    improvement_vs_baseline numeric,
    confidence_distribution jsonb,
    
    created_at timestamptz default now()
);

-- Table for adaptive model weights and parameters
create table adaptive_model_params (
    id uuid primary key default uuid_generate_v4(),
    model_component text not null,
    param_name text not null,
    param_value numeric not null,
    param_type text not null check (param_type in ('weight', 'threshold', 'penalty', 'boost')),
    context_filter jsonb, -- Conditions when this param applies
    last_updated timestamptz not null default now(),
    update_reason text,
    effectiveness_score numeric,
    created_at timestamptz default now(),
    
    unique(model_component, param_name, context_filter)
);

-- Table for tracking feature importance over time
create table feature_importance_tracking (
    id uuid primary key default uuid_generate_v4(),
    model_version text not null,
    feature_name text not null,
    importance_score numeric not null,
    importance_rank integer not null,
    window window_type not null,
    market text not null,
    measured_at timestamptz not null default now(),
    sample_size integer not null,
    confidence_interval_lower numeric,
    confidence_interval_upper numeric,
    created_at timestamptz default now()
);

-- Table for A/B testing different model versions
create table model_ab_tests (
    id uuid primary key default uuid_generate_v4(),
    test_name text not null,
    model_a_version text not null,
    model_b_version text not null,
    test_start_date timestamptz not null,
    test_end_date timestamptz,
    traffic_split numeric not null default 0.5 check (traffic_split >= 0 and traffic_split <= 1),
    status text not null default 'running' check (status in ('running', 'paused', 'completed', 'cancelled')),
    
    -- Results
    model_a_performance jsonb,
    model_b_performance jsonb,
    statistical_significance numeric,
    winner text check (winner in ('model_a', 'model_b', 'no_difference')),
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Table for storing match predictions for all versions (for A/B testing)
create table match_predictions_versioned (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id) on delete cascade,
    model_version text not null,
    window window_type not null,
    predictions jsonb not null, -- All market predictions
    confidence_scores jsonb,
    feature_values jsonb,
    prediction_time timestamptz not null default now(),
    ab_test_id uuid references model_ab_tests(id) null,
    created_at timestamptz default now(),
    
    unique(match_id, model_version, window)
);

-- Table for concept drift detection
create table concept_drift_detection (
    id uuid primary key default uuid_generate_v4(),
    detection_date timestamptz not null default now(),
    drift_type text not null check (drift_type in ('feature_drift', 'target_drift', 'prediction_drift')),
    affected_features jsonb,
    drift_magnitude numeric not null,
    statistical_test text not null,
    p_value numeric not null,
    threshold_used numeric not null,
    time_window_days integer not null,
    recommendation text,
    action_taken text,
    created_at timestamptz default now()
);

-- Indexes for performance
create index idx_prediction_errors_match_window on prediction_errors(match_id, window);
create index idx_prediction_errors_analyzed_at on prediction_errors(analyzed_at);
create index idx_prediction_errors_error_type on prediction_errors(error_type);
create index idx_prediction_errors_market on prediction_errors(market);
create index idx_prediction_errors_context on prediction_errors using gin(context);

create index idx_error_patterns_match on error_patterns(match_id);
create index idx_error_patterns_analyzed_at on error_patterns(analyzed_at);

create index idx_learning_insights_pattern on learning_insights(pattern);
create index idx_learning_insights_generated_at on learning_insights(generated_at);
create index idx_learning_insights_actionable on learning_insights(actionable);

create index idx_model_performance_version on model_performance(model_version);
create index idx_model_performance_period on model_performance(evaluation_period_start, evaluation_period_end);

create index idx_adaptive_params_component on adaptive_model_params(model_component);
create index idx_adaptive_params_updated on adaptive_model_params(last_updated);

create index idx_feature_importance_version_window on feature_importance_tracking(model_version, window);
create index idx_feature_importance_measured_at on feature_importance_tracking(measured_at);

create index idx_match_predictions_match_version on match_predictions_versioned(match_id, model_version);
create index idx_match_predictions_window on match_predictions_versioned(window);
create index idx_match_predictions_ab_test on match_predictions_versioned(ab_test_id);

create index idx_concept_drift_date on concept_drift_detection(detection_date);
create index idx_concept_drift_type on concept_drift_detection(drift_type);

-- RLS Policies
alter table prediction_errors enable row level security;
alter table error_patterns enable row level security;
alter table learning_insights enable row level security;
alter table model_performance enable row level security;
alter table adaptive_model_params enable row level security;
alter table feature_importance_tracking enable row level security;
alter table model_ab_tests enable row level security;
alter table match_predictions_versioned enable row level security;
alter table concept_drift_detection enable row level security;

-- Internal access policies
create policy "Internal access" on prediction_errors for all using (true);
create policy "Internal access" on error_patterns for all using (true);
create policy "Internal access" on learning_insights for all using (true);
create policy "Internal access" on model_performance for all using (true);
create policy "Internal access" on adaptive_model_params for all using (true);
create policy "Internal access" on feature_importance_tracking for all using (true);
create policy "Internal access" on model_ab_tests for all using (true);
create policy "Internal access" on match_predictions_versioned for all using (true);
create policy "Internal access" on concept_drift_detection for all using (true);

-- Functions for automated analysis
create or replace function trigger_post_match_analysis()
returns trigger as $$
begin
    -- Only trigger if match status changed to finished
    if OLD.status != 'finished' and NEW.status = 'finished' then
        -- Schedule analysis for 2 hours later (would be handled by cron job)
        insert into data_quality_checks (
            check_type,
            table_name,
            check_name,
            status,
            details,
            checked_at
        ) values (
            'post_match_analysis',
            'matches',
            'analysis_scheduled',
            'pending',
            jsonb_build_object('match_id', NEW.id, 'finished_at', NEW.updated_at),
            now()
        );
    end if;
    
    return NEW;
end;
$$ language plpgsql;

-- Trigger to automatically schedule post-match analysis
create trigger trigger_schedule_post_match_analysis
    after update on matches
    for each row
    execute function trigger_post_match_analysis();

-- Function to calculate model performance metrics
create or replace function calculate_model_performance(
    p_model_version text,
    p_start_date timestamptz,
    p_end_date timestamptz
)
returns jsonb as $$
declare
    result jsonb;
    total_count integer;
    overall_brier numeric;
    overall_logloss numeric;
    calibration_error numeric;
begin
    -- Calculate overall metrics
    select 
        count(*),
        avg(brier_score),
        avg(-log(case when actual_result = 1 then predicted_prob else 1 - predicted_prob end)),
        avg(abs(predicted_prob - actual_result))
    into total_count, overall_brier, overall_logloss, calibration_error
    from prediction_errors pe
    join match_predictions_versioned mpv on pe.match_id = mpv.match_id and pe.window = mpv.window
    where mpv.model_version = p_model_version
    and pe.analyzed_at between p_start_date and p_end_date;
    
    result := jsonb_build_object(
        'total_predictions', total_count,
        'overall_brier_score', overall_brier,
        'overall_log_loss', overall_logloss,
        'calibration_error', calibration_error
    );
    
    return result;
end;
$$ language plpgsql;