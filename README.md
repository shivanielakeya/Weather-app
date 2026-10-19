# Skycast — India Weather

A responsive India-wide weather dashboard built with HTML, CSS and vanilla JavaScript. It keeps the Bengaluru forecast and neighbourhood view while adding live forecasts for major Indian cities, a country-wide map, comparisons and clearly labelled forecast insights.

## Features

- Live current conditions, feels-like temperature, humidity, wind, UV, cloud cover and high/low.
- Interactive 24-hour temperature/rain-probability chart, hourly forecast and seven-day forecast.
- City/locality search limited to India by default, with state and country in each suggestion.
- Recently viewed places, favourites, and Celsius/Fahrenheit conversion.
- Forecast cards for 25 major cities across North, South, East, West, Central and Northeast India; filter the overview by region.
- Interactive India map with live temperature markers. Pan, zoom, and select a marker to open that city's forecast.
- Compare two to four curated cities for temperature, feels-like temperature, humidity, wind and peak 24-hour rain probability.
- Weather insights for forecast rain, heat, cold, UV and wind thresholds, plus 24-hour/seven-day rainfall and an outdoor tip.
- Bengaluru neighbourhood forecast, sunrise/sunset and modelled air-quality estimate.
- Loading/error/retry states and short browser-side caching for repeat requests.

## Technology

- HTML, CSS and vanilla JavaScript (no build step or backend).
- [Chart.js](https://www.chartjs.org/) via CDN for the hourly chart.
- [Leaflet](https://leafletjs.com/) via CDN and OpenStreetMap tiles for the interactive map.

## APIs and data sources

- Forecasts: [Open-Meteo Forecast API](https://api.open-meteo.com/v1/forecast)
- Search: [Open-Meteo Geocoding API](https://geocoding-api.open-meteo.com/v1/search), filtered to India (`countryCode=IN`).
- Air quality: [Open-Meteo Air Quality API](https://air-quality-api.open-meteo.com/v1/air-quality)
- Map tiles: [OpenStreetMap](https://www.openstreetmap.org/copyright)
- Official advisory reference: [India Meteorological Department](https://mausam.imd.gov.in/)

Weather requests use the selected place's timezone where available; the major-city comparison forecast uses `Asia/Kolkata`. Major-city data is requested in small multi-coordinate batches and cached in local storage for up to ten minutes. Current weather responses are cached for five minutes and air-quality estimates for fifteen minutes. Cached values remain model forecasts, not live station measurements.

Air-quality values are modelled estimates, not local sensor readings. Application-generated threshold alerts and activity tips are based on forecast model variables and are **not official warnings**.

## Official IMD warnings

The app does not currently ingest official IMD warnings. During implementation, a reliable public machine-readable warning feed and its access requirements could not be verified for this static client. To avoid showing invented or stale official alerts, the app links directly to the IMD portal instead. Check IMD for authoritative, current warnings and their issue/validity details.

## Run locally

1. Open this folder in VS Code.
2. Install/enable the **Live Server** extension if needed.
3. Right-click `index.html` and choose **Open with Live Server**.
4. Allow network access for Open-Meteo, Leaflet/OpenStreetMap, Chart.js and Google Fonts.

## Deploy

The app is static and needs no build command. On **GitHub Pages**, push the files to a repository and select the branch/root directory in **Settings → Pages**. On **Netlify**, drag the folder into Netlify Drop or connect the repository; use the project root as the publish directory.

## Known limitations

- Forecasts, geocoding, map tiles and air-quality data require internet access and can be delayed or unavailable.
- The city overview covers a curated set of 25 major cities; it is not a complete station network or every Indian district. Search can find additional geocoded places in India.
- City rainfall chance is the peak hourly probability in the next 24 hours. Rainfall totals and generated thresholds are model forecasts, not official warnings.
- IMD warnings are not integrated as a feed; use the official IMD link for verified alerts.
- Air quality is modelled and may not match nearby monitoring stations.
- Chart.js, Leaflet and fonts are CDN-hosted; an unavailable CDN may disable the chart or map.
