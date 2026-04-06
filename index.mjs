import express from 'express';
import { countries } from 'countries-list';

const app = express();
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const WEATHER_API_KEY = 'b6907d289e10d714a6e88b30761fae22'; // Open-Meteo is free, no key needed
// We use Open-Meteo (free, no key) + geocoding API (free, no key)

// Route 1: Home page - shows a random country info from countries-list package
app.get('/', (req, res) => {
    const codes = Object.keys(countries);
    const randomCode = codes[Math.floor(Math.random() * codes.length)];
    const country = countries[randomCode];
    res.render('home', { country, code: randomCode });
});

// Route 2: Country search - user picks a country from dropdown, shows info (countries-list package)
app.get('/country', (req, res) => {
    const code = req.query.code;
    if (!code) {
        // Show the form with all countries listed
        res.render('country', { country: null, code: null, countries });
    } else {
        const country = countries[code];
        res.render('country', { country, code, countries });
    }
});

// Route 3: Weather search - user types a city, we call Open-Meteo geocoding + weather API
app.get('/weather', (req, res) => {
    res.render('weather', { weatherData: null, city: null, error: null });
});

app.post('/weather', async (req, res) => {
    const city = req.body.city;
    try {
        // Step 1: geocode the city (free API, no key needed)
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            return res.render('weather', { weatherData: null, city, error: 'City not found. Please try another name.' });
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        // Step 2: get current weather
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relative_humidity_2m,wind_speed_10m`);
        const weatherJson = await weatherRes.json();
        const w = weatherJson.current_weather;

        const weatherData = {
            city: name,
            country,
            temp: w.temperature,
            windspeed: w.windspeed,
            weathercode: w.weathercode,
            description: getWeatherDesc(w.weathercode),
            emoji: getWeatherEmoji(w.weathercode)
        };

        res.render('weather', { weatherData, city: name, error: null });
    } catch (err) {
        console.error(err);
        res.render('weather', { weatherData: null, city, error: 'Something went wrong. Please try again.' });
    }
});

// Route 4: All countries list - shows full table from countries-list package
app.get('/countries', (req, res) => {
    const continent = req.query.continent || 'all';
    const continentNames = { AF: 'Africa', AN: 'Antarctica', AS: 'Asia', EU: 'Europe', NA: 'North America', OC: 'Oceania', SA: 'South America' };
    let filtered = Object.entries(countries);
    if (continent !== 'all') {
        filtered = filtered.filter(([, c]) => c.continent === continent);
    }
    res.render('countries', { countries: filtered, continent, continentNames });
});

// Helper: weather code to description
function getWeatherDesc(code) {
    if (code === 0) return 'Clear sky';
    if (code <= 3) return 'Partly cloudy';
    if (code <= 49) return 'Foggy';
    if (code <= 69) return 'Drizzle / Rain';
    if (code <= 79) return 'Snowy';
    if (code <= 99) return 'Thunderstorm';
    return 'Unknown';
}

function getWeatherEmoji(code) {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 49) return '🌫️';
    if (code <= 69) return '🌧️';
    if (code <= 79) return '❄️';
    if (code <= 99) return '⛈️';
    return '🌡️';
}

app.listen(3000, () => {
    console.log('Server started on port 3000');
});
