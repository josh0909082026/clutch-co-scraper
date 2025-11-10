onst fs = require('fs');
const path = require('path');
const axios = require('axios');

function timestamp() {
return new Date().toISOString();
}

function logInfo(message) {
console.log(`[INFO] [${timestamp()}] ${message}`);
}

function logError(message) {
console.error(`[ERROR] [${timestamp()}] ${message}`);
}

/**
* Fetch HTML with retries and basic timeouts.
*/
async function fetchHtml(url, options = {}) {
const timeoutMs = options.timeoutMs || 15000;
const retries = typeof options.retries === 'number' ? options.retries : 2;
const retryDelayMs = options.retryDelayMs || 1500;

let attempt = 0;
let lastError = null;

while (attempt <= retries) {
try {
const response = await axios.get(url, {
timeout: timeoutMs,
headers: {
'User-Agent':
'Mozilla/5.0 (compatible; ClutchScraper/1.0; +https://bitbash.dev)',
Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
},
});
return response.data;
} catch (err) {
lastError = err;
attempt += 1;
if (attempt > retries) break;
logError(
`Request failed for ${url} (attempt ${attempt} of ${retries + 1}): ${err.message}`
);
await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
}
}

throw lastError || new Error(`Failed to fetch ${url}`);
}

/**
* Safely load JSON file; returns null on error.
*/
async function loadJsonFile(filePath) {
const resolved = path.resolve(filePath);

try {
const raw = await fs.promises.readFile(resolved, 'utf8');
return JSON.parse(raw);
} catch (err) {
logError(`Failed to read JSON file at ${resolved}: ${err.message}`);
return null;
}
}

module.exports = {
fetchHtml,
loadJsonFile,
logInfo,
logError,
};