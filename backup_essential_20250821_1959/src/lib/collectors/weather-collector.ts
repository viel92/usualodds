// @ts-nocheck
import { BaseCollector } from './base-collector';
import { WindowType } from '@/types/database';

interface WeatherForecast {
  matchId: string;
  forecastTime: string;
  window: WindowType;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  precipitationProbability: number;
  condition: string;
  visibility: number;
  uvIndex: number;
  pressure: number;
  cloudCover: number;
}

interface WeatherAPI {
  temperature_2m: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  precipitation: number;
  precipitation_probability: number;
  weather_code: number;
  visibility: number;
  uv_index: number;
  surface_pressure: number;
  cloud_cover: number;
}

export class WeatherCollector extends BaseCollector {
  private readonly WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
  
  /**
   * Collecte données météo prévues respectant contraintes temporelles
   * T-24h: Première prévision météo
   * T-6h: Mise à jour prévision 
   * T-1h: DERNIÈRE prévision pour décision montante
   * T-30min: Prévision finale (publication uniquement)
   */
  async collectWeatherForecasts(window: WindowType): Promise<void> {
    console.log(`Collecting weather forecasts for window ${window}...`);

    try {
      // Récupérer les matchs dans la fenêtre appropriée
      const matches = await this.getMatchesForWindow(window);
      
      if (matches.length === 0) {
        console.log(`No matches found for weather collection at window ${window}`);
        return;
      }

      let collectedForecasts = 0;
      
      for (const match of matches) {
        try {
          const forecast = await this.getWeatherForecast(match, window);
          
          if (forecast) {
            await this.storeWeatherForecast(forecast);
            collectedForecasts++;
          }

          // Respecter les limites API
          await this.rateLimitDelay(500);
          
        } catch (error) {
          console.error(`Error collecting weather for match ${match.id}:`, error);
        }
      }

      await this.logDataQuality(
        'collection',
        'weather_forecasts',
        `weather_collection_${window}`,
        'passed',
        { 
          window,
          matches_processed: matches.length,
          forecasts_collected: collectedForecasts
        }
      );

      console.log(`Weather collection completed for window ${window}: ${collectedForecasts} forecasts`);
      
    } catch (error) {
      console.error(`Error in weather collection for window ${window}:`, error);
      
      await this.logDataQuality(
        'collection',
        'weather_forecasts',
        `weather_collection_${window}`,
        'failed',
        { 
          window,
          error: error instanceof Error ? error.message : String(error)
        }
      );
      
      throw error;
    }
  }

  private async getMatchesForWindow(window: WindowType) {
    const now = new Date();
    let fromTime: Date, toTime: Date;

    switch (window) {
      case 'T24':
        fromTime = new Date(now.getTime() + 23 * 60 * 60 * 1000);
        toTime = new Date(now.getTime() + 25 * 60 * 60 * 1000);
        break;
      case 'T6':
        fromTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
        toTime = new Date(now.getTime() + 6.5 * 60 * 60 * 1000);
        break;
      case 'T1':
        fromTime = new Date(now.getTime() + 0.5 * 60 * 60 * 1000);
        toTime = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
        break;
      case 'T30':
        fromTime = new Date(now.getTime() + 25 * 60 * 1000);
        toTime = new Date(now.getTime() + 35 * 60 * 1000);
        break;
      default:
        throw new Error(`Invalid window: ${window}`);
    }

    const { data: matches } = await this.supabase
      .from('matches')
      .select(`
        id, match_date, venue,
        home_team:teams!home_team_id(name, venue_name),
        away_team:teams!away_team_id(name)
      `)
      .eq('status', 'scheduled')
      .gte('match_date', fromTime.toISOString())
      .lte('match_date', toTime.toISOString());

    return matches || [];
  }

  private async getWeatherForecast(
    match: any,
    window: WindowType
  ): Promise<WeatherForecast | null> {
    try {
      // Obtenir coordonnées du stade (approximatives pour les grands stades)
      const coordinates = await this.getStadiumCoordinates(match.venue || match.home_team?.venue_name);
      
      if (!coordinates) {
        console.warn(`No coordinates found for venue: ${match.venue}`);
        return null;
      }

      const matchTime = new Date(match.match_date);
      const forecastTime = new Date();

      // Construire URL API météo
      const params = new URLSearchParams({
        latitude: coordinates.lat.toString(),
        longitude: coordinates.lon.toString(),
        hourly: [
          'temperature_2m',
          'relative_humidity_2m', 
          'wind_speed_10m',
          'wind_direction_10m',
          'precipitation',
          'precipitation_probability',
          'weather_code',
          'visibility',
          'uv_index',
          'surface_pressure',
          'cloud_cover'
        ].join(','),
        timezone: 'auto',
        start_date: matchTime.toISOString().split('T')[0],
        end_date: matchTime.toISOString().split('T')[0]
      });

      const response = await fetch(`${this.WEATHER_API_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.hourly) {
        throw new Error('No hourly weather data received');
      }

      // Trouver l'heure la plus proche du match
      const matchHour = matchTime.getHours();
      const hourlyData = data.hourly;
      const closestHourIndex = this.findClosestHourIndex(hourlyData.time, matchTime);

      if (closestHourIndex === -1) {
        throw new Error('No matching hour found in weather data');
      }

      // Extraire données météo
      const weatherData: WeatherAPI = {
        temperature_2m: hourlyData.temperature_2m[closestHourIndex],
        relative_humidity_2m: hourlyData.relative_humidity_2m[closestHourIndex],
        wind_speed_10m: hourlyData.wind_speed_10m[closestHourIndex],
        wind_direction_10m: hourlyData.wind_direction_10m[closestHourIndex],
        precipitation: hourlyData.precipitation[closestHourIndex],
        precipitation_probability: hourlyData.precipitation_probability[closestHourIndex],
        weather_code: hourlyData.weather_code[closestHourIndex],
        visibility: hourlyData.visibility[closestHourIndex],
        uv_index: hourlyData.uv_index[closestHourIndex],
        surface_pressure: hourlyData.surface_pressure[closestHourIndex],
        cloud_cover: hourlyData.cloud_cover[closestHourIndex]
      };

      return {
        matchId: match.id,
        forecastTime: forecastTime.toISOString(),
        window,
        temperature: weatherData.temperature_2m,
        feelsLike: this.calculateFeelsLike(weatherData.temperature_2m, weatherData.relative_humidity_2m, weatherData.wind_speed_10m),
        humidity: weatherData.relative_humidity_2m,
        windSpeed: weatherData.wind_speed_10m,
        windDirection: weatherData.wind_direction_10m,
        precipitation: weatherData.precipitation,
        precipitationProbability: weatherData.precipitation_probability,
        condition: this.mapWeatherCode(weatherData.weather_code),
        visibility: weatherData.visibility,
        uvIndex: weatherData.uv_index,
        pressure: weatherData.surface_pressure,
        cloudCover: weatherData.cloud_cover
      };

    } catch (error) {
      console.error(`Error fetching weather forecast for match ${match.id}:`, error);
      return null;
    }
  }

  private async getStadiumCoordinates(venueName?: string): Promise<{ lat: number; lon: number } | null> {
    if (!venueName) return null;

    // Base de données simplifiée des coordonnées des stades principaux
    const stadiumCoordinates: Record<string, { lat: number; lon: number }> = {
      // Premier League
      'Emirates Stadium': { lat: 51.5549, lon: -0.1084 },
      'Stamford Bridge': { lat: 51.4816, lon: -0.1911 },
      'Old Trafford': { lat: 53.4631, lon: -2.2914 },
      'Anfield': { lat: 53.4308, lon: -2.9611 },
      'Etihad Stadium': { lat: 53.4831, lon: -2.2004 },
      'Tottenham Hotspur Stadium': { lat: 51.6042, lon: -0.0663 },
      
      // La Liga  
      'Santiago Bernabéu': { lat: 40.4530, lon: -3.6883 },
      'Camp Nou': { lat: 41.3809, lon: 2.1228 },
      'Wanda Metropolitano': { lat: 40.4362, lon: -3.5997 },
      'Ramón Sánchez Pizjuán': { lat: 37.3838, lon: -5.9703 },
      
      // Serie A
      'San Siro': { lat: 45.4781, lon: 9.1240 },
      'Stadio Olimpico': { lat: 41.9342, lon: 12.4547 },
      'Allianz Stadium': { lat: 45.1097, lon: 7.6410 },
      
      // Bundesliga
      'Allianz Arena': { lat: 48.2188, lon: 11.6244 },
      'Signal Iduna Park': { lat: 51.4925, lon: 7.4517 },
      'Mercedes-Benz Arena': { lat: 48.7920, lon: 9.2320 },
      
      // Ligue 1
      'Parc des Princes': { lat: 48.8414, lon: 2.2530 },
      'Orange Vélodrome': { lat: 43.2695, lon: 5.3958 },
      'Groupama Stadium': { lat: 45.7652, lon: 4.9821 }
    };

    // Recherche exacte d'abord
    if (stadiumCoordinates[venueName]) {
      return stadiumCoordinates[venueName];
    }

    // Recherche par mots-clés
    const venueKey = Object.keys(stadiumCoordinates).find(key => 
      key.toLowerCase().includes(venueName.toLowerCase()) ||
      venueName.toLowerCase().includes(key.toLowerCase())
    );

    if (venueKey) {
      return stadiumCoordinates[venueKey];
    }

    // Coordonnées par défaut selon grandes villes européennes
    const cityDefaults: Record<string, { lat: number; lon: number }> = {
      'london': { lat: 51.5074, lon: -0.1278 },
      'madrid': { lat: 40.4168, lon: -3.7038 },
      'barcelona': { lat: 41.3851, lon: 2.1734 },
      'milano': { lat: 45.4642, lon: 9.1900 },
      'roma': { lat: 41.9028, lon: 12.4964 },
      'munich': { lat: 48.1351, lon: 11.5820 },
      'dortmund': { lat: 51.5136, lon: 7.4653 },
      'paris': { lat: 48.8566, lon: 2.3522 },
      'marseille': { lat: 43.2965, lon: 5.3698 }
    };

    for (const [city, coords] of Object.entries(cityDefaults)) {
      if (venueName.toLowerCase().includes(city)) {
        return coords;
      }
    }

    return null;
  }

  private findClosestHourIndex(timeArray: string[], targetTime: Date): number {
    const targetHour = targetTime.getHours();
    const targetDateStr = targetTime.toISOString().split('T')[0];

    for (let i = 0; i < timeArray.length; i++) {
      const timeStr = timeArray[i];
      const date = new Date(timeStr);
      
      if (date.toISOString().split('T')[0] === targetDateStr && 
          date.getHours() === targetHour) {
        return i;
      }
    }

    // Si pas d'heure exacte, prendre la plus proche
    let closestIndex = -1;
    let minDiff = Infinity;

    for (let i = 0; i < timeArray.length; i++) {
      const date = new Date(timeArray[i]);
      if (date.toISOString().split('T')[0] === targetDateStr) {
        const diff = Math.abs(date.getHours() - targetHour);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      }
    }

    return closestIndex;
  }

  private calculateFeelsLike(temp: number, humidity: number, windSpeed: number): number {
    // Formule simplifiée pour calcul ressenti
    if (temp >= 27) {
      // Index de chaleur pour températures élevées
      const heatIndex = -8.784695 + 1.61139411 * temp + 2.338549 * humidity 
        - 0.14611605 * temp * humidity - 0.012308094 * temp * temp
        - 0.016424828 * humidity * humidity + 0.002211732 * temp * temp * humidity
        + 0.00072546 * temp * humidity * humidity - 0.000003582 * temp * temp * humidity * humidity;
      return heatIndex;
    } else if (temp <= 10 && windSpeed > 1.34) {
      // Wind chill pour températures basses
      const windChill = 35.74 + 0.6215 * temp - 35.75 * Math.pow(windSpeed * 2.237, 0.16) 
        + 0.4275 * temp * Math.pow(windSpeed * 2.237, 0.16);
      return (windChill - 32) * 5/9; // Conversion F vers C
    }
    
    return temp; // Température normale
  }

  private mapWeatherCode(code: number): string {
    // Mapping codes météo Open-Meteo vers descriptions
    const weatherCodes: Record<number, string> = {
      0: 'clear',
      1: 'mainly_clear',
      2: 'partly_cloudy', 
      3: 'overcast',
      45: 'fog',
      48: 'depositing_rime_fog',
      51: 'light_drizzle',
      53: 'moderate_drizzle',
      55: 'dense_drizzle',
      61: 'slight_rain',
      63: 'moderate_rain',
      65: 'heavy_rain',
      71: 'slight_snow',
      73: 'moderate_snow',
      75: 'heavy_snow',
      77: 'snow_grains',
      80: 'slight_rain_showers',
      81: 'moderate_rain_showers',
      82: 'violent_rain_showers',
      85: 'slight_snow_showers',
      86: 'heavy_snow_showers',
      95: 'thunderstorm',
      96: 'thunderstorm_with_hail',
      99: 'thunderstorm_with_heavy_hail'
    };

    return weatherCodes[code] || 'unknown';
  }

  private async storeWeatherForecast(forecast: WeatherForecast): Promise<void> {
    // Vérifier si prévision existe déjà pour cette fenêtre
    const { data: existing } = await this.supabase
      .from('weather_forecasts')
      .select('id')
      .eq('match_id', forecast.matchId)
      .eq('window', forecast.window)
      .single();

    const forecastData = {
      match_id: forecast.matchId,
      window: forecast.window,
      forecast_time: forecast.forecastTime,
      temperature: forecast.temperature,
      feels_like: forecast.feelsLike,
      humidity: forecast.humidity,
      wind_speed: forecast.windSpeed,
      wind_direction: forecast.windDirection,
      precipitation: forecast.precipitation,
      precipitation_probability: forecast.precipitationProbability,
      condition: forecast.condition,
      visibility: forecast.visibility,
      uv_index: forecast.uvIndex,
      pressure: forecast.pressure,
      cloud_cover: forecast.cloudCover,
      impact_score: this.calculateWeatherImpact(forecast),
      updated_at: new Date().toISOString()
    };

    if (existing) {
      // Mettre à jour prévision existante
      const { error } = await this.supabase
        .from('weather_forecasts')
        .update(forecastData)
        .eq('id', existing.id);

      if (error) {
        throw new Error(`Failed to update weather forecast: ${error.message}`);
      }
    } else {
      // Créer nouvelle prévision
      const { error } = await this.supabase
        .from('weather_forecasts')
        .insert({
          ...forecastData,
          created_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Failed to insert weather forecast: ${error.message}`);
      }
    }
  }

  private calculateWeatherImpact(forecast: WeatherForecast): number {
    let impact = 0;

    // Impact température
    if (forecast.temperature < 5 || forecast.temperature > 30) {
      impact += 0.3;
    }

    // Impact vent
    if (forecast.windSpeed > 15) {
      impact += 0.4;
    }

    // Impact précipitations
    if (forecast.precipitation > 0) {
      impact += 0.2 + (forecast.precipitation * 0.1);
    }

    // Impact visibilité
    if (forecast.visibility < 1000) {
      impact += 0.3;
    }

    // Conditions extrêmes
    if (forecast.condition.includes('thunderstorm')) {
      impact += 0.6;
    } else if (forecast.condition.includes('heavy')) {
      impact += 0.4;
    } else if (forecast.condition.includes('snow')) {
      impact += 0.5;
    }

    return Math.min(impact, 1.0);
  }
}

export const weatherCollector = new WeatherCollector();