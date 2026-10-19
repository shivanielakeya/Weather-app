"use strict";

const DEFAULT_LOCATION = {
  name: "Bengaluru",
  admin1: "Karnataka",
  country: "India",
  latitude: 12.9716,
  longitude: 77.5946,
  timezone: "Asia/Kolkata"
};
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const MAJOR_CITIES = [
  { name: "Delhi", admin1: "Delhi", region: "North", latitude: 28.6139, longitude: 77.2090 },
  { name: "Srinagar", admin1: "Jammu and Kashmir", region: "North", latitude: 34.0837, longitude: 74.7973 },
  { name: "Jaipur", admin1: "Rajasthan", region: "North", latitude: 26.9124, longitude: 75.7873 },
  { name: "Lucknow", admin1: "Uttar Pradesh", region: "North", latitude: 26.8467, longitude: 80.9462 },
  { name: "Dehradun", admin1: "Uttarakhand", region: "North", latitude: 30.3165, longitude: 78.0322 },
  { name: "Chandigarh", admin1: "Chandigarh", region: "North", latitude: 30.7333, longitude: 76.7794 },
  { name: "Shimla", admin1: "Himachal Pradesh", region: "North", latitude: 31.1048, longitude: 77.1734 },
  { name: "Mumbai", admin1: "Maharashtra", region: "West", latitude: 19.0760, longitude: 72.8777 },
  { name: "Pune", admin1: "Maharashtra", region: "West", latitude: 18.5204, longitude: 73.8567 },
  { name: "Ahmedabad", admin1: "Gujarat", region: "West", latitude: 23.0225, longitude: 72.5714 },
  { name: "Panaji", admin1: "Goa", region: "West", latitude: 15.4909, longitude: 73.8278 },
  { name: "Bengaluru", admin1: "Karnataka", region: "South", latitude: 12.9716, longitude: 77.5946 },
  { name: "Chennai", admin1: "Tamil Nadu", region: "South", latitude: 13.0827, longitude: 80.2707 },
  { name: "Hyderabad", admin1: "Telangana", region: "South", latitude: 17.3850, longitude: 78.4867 },
  { name: "Kochi", admin1: "Kerala", region: "South", latitude: 9.9312, longitude: 76.2673 },
  { name: "Thiruvananthapuram", admin1: "Kerala", region: "South", latitude: 8.5241, longitude: 76.9366 },
  { name: "Kolkata", admin1: "West Bengal", region: "East", latitude: 22.5726, longitude: 88.3639 },
  { name: "Bhubaneswar", admin1: "Odisha", region: "East", latitude: 20.2961, longitude: 85.8245 },
  { name: "Patna", admin1: "Bihar", region: "East", latitude: 25.5941, longitude: 85.1376 },
  { name: "Ranchi", admin1: "Jharkhand", region: "East", latitude: 23.3441, longitude: 85.3096 },
  { name: "Guwahati", admin1: "Assam", region: "Northeast", latitude: 26.1445, longitude: 91.7362 },
  { name: "Imphal", admin1: "Manipur", region: "Northeast", latitude: 24.8170, longitude: 93.9368 },
  { name: "Gangtok", admin1: "Sikkim", region: "Northeast", latitude: 27.3389, longitude: 88.6065 },
  { name: "Bhopal", admin1: "Madhya Pradesh", region: "Central", latitude: 23.2599, longitude: 77.4126 },
  { name: "Raipur", admin1: "Chhattisgarh", region: "Central", latitude: 21.2514, longitude: 81.6296 }
];
const LOCALITIES = [
  { name: "Whitefield", latitude: 12.9698, longitude: 77.7500 },
  { name: "Electronic City", latitude: 12.8452, longitude: 77.6602 },
  { name: "Koramangala", latitude: 12.9352, longitude: 77.6245 },
  { name: "Indiranagar", latitude: 12.9784, longitude: 77.6408 },
  { name: "Hebbal", latitude: 13.0358, longitude: 77.5970 },
  { name: "HSR Layout", latitude: 12.9116, longitude: 77.6389 }
];
const STORAGE_KEYS = { unit: "skycast-unit", favorites: "skycast-favorites", recent: "skycast-recent", cities: "skycast-india-cities-v1" };
const CACHE_TTL = 5 * 60 * 1000;
const memoryCache = new Map();

const el = (id) => document.getElementById(id);
const state = {
  location: DEFAULT_LOCATION,
  unit: safeStorageGet(STORAGE_KEYS.unit) === "f" ? "f" : "c",
  weather: null,
  air: null,
  chart: null,
  map: null,
  localityWeather: null,
  majorCities: null,
  recent: loadRecent(),
  favorites: loadFavorites(),
  requestId: 0
};

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Local storage is unavailable while reading ${key}.`, error);
    return null;
  }
}

function loadRecent() {
  try {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.recent) || "[]");
    return Array.isArray(items) ? items.filter((item) => item && typeof item.name === "string" && Number.isFinite(item.latitude) && Number.isFinite(item.longitude)).slice(0, 6) : [];
  } catch (error) {
    console.warn("Could not read recent locations.", error);
    return [];
  }
}

async function fetchCachedJson(key, url, ttl = CACHE_TTL) {
  const now = Date.now();
  const memory = memoryCache.get(key);
  if (memory && memory.expires > now) return memory.data;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved && saved.expires > now && saved.data) {
      memoryCache.set(key, saved);
      return saved.data;
    }
  } catch (error) {
    console.warn(`Ignoring invalid cached response for ${key}.`, error);
  }
  const data = await fetch(url).then(checkResponse);
  const entry = { expires: now + ttl, data };
  memoryCache.set(key, entry);
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn(`Could not persist cached response for ${key}.`, error);
  }
  return data;
}

function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => item && typeof item.name === "string" && Number.isFinite(item.latitude) && Number.isFinite(item.longitude)) : [];
  } catch (error) {
    console.error("Could not read saved favourite locations.", error);
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(state.favorites));
  } catch (error) {
    showStatus("Your browser could not save favourites. Check local storage settings.");
    console.error("Could not save favourite locations.", error);
  }
}

function formatTemp(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  const converted = state.unit === "f" ? Number(value) * 9 / 5 + 32 : Number(value);
  return `${Math.round(converted)}°`;
}

function convertTemperature(value) {
  return state.unit === "f" ? Number(value) * 9 / 5 + 32 : Number(value);
}

function formatTime(value, options = { hour: "numeric", minute: "2-digit" }) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { ...options, timeZone: state.location.timezone || "Asia/Kolkata" }).format(date);
}

function formatHour(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", timeZone: state.location.timezone || "Asia/Kolkata" }).format(date);
}

function weatherInfo(code, isDay = true) {
  if (code === 0) return { label: "Clear sky", icon: isDay ? "☀️" : "🌙" };
  if (code === 1) return { label: "Mainly clear", icon: isDay ? "🌤️" : "🌙" };
  if (code === 2) return { label: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if ([45, 48].includes(code)) return { label: "Foggy", icon: "🌫️" };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "Light drizzle", icon: "🌦️" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "Rain showers", icon: "🌧️" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Snowfall", icon: "🌨️" };
  if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "Conditions unavailable", icon: "🌤️" };
}

function windDescription(speed) {
  if (speed === null || speed === undefined || !Number.isFinite(Number(speed))) return "Wind speed unavailable";
  if (speed < 6) return "Light breeze";
  if (speed < 20) return "Gentle breeze";
  if (speed < 40) return "Moderate wind";
  return "Fresh wind";
}

function uvDescription(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "UV level unavailable";
  if (value < 3) return "Low · minimal protection";
  if (value < 6) return "Moderate · seek shade";
  if (value < 8) return "High · use sun protection";
  if (value < 11) return "Very high · extra protection";
  return "Extreme · avoid midday sun";
}

function showStatus(message, withRetry = false) {
  const node = el("status-message");
  node.replaceChildren(document.createTextNode(message));
  if (withRetry) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Try again";
    button.addEventListener("click", () => loadWeather(state.location));
    node.append(" ", button);
  }
  node.hidden = false;
}

function clearStatus() {
  el("status-message").hidden = true;
}

function updateLocationHeading() {
  el("location-name").textContent = state.location.name;
  const region = [state.location.admin1, state.location.country].filter(Boolean).join(", ");
  el("location-region").textContent = region || "Weather forecast";
  document.title = `${state.location.name} Weather — Skycast`;
  updateFavoriteButton();
}

function setLoading(isLoading) {
  el("loading-state").hidden = !isLoading;
  el("weather-content").hidden = isLoading || !state.weather;
}

async function loadWeather(location) {
  const requestId = ++state.requestId;
  state.location = location;
  state.weather = null;
  state.air = null;
  updateLocationHeading();
  clearStatus();
  setLoading(true);
  const common = `latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}&timezone=${encodeURIComponent(location.timezone || "auto")}`;
  const weatherQuery = `${common}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index,cloud_cover&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,precipitation_sum&forecast_days=7`;
  const airQuery = `${common}&current=us_aqi,pm2_5,pm10`;
  const localityQuery = `latitude=${LOCALITIES.map((place) => place.latitude).join(",")}&longitude=${LOCALITIES.map((place) => place.longitude).join(",")}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FKolkata&forecast_days=1`;
  const cityKey = `${Number(location.latitude).toFixed(3)},${Number(location.longitude).toFixed(3)}`;
  const [weatherResult, airResult, localityResult] = await Promise.allSettled([
    fetchCachedJson(`skycast-weather:${cityKey}`, `${WEATHER_URL}?${weatherQuery}`),
    fetchCachedJson(`skycast-air:${cityKey}`, `${AIR_URL}?${airQuery}`, 15 * 60 * 1000),
    cityKey === "12.972,77.595"
      ? fetchCachedJson("skycast-bengaluru-localities-v1", `${WEATHER_URL}?${localityQuery}`)
      : Promise.resolve(null)
  ]);
  if (requestId !== state.requestId) return;
  if (weatherResult.status === "rejected") {
    console.error("Weather request failed.", weatherResult.reason);
    setLoading(false);
    showStatus("We couldn’t load the weather right now. Check your connection and try again.", true);
    return;
  }
  state.weather = weatherResult.value;
  if (airResult.status === "fulfilled") state.air = airResult.value;
  else console.warn("Air-quality estimate is currently unavailable.", airResult.reason);
  if (localityResult.status === "fulfilled" && localityResult.value) {
    state.localityWeather = Array.isArray(localityResult.value) ? localityResult.value : [localityResult.value];
  } else if (cityKey !== "12.972,77.595") {
    state.localityWeather = null;
  } else {
    state.localityWeather = null;
    console.warn("Bengaluru locality forecasts are currently unavailable.", localityResult.reason);
  }
  setLoading(false);
  if (airResult.status === "rejected") {
    el("aqi-category").textContent = "Estimate unavailable";
    el("aqi-value").textContent = "—";
    el("aqi-description").textContent = "Air-quality service could not be reached";
  }
  renderWeather();
  renderMajorCities();
  renderComparison();
  if (airResult.status === "rejected") showStatus("Weather is current; the air-quality estimate is temporarily unavailable.");
}

async function checkResponse(response) {
  if (!response.ok) {
    let detail = "";
    try {
      const payload = await response.json();
      detail = payload.reason || "";
    } catch (error) {
      console.warn("The API error response was not JSON.", error);
    }
    throw new Error(detail || `Request failed (${response.status})`);
  }
  const data = await response.json();
  if (data.error) throw new Error(data.reason || "The weather service returned an error.");
  return data;
}

function renderWeather() {
  const data = state.weather;
  const current = data && data.current;
  const daily = data && data.daily;
  const hourly = data && data.hourly;
  if (!current || !daily || !hourly || !Array.isArray(daily.time) || !Array.isArray(hourly.time)) {
    showStatus("The weather service returned incomplete forecast data. Please try again.", true);
    return;
  }
  const dayIndex = Math.max(0, daily.time.findIndex((day) => day === current.time.slice(0, 10)));
  const condition = weatherInfo(current.weather_code, Boolean(current.is_day));
  el("current-condition").textContent = condition.label;
  el("current-icon").textContent = condition.icon;
  el("current-temperature").textContent = formatTemp(current.temperature_2m).replace("°", "");
  el("current-unit").textContent = state.unit === "c" ? "°C" : "°F";
  el("feels-like").textContent = formatTemp(current.apparent_temperature);
  el("today-high").textContent = formatTemp(daily.temperature_2m_max?.[dayIndex]);
  el("today-low").textContent = formatTemp(daily.temperature_2m_min?.[dayIndex]);
  el("current-time").textContent = formatTime(current.time);
  el("daylight-summary").textContent = Number(current.precipitation) > 0 ? "Rain is falling right now" : `Today’s high ${formatTemp(daily.temperature_2m_max?.[dayIndex])} · low ${formatTemp(daily.temperature_2m_min?.[dayIndex])}`;
  el("humidity").textContent = `${displayNumber(current.relative_humidity_2m)}%`;
  el("humidity-meter").style.width = `${bounded(current.relative_humidity_2m, 0, 100)}%`;
  el("wind-speed").textContent = displayNumber(current.wind_speed_10m);
  el("wind-note").textContent = windDescription(current.wind_speed_10m);
  el("uv-index").textContent = displayNumber(current.uv_index, 1);
  el("uv-note").textContent = uvDescription(current.uv_index);
  el("uv-meter").style.width = `${bounded(Number(current.uv_index) * 8, 0, 100)}%`;
  el("cloud-cover").textContent = `${displayNumber(current.cloud_cover)}%`;
  el("cloud-meter").style.width = `${bounded(current.cloud_cover, 0, 100)}%`;
  el("last-updated").textContent = formatTime(current.time);
  renderHourly(hourly, current.time);
  renderDaily(daily, dayIndex);
  renderSun(daily, dayIndex, current.time);
  renderAirQuality();
  renderLocalities();
  renderMap();
  renderWeatherInsights();
}

function displayNumber(value, decimals = 0) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return Number(value).toFixed(decimals);
}

function bounded(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : 0;
}

function finiteValues(values) {
  return Array.isArray(values) ? values.filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value))).map(Number) : [];
}

function renderHourly(hourly, currentTime) {
  const startAt = hourly.time.findIndex((time) => time >= currentTime);
  const start = Math.max(0, startAt);
  const end = Math.min(start + 24, hourly.time.length);
  const times = hourly.time.slice(start, end);
  const temps = times.map((_, index) => hourly.temperature_2m?.[start + index] ?? null);
  const rain = times.map((_, index) => hourly.precipitation_probability?.[start + index] ?? null);
  const codes = times.map((_, index) => hourly.weather_code?.[start + index] ?? null);
  const labels = times.map((time) => formatHour(time));

  el("hourly-strip").replaceChildren(...times.filter((_, index) => index % 3 === 0).map((time, index) => {
    const i = index * 3;
    const item = document.createElement("div");
    item.className = "hour-item";
    item.innerHTML = `<time>${escapeHtml(labels[i])}</time><span class="hour-icon" aria-hidden="true">${weatherInfo(codes[i]).icon}</span><strong>${escapeHtml(formatTemp(temps[i]))}</strong><small>${rain[i] !== null && rain[i] !== undefined && Number.isFinite(Number(rain[i])) ? `${Math.round(rain[i])}% rain` : "—"}</small>`;
    return item;
  }));

  if (!window.Chart) {
    if (state.chart) state.chart.destroy();
    state.chart = null;
    return;
  }
  if (state.chart) state.chart.destroy();
  const context = el("hourly-chart").getContext("2d");
  state.chart = new Chart(context, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Temperature",
          data: temps.map((value) => value === null || value === undefined ? null : convertTemperature(value)),
          borderColor: "#687bed",
          backgroundColor: "rgba(104, 123, 237, .09)",
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: .38,
          fill: true,
          yAxisID: "y"
        },
        {
          label: "Rain chance",
          data: rain.map((value) => value === null || value === undefined ? null : Number(value)),
          borderColor: "#65c7b1",
          backgroundColor: "rgba(101, 199, 177, .05)",
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: .35,
          fill: false,
          yAxisID: "y1"
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#222b4a",
          padding: 10,
          displayColors: true,
          callbacks: {
            label: (item) => item.dataset.label === "Temperature" ? ` ${Math.round(item.raw)}${state.unit === "c" ? "°C" : "°F"}` : ` ${item.raw}% chance of rain`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: "#a0a6b5", maxTicksLimit: 8, maxRotation: 0, font: { size: 9 } } },
        y: { position: "left", grid: { color: "#f1f2f7" }, border: { display: false }, ticks: { color: "#a0a6b5", maxTicksLimit: 5, font: { size: 9 }, callback: (value) => `${Math.round(value)}°` } },
        y1: { position: "right", min: 0, max: 100, grid: { display: false }, border: { display: false }, ticks: { display: false } }
      }
    }
  });
}

function renderDaily(daily, todayIndex) {
  const rows = daily.time.map((date, index) => {
    const dayName = index === todayIndex ? "Today" : new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: state.location.timezone || "Asia/Kolkata" }).format(new Date(`${date}T12:00:00`));
    const condition = weatherInfo(daily.weather_code[index]);
    const rainValue = daily.precipitation_probability_max?.[index];
    const rain = rainValue === null || rainValue === undefined ? NaN : Number(rainValue);
    const rainText = Number.isFinite(rain) && rain > 0 ? `${Math.round(rain)}%` : "";
    return `<div class="daily-row"><span class="daily-day ${index === todayIndex ? "today" : ""}">${escapeHtml(dayName)}</span><span class="daily-condition"><span class="daily-icon" aria-hidden="true">${condition.icon}</span><span>${escapeHtml(condition.label)}</span></span><span class="daily-rain">${rainText ? `☂ ${rainText}` : ""}</span><span class="daily-temperatures"><strong>${escapeHtml(formatTemp(daily.temperature_2m_max?.[index]))}</strong><span class="daily-range" aria-hidden="true"></span><span>${escapeHtml(formatTemp(daily.temperature_2m_min?.[index]))}</span></span></div>`;
  });
  el("daily-list").innerHTML = rows.join("");
}

function renderSun(daily, index, currentTime) {
  const sunrise = daily.sunrise?.[index];
  const sunset = daily.sunset?.[index];
  el("sunrise").textContent = formatTime(sunrise);
  el("sunset").textContent = formatTime(sunset);
  if (!sunrise || !sunset) return;
  const start = new Date(sunrise).getTime();
  const end = new Date(sunset).getTime();
  const now = new Date(currentTime).getTime();
  const progress = end > start ? bounded(((now - start) / (end - start)) * 100, 0, 100) : 0;
  el("sun-track-fill").style.width = `${progress}%`;
  el("sun-position").style.left = `${progress}%`;
}

function renderAirQuality() {
  const current = state.air && state.air.current;
  if (!current || current.us_aqi === null || current.us_aqi === undefined || !Number.isFinite(Number(current.us_aqi))) {
    el("aqi-category").textContent = "Estimate unavailable";
    el("aqi-value").textContent = "—";
    el("aqi-description").textContent = "No current AQI estimate available";
    return;
  }
  const aqi = Math.round(Number(current.us_aqi));
  const levels = [
    { max: 50, category: "Good", color: "#45a676", bg: "#eaf7ef", description: "Air quality is satisfactory." },
    { max: 100, category: "Moderate", color: "#b38b26", bg: "#fbf5df", description: "Acceptable; some may be sensitive." },
    { max: 150, category: "Unhealthy for sensitive groups", color: "#c77a37", bg: "#fff0e2", description: "Sensitive groups may be affected." },
    { max: 200, category: "Unhealthy", color: "#c85858", bg: "#fff0ef", description: "Everyone may begin to feel effects." },
    { max: 300, category: "Very unhealthy", color: "#96559a", bg: "#f7eef8", description: "Health alert: limit prolonged outdoor activity." },
    { max: 500, category: "Hazardous", color: "#704854", bg: "#f3e9ed", description: "Health warning: reduce outdoor exposure." }
  ];
  const level = levels.find((item) => aqi <= item.max) || levels[levels.length - 1];
  el("aqi-value").textContent = aqi;
  el("aqi-category").textContent = level.category;
  el("aqi-description").textContent = level.description;
  el("aqi-badge").style.color = level.color;
  el("aqi-badge").style.background = level.bg;
  const details = [];
  if (Number.isFinite(Number(current.pm2_5))) details.push(`PM2.5 ${Number(current.pm2_5).toFixed(1)} µg/m³`);
  if (Number.isFinite(Number(current.pm10))) details.push(`PM10 ${Number(current.pm10).toFixed(1)} µg/m³`);
  el("air-footnote").textContent = `${details.length ? `${details.join(" · ")} · ` : ""}Modelled estimate, not a local sensor reading.`;
}

function renderLocalities() {
  const container = el("locality-grid");
  if (!state.localityWeather) {
    const isBengaluru = Math.abs(Number(state.location.latitude) - DEFAULT_LOCATION.latitude) < 0.02
      && Math.abs(Number(state.location.longitude) - DEFAULT_LOCATION.longitude) < 0.02;
    container.innerHTML = `<div class="locality-placeholder">${isBengaluru ? "Bengaluru locality forecasts are temporarily unavailable." : "Select Bengaluru to see its neighbourhood forecast."}</div>`;
    return;
  }
  container.innerHTML = LOCALITIES.map((place, index) => {
    const forecast = state.localityWeather[index];
    const current = forecast && forecast.current;
    const daily = forecast && forecast.daily;
    if (!current) return "";
    const condition = weatherInfo(current.weather_code);
    return `<button class="locality-card" type="button" data-locality="${index}" aria-label="Show weather for ${escapeHtml(place.name)}"><span class="locality-card-top"><strong class="locality-card-name">${escapeHtml(place.name)}</strong><span class="locality-card-weather" aria-hidden="true">${condition.icon}</span></span><span class="locality-condition">${escapeHtml(condition.label)} · Wind ${escapeHtml(displayNumber(current.wind_speed_10m))} km/h</span><span class="locality-card-bottom"><strong>${escapeHtml(formatTemp(current.temperature_2m))}</strong><span>H ${escapeHtml(formatTemp(daily?.temperature_2m_max?.[0]))} · L ${escapeHtml(formatTemp(daily?.temperature_2m_min?.[0]))}</span></span></button>`;
  }).join("");
  container.querySelectorAll("[data-locality]").forEach((button) => {
    button.addEventListener("click", () => {
      const place = LOCALITIES[Number(button.dataset.locality)];
      loadWeather({ ...place, admin1: "Karnataka", country: "India", timezone: "Asia/Kolkata" });
    });
  });
}

function renderMap() {
  el("map-location-label").textContent = `India · ${state.unit === "c" ? "°C" : "°F"} · Selected: ${state.location.name}`;
  if (!window.L) return;
  const point = [Number(state.location.latitude), Number(state.location.longitude)];
  if (!state.map) {
    state.map = L.map("weather-map", { scrollWheelZoom: true, minZoom: 4, maxZoom: 12 }).setView([22.5, 79], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
    }).addTo(state.map);
    state.map.cityLayer = L.layerGroup().addTo(state.map);
  }
  state.map.cityLayer.clearLayers();
  const visibleCities = state.majorCities || [];
  visibleCities.forEach((city, index) => {
    const current = city.forecast && city.forecast.current;
    if (!current) return;
    const icon = L.divIcon({
      className: "city-map-marker",
      html: `<span>${escapeHtml(formatTemp(current.temperature_2m))}</span>`,
      iconSize: [48, 28],
      iconAnchor: [24, 14]
    });
    const marker = L.marker([city.latitude, city.longitude], { icon, title: `${city.name}, ${city.admin1}: ${formatTemp(current.temperature_2m)}${state.unit === "c" ? "C" : "F"}` })
      .addTo(state.map.cityLayer);
    marker.bindPopup(`<strong>${escapeHtml(city.name)}</strong><br>${escapeHtml(city.admin1)}, India · ${escapeHtml(weatherInfo(current.weather_code).label)} · ${escapeHtml(formatTemp(current.temperature_2m))}${state.unit === "c" ? "C" : "F"}`);
    marker.on("click", () => {
      selectLocation(city);
    });
  });
  const isMajorCity = visibleCities.some((city) => Math.abs(city.latitude - point[0]) < 0.05 && Math.abs(city.longitude - point[1]) < 0.05);
  if (!isMajorCity) {
    const selected = L.marker(point, { title: state.location.name }).addTo(state.map.cityLayer);
    selected.bindPopup(`<span class="map-popup">${escapeHtml(state.location.name)} · ${escapeHtml(el("current-temperature").textContent)}${escapeHtml(el("current-unit").textContent)}</span>`).openPopup();
  }
  if (!visibleCities.length) {
    state.map.setView(point, 5);
  }
  state.map.invalidateSize();
}

function cityForecastUrl(cities) {
  const latitudes = cities.map((city) => city.latitude).join(",");
  const longitudes = cities.map((city) => city.longitude).join(",");
  return `${WEATHER_URL}?latitude=${latitudes}&longitude=${longitudes}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=precipitation_probability,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FKolkata&forecast_days=2`;
}

async function loadMajorCities() {
  const loading = el("india-highlights");
  if (loading) loading.innerHTML = '<div class="insight-loading"><span class="loader"></span> Loading live city forecasts…</div>';
  try {
    const loaded = [];
    for (let start = 0; start < MAJOR_CITIES.length; start += 10) {
      const batch = MAJOR_CITIES.slice(start, start + 10);
      try {
        const data = await fetchCachedJson(`${STORAGE_KEYS.cities}-batch-v2-${start / 10}`, cityForecastUrl(batch), 10 * 60 * 1000);
        const forecasts = Array.isArray(data) ? data : [data];
        loaded.push(...batch.map((city, index) => ({ ...city, forecast: forecasts[index] || null })).filter((city) => city.forecast?.current));
      } catch (error) {
        console.warn(`Forecast batch ${Math.floor(start / 10) + 1} failed.`, error);
      }
    }
    state.majorCities = loaded;
    if (!state.majorCities.length) throw new Error("No major city forecasts were returned.");
    renderMajorCities();
    renderComparison();
    renderMap();
  } catch (error) {
    console.error("Could not load major Indian city forecasts.", error);
    el("india-highlights").innerHTML = '<div class="insight-loading">Major city forecasts could not be loaded. <button class="retry-cities" id="retry-cities" type="button">Try again</button></div>';
    el("retry-cities").addEventListener("click", loadMajorCities);
    el("major-city-grid").replaceChildren();
    el("compare-picker").replaceChildren();
    el("comparison-message").textContent = "City comparison is unavailable until city forecasts load.";
  }
}

function cityRainProbability(city) {
  const hourly = city.forecast?.hourly;
  const currentTime = city.forecast?.current?.time;
  if (!hourly?.time || !hourly.precipitation_probability) return null;
  const start = hourly.time.findIndex((time) => time >= currentTime);
  const values = finiteValues(hourly.precipitation_probability.slice(Math.max(start, 0), Math.max(start, 0) + 24));
  return values.length ? Math.max(...values) : null;
}

function renderMajorCities() {
  if (!state.majorCities) return;
  const selectedRegion = el("region-filter").value;
  const visible = state.majorCities.filter((city) => selectedRegion === "all" || city.region === selectedRegion);
  const regionalGroups = new Map();
  for (const city of state.majorCities) {
    const current = city.forecast.current;
    const group = regionalGroups.get(city.region) || { temperatures: [], rainy: 0, count: 0 };
    if (current.temperature_2m !== null && current.temperature_2m !== undefined && Number.isFinite(Number(current.temperature_2m))) group.temperatures.push(Number(current.temperature_2m));
    const rainChance = cityRainProbability(city);
    if (rainChance !== null && rainChance >= 40) group.rainy += 1;
    group.count += 1;
    regionalGroups.set(city.region, group);
  }
  el("india-highlights").innerHTML = [...regionalGroups.entries()].map(([region, group]) => {
    const avg = group.temperatures.length ? group.temperatures.reduce((sum, value) => sum + value, 0) / group.temperatures.length : null;
    const rain = group.rainy ? `${group.rainy} of ${group.count} cities with rain chance` : "No high rain chance in sampled cities";
    return `<div class="region-summary"><span>${escapeHtml(region)}</span><strong>${avg === null ? "—" : escapeHtml(formatTemp(avg))} avg</strong><small>${escapeHtml(rain)}</small></div>`;
  }).join("");
  el("major-city-grid").innerHTML = visible.map((city) => {
    const current = city.forecast.current;
    const info = weatherInfo(current.weather_code);
    const rain = cityRainProbability(city);
    const isFavorite = isFavoriteLocation(city);
    return `<article class="major-city-card"><button class="city-open" type="button" data-city="${escapeHtml(city.name)}" aria-label="Show weather for ${escapeHtml(city.name)}, ${escapeHtml(city.admin1)}"><span class="major-city-top"><strong>${escapeHtml(city.name)}</strong><span class="major-city-icon" aria-hidden="true">${info.icon}</span></span><span class="major-city-state">${escapeHtml(city.admin1)} · ${escapeHtml(city.region)}</span><span class="major-city-condition">${escapeHtml(info.label)}</span><span class="major-city-bottom"><strong>${escapeHtml(formatTemp(current.temperature_2m))}</strong><span>Feels ${escapeHtml(formatTemp(current.apparent_temperature))} · Rain ${rain === null ? "—" : `${Math.round(rain)}%`}</span></span></button><button class="city-favorite ${isFavorite ? "active" : ""}" type="button" data-favorite-city="${escapeHtml(city.name)}" aria-label="${isFavorite ? "Remove" : "Add"} ${escapeHtml(city.name)} ${isFavorite ? "from" : "to"} favourites" title="${isFavorite ? "Remove" : "Add"} favourite">${isFavorite ? "★" : "☆"}</button></article>`;
  }).join("");
  el("major-city-grid").querySelectorAll("[data-city]").forEach((button) => {
    button.addEventListener("click", () => {
      const city = MAJOR_CITIES.find((item) => item.name === button.dataset.city);
      if (city) selectLocation(city);
    });
  });
  el("major-city-grid").querySelectorAll("[data-favorite-city]").forEach((button) => {
    button.addEventListener("click", () => {
      const city = MAJOR_CITIES.find((item) => item.name === button.dataset.favoriteCity);
      if (city) toggleFavoriteLocation({ ...city, country: "India", timezone: "Asia/Kolkata" });
    });
  });
}

function renderComparison() {
  const picker = el("compare-picker");
  if (!state.majorCities) return;
  const selected = state.comparisonSelection || new Set();
  if (!state.comparisonSelection) state.comparisonSelection = selected;
  picker.innerHTML = state.majorCities.map((city) => {
    const checked = selected.has(city.name);
    const disabled = !checked && selected.size >= 4;
    return `<label class="compare-option ${disabled ? "disabled" : ""}"><input type="checkbox" value="${escapeHtml(city.name)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}><span>${escapeHtml(city.name)}</span></label>`;
  }).join("");
  picker.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => {
    if (input.checked && selected.size < 4) selected.add(input.value);
    else selected.delete(input.value);
    renderComparison();
  }));
  const cities = state.majorCities.filter((city) => selected.has(city.name));
  el("comparison-count").textContent = `${cities.length} selected`;
  const wrap = el("comparison-table-wrap");
  const message = el("comparison-message");
  if (cities.length < 2) {
    wrap.hidden = true;
    message.textContent = "Select at least two cities to compare.";
    return;
  }
  message.textContent = `Current forecast values · ${state.unit === "c" ? "°C" : "°F"} · Rain chance is peak in next 24 hours`;
  const metrics = [
    ["Temperature", (city) => `${formatTemp(city.forecast.current.temperature_2m)}`],
    ["Feels like", (city) => `${formatTemp(city.forecast.current.apparent_temperature)}`],
    ["Humidity", (city) => valueWithUnit(city.forecast.current.relative_humidity_2m, "%")],
    ["Wind speed", (city) => valueWithUnit(city.forecast.current.wind_speed_10m, " km/h")],
    ["Rain probability", (city) => { const rain = cityRainProbability(city); return rain === null ? "—" : `${Math.round(rain)}%`; }]
  ];
  wrap.innerHTML = `<table class="comparison-table"><thead><tr><th>Measure</th>${cities.map((city) => `<th>${escapeHtml(city.name)}<small>${escapeHtml(city.admin1)}</small></th>`).join("")}</tr></thead><tbody>${metrics.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th>${cities.map((city) => `<td>${escapeHtml(value(city))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  wrap.hidden = false;
}

function valueWithUnit(value, unit) {
  return value !== null && value !== undefined && Number.isFinite(Number(value)) ? `${displayNumber(value)}${unit}` : "—";
}

function renderWeatherInsights() {
  const hourly = state.weather.hourly;
  const daily = state.weather.daily;
  const current = state.weather.current;
  const start = Math.max(0, hourly.time.findIndex((time) => time >= current.time));
  const nextRainValues = finiteValues((hourly.precipitation || []).slice(start, start + 24));
  const nextRain = nextRainValues.length ? nextRainValues.reduce((sum, value) => sum + value, 0) : null;
  const nextRainProbability = finiteValues((hourly.precipitation_probability || []).slice(start, start + 24));
  const peakRain = nextRainProbability.length ? Math.max(...nextRainProbability) : null;
  const weekRainValues = finiteValues(daily.precipitation_sum);
  const weekRain = weekRainValues.length ? weekRainValues.reduce((sum, value) => sum + value, 0) : null;
  const maxTemps = finiteValues(daily.temperature_2m_max);
  const minTemps = finiteValues(daily.temperature_2m_min);
  const uvValues = finiteValues(daily.uv_index_max);
  const maxTemp = maxTemps.length ? Math.max(...maxTemps) : null;
  const minTemp = minTemps.length ? Math.min(...minTemps) : null;
  const uvMax = uvValues.length ? Math.max(...uvValues) : null;
  const windValues = finiteValues((hourly.wind_speed_10m || []).slice(start, start + 24));
  const maxWind = windValues.length ? Math.max(...windValues) : (current.wind_speed_10m === null || current.wind_speed_10m === undefined ? null : Number(current.wind_speed_10m));
  const generated = [];
  if (Number.isFinite(peakRain) && peakRain >= 50) generated.push({ type: "rain", title: "Rain likely", text: `Peak hourly rain chance ${Math.round(peakRain)}% in the next 24 hours.` });
  if (maxTemp !== null && maxTemp >= 38) generated.push({ type: "heat", title: "Hot conditions", text: `Forecast high reaches ${formatTemp(maxTemp)}.` });
  if (minTemp !== null && minTemp <= 10) generated.push({ type: "cold", title: "Cold morning", text: `Forecast low reaches ${formatTemp(minTemp)}.` });
  if (uvMax !== null && uvMax >= 8) generated.push({ type: "uv", title: "Very high UV", text: `Forecast UV index peaks at ${displayNumber(uvMax, 1)}.` });
  if (maxWind !== null && maxWind >= 40) generated.push({ type: "wind", title: "Strong winds", text: `Forecast wind speed reaches ${displayNumber(maxWind)} km/h.` });
  el("generated-alerts").innerHTML = generated.length
    ? generated.map((alert) => `<div class="generated-alert ${alert.type}"><strong>${escapeHtml(alert.title)}</strong><span>${escapeHtml(alert.text)}</span></div>`).join("")
    : '<div class="generated-alert calm"><strong>No notable threshold alerts</strong><span>Based on the available forecast for this location.</span></div>';
  const month = new Date(`${daily.time?.[0] || new Date().toISOString().slice(0, 10)}T12:00:00`).getMonth() + 1;
  const season = month >= 6 && month <= 9 ? "Southwest monsoon season" : month >= 10 && month <= 12 ? "Northeast/post-monsoon period" : "Non-monsoon period";
  el("rainfall-summary").innerHTML = `<strong>Rainfall outlook · ${escapeHtml(season)}</strong><span>${nextRain === null ? "24h rainfall unavailable" : `${escapeHtml(displayNumber(nextRain, 1))} mm expected next 24h`} · ${weekRain === null ? "7-day rainfall unavailable" : `${escapeHtml(displayNumber(weekRain, 1))} mm over 7 days`}${peakRain === null ? "" : ` · peak rain chance ${Math.round(peakRain)}%`}</span>`;
  let recommendation = "Forecast looks suitable for outdoor plans; check again before heading out.";
  if ((peakRain !== null && peakRain >= 40) || (nextRain !== null && nextRain >= 1)) recommendation = "Consider carrying an umbrella and allow extra travel time for possible rain.";
  else if (maxTemp !== null && maxTemp >= 36) recommendation = "Plan strenuous outdoor activity for cooler hours and stay hydrated.";
  else if (uvMax !== null && uvMax >= 6) recommendation = "Outdoor plans look possible; consider shade and sun protection around midday.";
  else if (maxWind !== null && maxWind >= 35) recommendation = "Expect breezy conditions; secure loose items during outdoor activities.";
  el("activity-tip").innerHTML = `<strong>Outdoor tip</strong><span>${escapeHtml(recommendation)}</span>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function setUnit(unit) {
  if (!["c", "f"].includes(unit) || unit === state.unit) return;
  state.unit = unit;
  try {
    localStorage.setItem(STORAGE_KEYS.unit, unit);
  } catch (error) {
    console.error("Could not save the temperature preference.", error);
  }
  updateUnitButton();
  if (state.weather) {
    renderWeather();
    renderMajorCities();
    renderComparison();
  }
}

function updateUnitButton() {
  document.querySelectorAll(".unit-option").forEach((option) => {
    option.classList.toggle("active", option.dataset.unit === state.unit);
  });
  el("unit-toggle").setAttribute("aria-label", `Temperature units: ${state.unit === "c" ? "Celsius" : "Fahrenheit"}. Switch units`);
}

function updateFavoriteButton() {
  const isFavorite = isFavoriteLocation(state.location);
  el("favorite-button").classList.toggle("is-favorite", isFavorite);
  el("favorite-button").setAttribute("aria-label", isFavorite ? "Remove current city from favourites" : "Add current city to favourites");
  el("favorite-button").title = isFavorite ? "Remove from favourites" : "Add to favourites";
}

function toggleFavorite() {
  toggleFavoriteLocation(state.location);
}

function isFavoriteLocation(location) {
  const key = (place) => `${Number(place.latitude).toFixed(3)},${Number(place.longitude).toFixed(3)}`;
  return state.favorites.some((place) => key(place) === key(location));
}

function toggleFavoriteLocation(location) {
  const key = (place) => `${Number(place.latitude).toFixed(3)},${Number(place.longitude).toFixed(3)}`;
  const existing = state.favorites.findIndex((place) => key(place) === key(location));
  if (existing >= 0) state.favorites.splice(existing, 1);
  else state.favorites.push({ ...location, country: location.country || "India", timezone: location.timezone || "Asia/Kolkata" });
  saveFavorites();
  updateFavoriteButton();
  renderFavorites();
  renderMajorCities();
}

function renderFavorites() {
  const popover = el("favorites-popover");
  popover.replaceChildren();
  const title = document.createElement("div");
  title.className = "popover-title";
  title.textContent = "Saved places";
  popover.append(title);
  if (!state.favorites.length) {
    const empty = document.createElement("div");
    empty.className = "empty-favorites";
    empty.textContent = "No favourites yet. Save a city with the star.";
    popover.append(empty);
    return;
  }
  state.favorites.forEach((place) => {
    const button = document.createElement("button");
    button.className = "favorite-item";
    button.type = "button";
    button.innerHTML = `${escapeHtml(place.name)}<small>${escapeHtml([place.admin1, place.country].filter(Boolean).join(", "))}</small>`;
    button.addEventListener("click", () => {
      el("favorites-popover").hidden = true;
      loadWeather(place);
    });
    popover.append(button);
  });
}

async function searchLocations(query) {
  const box = el("search-results");
  box.replaceChildren();
  const normalized = query.trim();
  if (normalized.length < 2) {
    showSearchMessage("Enter at least 2 characters to search.");
    return;
  }
  const submitButton = document.querySelector(".search-button");
  submitButton.disabled = true;
  submitButton.textContent = "Searching…";
  box.hidden = false;
  try {
    const url = `${GEOCODING_URL}?name=${encodeURIComponent(normalized)}&count=10&language=en&countryCode=IN&format=json`;
    const data = await fetch(url).then(checkResponse);
    const results = (data.results || []).filter((place) =>
      Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
      && (!place.country_code || place.country_code.toUpperCase() === "IN")
    );
    if (!results.length) {
      showSearchMessage("No matching places found in India. Try a city, district or locality.");
      return;
    }
    results.forEach((place) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      button.setAttribute("role", "option");
      const name = document.createElement("strong");
      name.textContent = place.name;
      const detail = document.createElement("span");
      detail.textContent = [place.admin1, place.country].filter(Boolean).join(", ");
      button.append(name, detail);
      button.addEventListener("click", () => {
        const selected = {
          name: place.name,
          admin1: place.admin1 || "",
          country: place.country || "India",
          latitude: place.latitude,
          longitude: place.longitude,
          timezone: place.timezone || "Asia/Kolkata"
        };
        el("location-search").value = "";
        box.hidden = true;
        selectLocation(selected);
      });
      box.append(button);
    });
  } catch (error) {
    console.error("Location search failed.", error);
    showSearchMessage("Location search is unavailable. Check your connection and try again.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Search";
  }
}

function selectLocation(location) {
  const selected = {
    ...location,
    country: location.country || "India",
    timezone: location.timezone || "Asia/Kolkata"
  };
  state.recent = [selected, ...state.recent.filter((item) =>
    `${Number(item.latitude).toFixed(3)},${Number(item.longitude).toFixed(3)}`
    !== `${Number(selected.latitude).toFixed(3)},${Number(selected.longitude).toFixed(3)}`
  )].slice(0, 6);
  try {
    localStorage.setItem(STORAGE_KEYS.recent, JSON.stringify(state.recent));
  } catch (error) {
    console.warn("Could not save recent locations.", error);
  }
  loadWeather(selected);
}

function renderRecentSearches() {
  const box = el("search-results");
  if (!state.recent.length) {
    box.hidden = true;
    return;
  }
  box.replaceChildren();
  const title = document.createElement("div");
  title.className = "popover-title";
  title.textContent = "Recently viewed";
  box.append(title);
  state.recent.forEach((location) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    const name = document.createElement("strong");
    name.textContent = location.name;
    const details = document.createElement("span");
    details.textContent = [location.admin1, location.country || "India"].filter(Boolean).join(", ");
    button.append(name, details);
    button.addEventListener("click", () => {
      box.hidden = true;
      selectLocation(location);
    });
    box.append(button);
  });
  box.hidden = false;
}

function showSearchMessage(message) {
  const box = el("search-results");
  box.replaceChildren();
  const node = document.createElement("div");
  node.className = "no-results";
  node.textContent = message;
  box.append(node);
  box.hidden = false;
}

el("search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  searchLocations(el("location-search").value);
});
el("location-search").addEventListener("focus", () => {
  if (!el("location-search").value.trim()) renderRecentSearches();
});
el("region-filter").addEventListener("change", renderMajorCities);
el("unit-toggle").addEventListener("click", () => setUnit(state.unit === "c" ? "f" : "c"));
el("favorite-button").addEventListener("click", toggleFavorite);
el("favorites-menu-button").addEventListener("click", () => {
  renderFavorites();
  el("favorites-popover").hidden = !el("favorites-popover").hidden;
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-form")) el("search-results").hidden = true;
  if (!event.target.closest(".top-actions") && !event.target.closest(".favorites-popover")) el("favorites-popover").hidden = true;
});
el("footer-date").textContent = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date());
updateUnitButton();
updateLocationHeading();
loadMajorCities();
loadWeather(DEFAULT_LOCATION);
