interface APIFootballConfig {
  baseURL: string;
  apiKey: string;
  rapidAPIHost: string;
}

const config: APIFootballConfig = {
  baseURL: 'https://v3.football.api-sports.io',
  apiKey: process.env.API_FOOTBALL_KEY || '',
  rapidAPIHost: 'v3.football.api-sports.io'
};

export class APIFootballClient {
  private readonly headers: Record<string, string>;

  constructor() {
    this.headers = {
      'X-RapidAPI-Key': config.apiKey,
      'X-RapidAPI-Host': config.rapidAPIHost,
    };
  }

  private async makeRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${config.baseURL}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`API Football request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  async getLeagues(season?: string) {
    return this.makeRequest('/leagues', season ? { season } : undefined);
  }

  async getTeams(league: string, season: string) {
    return this.makeRequest('/teams', { league, season });
  }

  async getFixtures(params: {
    league?: string;
    season?: string;
    team?: string;
    date?: string;
    from?: string;
    to?: string;
    timezone?: string;
  }) {
    return this.makeRequest('/fixtures', params);
  }

  async getFixtureStatistics(fixtureId: string) {
    return this.makeRequest('/fixtures/statistics', { fixture: fixtureId });
  }

  async getFixtureEvents(fixtureId: string) {
    return this.makeRequest('/fixtures/events', { fixture: fixtureId });
  }

  async getFixtureLineups(fixtureId: string) {
    return this.makeRequest('/fixtures/lineups', { fixture: fixtureId });
  }

  async getPlayerStatistics(params: {
    season: string;
    team?: string;
    player?: string;
    league?: string;
  }) {
    return this.makeRequest('/players', params);
  }

  async getOdds(params: {
    fixture?: string;
    league?: string;
    season?: string;
    date?: string;
    timezone?: string;
    bookmaker?: string;
    bet?: string;
  }) {
    return this.makeRequest('/odds', params);
  }

  async getInjuries(params: {
    league?: string;
    season?: string;
    team?: string;
    player?: string;
    date?: string;
    timezone?: string;
  }) {
    return this.makeRequest('/injuries', params);
  }

  async getStandings(league: string, season: string) {
    return this.makeRequest('/standings', { league, season });
  }

  async getTrophies(params: {
    player?: string;
    coach?: string;
  }) {
    return this.makeRequest('/trophies', params);
  }

  async getTransfers(params: {
    player?: string;
    team?: string;
  }) {
    return this.makeRequest('/transfers', params);
  }

  async getSidelined(params: {
    player?: string;
    team?: string;
  }) {
    return this.makeRequest('/sidelined', params);
  }

  async getCoaches(params: {
    id?: string;
    team?: string;
    search?: string;
  }) {
    return this.makeRequest('/coachs', params);
  }

  async getPredictions(fixtureId: string) {
    return this.makeRequest('/predictions', { fixture: fixtureId });
  }

  async getH2H(params: {
    h2h: string; // "team1-team2"
    date?: string;
    league?: string;
    season?: string;
    last?: string;
    next?: string;
    from?: string;
    to?: string;
  }) {
    return this.makeRequest('/fixtures/headtohead', params);
  }
}

export const apiFootball = new APIFootballClient();