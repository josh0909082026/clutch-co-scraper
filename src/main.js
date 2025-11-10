onst fs = require('fs');
const path = require('path');
const { fetchHtml, loadJsonFile, logInfo, logError } = require('./extractors/utils');
const { parseProfile } = require('./extractors/profile_parser');
const { parseReviews } = require('./extractors/reviews_parser');
const { exportDataset } = require('./outputs/dataset_exporter');

async function loadConfig() {
const configPath = path.join(__dirname, 'config', 'settings.example.json');

try {
const raw = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(raw);
return config;
} catch (err) {
logError(`Failed to load config at ${configPath}: ${err.message}`);
return {
baseUrl: 'https://clutch.co',
includeReviews: true,
request: {
timeoutMs: 15000,
retries: 2,
retryDelayMs: 1500,
},
inputFile: path.join(__dirname, '..', 'data', 'sample_input.json'),
outputFile: path.join(__dirname, '..', 'data', 'example_output.json'),
};
}
}

async function loadInputUrls(inputFile) {
const json = await loadJsonFile(inputFile);
if (!json) {
return [];
}

if (Array.isArray(json)) {
return json;
}

if (Array.isArray(json.urls)) {
return json.urls;
}

logError('Input file must be either an array of URLs or an object with a "urls" array.');
return [];
}

async function scrapeProfile(url, config) {
try {
logInfo(`Fetching: ${url}`);
const html = await fetchHtml(url, config.request);
const { profile, $ } = parseProfile(html, url);
if (config.includeReviews) {
const reviews = parseReviews($);
profile.reviews = reviews;
} else {
profile.reviews = [];
}
return profile;
} catch (err) {
logError(`Error scraping ${url}: ${err.message}`);
return null;
}
}

async function main() {
const config = await loadConfig();

const inputPath =
config.inputFile ||
path.join(__dirname, '..', 'data', 'sample_input.json');

const outputPath =
config.outputFile ||
path.join(__dirname, '..', 'data', 'example_output.json');

const urls = await loadInputUrls(inputPath);

if (!urls.length) {
logError('No URLs found in input. Aborting.');
process.exitCode = 1;
return;
}

logInfo(`Loaded ${urls.length} profile URL(s) from input.`);

const results = [];
for (const url of urls) {
// Simple sequential scraping; you can extend to parallel if needed.
const profile = await scrapeProfile(url, config);
if (profile) {
results.push(profile);
}
}

await exportDataset(results, outputPath);
logInfo(`Scraping complete. Exported ${results.length} record(s) to ${outputPath}`);
}

if (require.main === module) {
main().catch((err) => {
logError(`Fatal error: ${err.message}`);
process.exitCode = 1;
});
}

module.exports = {
main,
};