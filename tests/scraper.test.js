onst { parseProfile } = require('../src/extractors/profile_parser');
const { parseReviews } = require('../src/extractors/reviews_parser');
const cheerio = require('cheerio');

describe('Clutch.co scraper extractors', () => {
  const sampleHtml = `
    <html>
      <body>
        <h1 itemprop="name">SmartSites</h1>
        <div class="tagline">Think Web. Think Smart.</div>
        <div class="rating"><span>5.0</span></div>
        <a data-link-text="Reviews">56 Reviews</a>
        <div itemprop="description">
          Outsmart the competition with best-in-class digital marketing services.
        </div>
        <span class="verification-badge">GOLD VERIFIED</span>
        <ul class="quick-facts">
          <li><span>Min. Project Size</span> $1,000+</li>
          <li><span>Avg. Hourly Rate</span> $100 - $149 / hr</li>
          <li><span>Employees</span> 10 - 49</li>
          <li><span>Founded</span> Founded 2011</li>
        </ul>

        <div class="focus-area">
          <h3>Client focus</h3>
          <ul>
            <li>
              <span class="focus-label">Small Business (&lt;$10M)</span>
              <span class="percentage">80%</span>
            </li>
            <li>
              <span class="focus-label">Midmarket ($10M - $1B)</span>
              <span class="percentage">20%</span>
            </li>
          </ul>
        </div>

        <ul class="service-list">
          <li>
            <span class="service-name">Web Development</span>
            <span class="service-percentage">30%</span>
          </li>
          <li>
            <span class="service-name">Custom Software Development</span>
            <span class="service-percentage">25%</span>
          </li>
        </ul>

        <a class="website-link" href="https://www.smartsites.com">Visit website</a>

        <div class="review-card" itemprop="review">
          <h3 class="review-title">SEO & PPC Services for Outdoor Refinishing Company</h3>
          <time itemprop="datePublished">May 25, 2021</time>
          <div class="rating"><span>5</span></div>
          <div class="review-body" itemprop="reviewBody">
            The team's work resulted in increased traffic and conversions.
          </div>
          <div class="reviewer">
            <span class="reviewer-name">Drew Isaacman</span>
            <span class="reviewer-title">Owner, General Manager, Teak & Deck</span>
          </div>
        </div>
      </body>
    </html>
  `;

  test('parseProfile extracts basic profile structure', () => {
    const { profile } = parseProfile(sampleHtml, 'https://clutch.co/profile/smartsites');

    expect(profile.url).toBe('https://clutch.co/profile/smartsites');
    expect(profile.summary).toBeDefined();
    expect(profile.summary.name).toBe('SmartSites');
    expect(profile.summary.title).toBe('Think Web. Think Smart.');
    expect(profile.summary.rating).toBe(5);
    expect(profile.summary.noOfReviews).toBe(56);
    expect(profile.summary.minProjectSize).toBe('$1,000+');
    expect(profile.summary.averageHourlyRate).toBe('$100 - $149 / hr');
    expect(profile.summary.employees).toBe('10 - 49');
    expect(profile.summary.founded).toBe('Founded 2011');

    expect(Array.isArray(profile.focus)).toBe(true);
    expect(profile.focus.length).toBeGreaterThan(0);
    expect(profile.focus[0].values[0].name).toContain('Small Business');

    expect(Array.isArray(profile.serviceProvided)).toBe(true);
    expect(profile.serviceProvided[0].name).toBe('Web Development');
    expect(profile.serviceProvided[0].percent).toBeCloseTo(0.3);

    expect(profile.websiteUrl).toBe('https://www.smartsites.com');
  });

  test('parseReviews extracts review details', () => {
    const $ = cheerio.load(sampleHtml);
    const reviews = parseReviews($);

    expect(Array.isArray(reviews)).toBe(true);
    expect(reviews.length).toBe(1);

    const review = reviews[0];
    expect(review.name).toBe('SEO & PPC Services for Outdoor Refinishing Company');
    expect(review.datePublished).toBe('May 25, 2021');
    expect(review.review.rating).toBe(5);
    expect(review.review.comments).toContain('increased traffic and conversions');
    expect(review.reviewer.name).toBe('Drew Isaacman');
    expect(review.reviewer.title).toContain('Owner');
  });
});