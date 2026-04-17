export interface WeatherData {
  temp:      number;  // celsius
  condition: string;  // human-readable
  city:      string;
}

const WMO_CODES: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Icy fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Rain showers", 81: "Showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail",
};

function wmoToString(code: number): string {
  return WMO_CODES[code] ?? "Unknown";
}

export async function getWeatherForCity(city: string): Promise<WeatherData | null> {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&format=json`,
      { next: { revalidate: 3600 } }
    );
    if (!geoRes.ok) return null;
    const geo = await geoRes.json();
    if (!geo.results?.length) return null;

    const { latitude, longitude, name } = geo.results[0];

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&timezone=auto`,
      { next: { revalidate: 1800 } }
    );
    if (!weatherRes.ok) return null;
    const weather = await weatherRes.json();

    return {
      temp:      Math.round(weather.current?.temperature_2m ?? 20),
      condition: wmoToString(weather.current?.weathercode ?? 0),
      city:      name as string,
    };
  } catch {
    return null;
  }
}
