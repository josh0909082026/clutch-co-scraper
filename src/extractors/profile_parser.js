onst cheerio = require('cheerio');
const { logInfo } = require('./utils');

/**
 * Parse the "summary" block of a Clutch company profile.
 */
function parseSummary($) {
  const name =
    $('h1[itemprop="name"]').first().text().trim() ||
    $('.entity-name').first().text().trim() ||
    $('h1').first().text().trim();

  const title =
    $('.tagline').first().text().trim() ||
    $('[data-js="tagline"]').first().text().trim();

  const ratingText =
    $('.rating[itemprop="ratingValue"]').first().text().trim() ||
    $('.rating span').first().text().trim();
  const rating = ratingText ? parseFloat(ratingText) || null : null;

  const noOfReviewsText =
    $('[data-link-text="Reviews"]').first().text().trim() ||
    $('.reviews-link').first().text().trim();
  const noOfReviewsMatch = noOfReviewsText && noOfReviewsText.match(/\d+/);
  const noOfReviews = noOfReviewsMatch ? parseInt(noOfReviewsMatch[0], 10) : null;

  const description =
    $('[itemprop="description"]').first().text().trim() ||
    $('.summary-description').first().text().trim();

  const verificationStatus =
    $('.verification-badge').first().text().trim() ||
    $('.verification-label').first().text().trim();

  const metaItems = {};
  $('.quick-facts li, .about ul li').each((_, el) => {
    const label = $(el).find('span, strong').first().text().trim().toLowerCase();
    const value = $(el).text().replace($(el).find('span, strong').first().text(), '').trim();
    if (!label || !value) return;
    metaItems[label] = value;
  });

  const minProjectSize =
    metaItems['min. project size'] ||
    metaItems['min project size'] ||
    metaItems['min. project'] ||
    null;

  const averageHourlyRate =
    metaItems['avg. hourly rate'] ||
    metaItems['average hourly rate'] ||
    null;

  const employees =
    metaItems['employees'] ||
    metaItems['company size'] ||
    null;

  const founded =
    metaItems['founded'] ||
    metaItems['founded year'] ||
    null;

  return {
    name: name || null,
    title: title || null,
    rating,
    noOfReviews,
    description: description || null,
    verificationStatus: verificationStatus || null,
    minProjectSize,
    averageHourlyRate,
    employees,
    founded,
  };
}

/**
 * Parse "focus" areas such as client focus or service focus.
 */
function parseFocusAreas($) {
  const focusSections = [];

  $('.focus-area, .chart-bars').each((_, section) => {
    const title =
      $(section).find('.focus-title, h3, h4').first().text().trim() ||
      'Focus';

    const values = [];
    $(section)
      .find('.focus-item, .bar, li')
      .each((__, el) => {
        const name =
          $(el).find('.focus-label, .chart-label, span').first().text().trim() ||
          $(el).clone().children().remove().end().text().trim();
        const percentageText =
          $(el).find('.percentage, .chart-value').first().text().trim() ||
          $(el).text().trim();
        const match = percentageText.match(/(\d+)\s*%/);
        const percentage = match ? parseInt(match[1], 10) : null;

        if (name && percentage !== null) {
          values.push({ name, percentage });
        }
      });

    if (values.length) {
      focusSections.push({ title, values });
    }
  });

  return focusSections;
}

/**
 * Parse services provided by the company and their relative share.
 */
function parseServices($) {
  const services = [];
  $('.service-list li, .service-item').each((_, el) => {
    const name =
      $(el).find('.service-name, span, a').first().text().trim() ||
      $(el).text().trim();

    const percentText =
      $(el).find('.service-percentage, .percentage').first().text().trim() ||
      $(el).text().trim();
    const match = percentText.match(/(\d+)\s*%/);

    if (!name) return;

    const percent = match ? parseInt(match[1], 10) / 100 : null;
    services.push({
      name,
      percent: percent !== null ? percent : null,
    });
  });

  // If no explicit services found, we still return an empty array.
  return services;
}

/**
 * Parse portfolio items if present.
 */
function parsePortfolio($) {
  const portfolio = [];

  $('.portfolio-item, .portfolio-card').each((_, el) => {
    const title =
      $(el).find('.portfolio-title, h3, h4').first().text().trim() || null;
    const description =
      $(el)
        .find('.portfolio-description, p')
        .first()
        .text()
        .trim() || null;
    const imageUrl =
      $(el).find('img').first().attr('src') ||
      $(el).find('img').first().attr('data-src') ||
      null;

    if (title || description || imageUrl) {
      portfolio.push({
        title,
        description,
        imageUrl,
      });
    }
  });

  return portfolio;
}

/**
 * Parse verification data and company website.
 */
function parseVerificationAndContact($) {
  const websiteUrl =
    $('a.website-link').first().attr('href') ||
    $('a[href^="http"]').filter((_, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('website') || text.includes('visit site');
    }).first().attr('href') ||
    null;

  const verification = {};
  $('.verification-details li, .verification-section li').each((_, el) => {
    const label = $(el).find('strong, span').first().text().trim();
    const value = $(el)
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim();
    if (label && value) {
      verification[label] = value;
    }
  });

  const contactInfo = [];
  $('.contact-info, .locality, .office-location').each((_, el) => {
    const address =
      $(el).find('address').text().trim() ||
      $(el).find('.address').text().trim() ||
      null;
    const phone =
      $(el).find('a[href^="tel:"]').first().text().trim() ||
      $(el).find('.phone').first().text().trim() ||
      null;
    const city =
      $(el).find('.locality').first().text().trim() ||
      null;
    const country =
      $(el).find('.country-name').first().text().trim() ||
      null;

    if (address || phone || city || country) {
      contactInfo.push({
        address: address || null,
        phone: phone || null,
        city,
        country,
      });
    }
  });

  return { verification: Object.keys(verification).length ? verification : null, websiteUrl, contactInfo };
}

/**
 * Parse the full profile from an HTML string.
 * Returns: { profile, $ }
 */
function parseProfile(html, url) {
  const $ = cheerio.load(html);

  logInfo(`Parsing profile for ${url}`);

  const summary = parseSummary($);
  const focus = parseFocusAreas($);
  const serviceProvided = parseServices($);
  const portfolio = parsePortfolio($);
  const { verification, websiteUrl, contactInfo } = parseVerificationAndContact($);

  const profile = {
    url,
    summary,
    focus,
    serviceProvided,
    portfolio,
    verification,
    reviews: [], // filled later by reviews_parser
    websiteUrl,
    contactInfo,
  };

  return { profile, $ };
}

module.exports = {
  parseProfile,
};