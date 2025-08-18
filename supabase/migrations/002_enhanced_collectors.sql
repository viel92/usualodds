-- Enhanced collectors tables for Phase 1.3
-- Weather forecasts, lineup predictions, and match context

-- Weather forecasts table
create table weather_forecasts (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id) on delete cascade,
    window window_type not null,
    forecast_time timestamptz not null,
    
    -- Core weather data
    temperature numeric(4,1) not null, -- Celsius
    feels_like numeric(4,1),
    humidity integer, -- Percentage 0-100
    wind_speed numeric(4,1), -- km/h
    wind_direction integer, -- Degrees 0-360
    precipitation numeric(5,2) default 0, -- mm
    precipitation_probability integer default 0, -- Percentage 0-100
    condition text not null, -- clear, rain, snow, etc.
    visibility numeric(6,1), -- meters
    uv_index integer,
    pressure numeric(6,1), -- hPa
    cloud_cover integer, -- Percentage 0-100
    
    -- Impact assessment
    impact_score numeric(3,2) default 0, -- 0-1 scale
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    unique(match_id, window)
);

-- Probable lineups table (T-24h, T-6h, T-1h predictions)
create table probable_lineups (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id) on delete cascade,
    team_id uuid references teams(id) on delete cascade,
    window window_type not null,
    collected_at timestamptz not null,
    
    -- Lineup prediction data
    formation text, -- e.g. "4-3-3"
    confidence numeric(3,2) not null, -- 0-1 confidence score
    source text not null, -- 'api', 'prediction', 'historical'
    
    -- Player predictions (JSON array)
    players jsonb not null, -- Array of ProbablePlayer objects
    uncertainties jsonb, -- Array of LineupUncertainty objects
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    unique(match_id, team_id, window)
);

-- Official lineups table (T-30min publication only)
create table official_lineups (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id) on delete cascade,
    team_id uuid references teams(id) on delete cascade,
    released_at timestamptz not null,
    
    -- Official lineup data
    formation text,
    starting_xi text[] not null, -- Array of player IDs
    substitutes text[] not null, -- Array of player IDs
    captain text, -- Player ID
    changes jsonb, -- Array of LineupChange objects
    
    -- Critical flags for montante decision validation
    for_publication_only boolean default true,
    not_for_montante_decisions boolean default true,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    unique(match_id, team_id)
);

-- Match context table (referee, H2H, rivalry, importance, calendar, stakes)
create table match_context (
    id uuid primary key default uuid_generate_v4(),
    match_id uuid references matches(id) on delete cascade,
    window window_type not null,
    collected_at timestamptz not null,
    
    -- Context data (all stored as JSONB for flexibility)
    referee_data jsonb, -- RefereeData object
    head_to_head jsonb, -- HeadToHeadData object
    rivalry_data jsonb, -- RivalryData object
    match_importance jsonb, -- MatchImportanceData object
    calendar_context jsonb, -- CalendarContextData object
    stakes_data jsonb, -- MatchStakesData object
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    unique(match_id, window)
);

-- Indexes for performance
create index idx_weather_forecasts_match_window on weather_forecasts(match_id, window);
create index idx_weather_forecasts_forecast_time on weather_forecasts(forecast_time);
create index idx_weather_forecasts_impact on weather_forecasts(impact_score desc);

create index idx_probable_lineups_match_team_window on probable_lineups(match_id, team_id, window);
create index idx_probable_lineups_confidence on probable_lineups(confidence desc);
create index idx_probable_lineups_collected_at on probable_lineups(collected_at);

create index idx_official_lineups_match_team on official_lineups(match_id, team_id);
create index idx_official_lineups_released_at on official_lineups(released_at);

create index idx_match_context_match_window on match_context(match_id, window);
create index idx_match_context_collected_at on match_context(collected_at);

-- Row Level Security policies
alter table weather_forecasts enable row level security;
alter table probable_lineups enable row level security;
alter table official_lineups enable row level security;
alter table match_context enable row level security;

-- Allow read access for authenticated users
create policy "Allow read access to weather_forecasts" on weather_forecasts
    for select using (true);

create policy "Allow read access to probable_lineups" on probable_lineups
    for select using (true);

create policy "Allow read access to official_lineups" on official_lineups
    for select using (true);

create policy "Allow read access to match_context" on match_context
    for select using (true);

-- Allow service role to insert/update/delete
create policy "Service role full access to weather_forecasts" on weather_forecasts
    for all using (auth.role() = 'service_role');

create policy "Service role full access to probable_lineups" on probable_lineups
    for all using (auth.role() = 'service_role');

create policy "Service role full access to official_lineups" on official_lineups
    for all using (auth.role() = 'service_role');

create policy "Service role full access to match_context" on match_context
    for all using (auth.role() = 'service_role');

-- Comments for documentation
comment on table weather_forecasts is 'Weather forecasts collected at different temporal windows for match analysis';
comment on table probable_lineups is 'Predicted lineups with confidence scores, used for montante decisions up to T-1h';
comment on table official_lineups is 'Official lineups released at T-30min, for publication only, NOT for montante decisions';
comment on table match_context is 'Enriched match context including referee data, H2H history, rivalries, and stakes';

comment on column official_lineups.for_publication_only is 'CRITICAL: Flag ensuring these lineups are not used for betting decisions';
comment on column official_lineups.not_for_montante_decisions is 'CRITICAL: Explicit flag preventing use in montante strategy';
comment on column weather_forecasts.impact_score is 'Calculated impact score (0-1) based on weather conditions severity';
comment on column probable_lineups.confidence is 'Model confidence in lineup prediction (0-1), used for risk assessment';