/**
 * VW Dealer BFF Data Fetcher
 *
 * Fetches dealer-specific content from VW's Backend-for-Frontend (BFF) APIs
 * during import. Dealer pages on volkswagen.de use runtime JavaScript apps
 * that fetch data from BFF endpoints — this data is not in the .model.json.
 *
 * Data Sources (3 parallel API calls):
 * 1. MyDealer BFF: Stage image, logo, intro text, next-step CTAs
 * 2. Dealer Search BFF: Address, contact, ratings, reviews, departments, services
 * 3. Teaser BFF: Promotional content cards (service highlights, model highlights)
 *
 * Authentication:
 * Both BFFs require a signed endpoint configuration that includes a country,
 * language, and environment specification plus a cryptographic signature.
 *
 * OUT OF SCOPE: Critical hardcoded values in this file:
 * - SIGNED_ENDPOINT: Contains a cryptographic signature that may expire or be
 *   rotated by VW's backend. If imports start failing with auth errors, this
 *   signature needs to be refreshed from a live volkswagen.de session.
 * - Country/language codes are hardcoded to 'de'/'DE'
 * - BFF URL patterns are specific to the VW Germany production environment
 *
 * This fetcher is only used during the import phase (build time), not at runtime.
 */

// OUT OF SCOPE: Hardcoded signed endpoint with cryptographic signature.
// This signature authenticates API requests to VW's BFF. It may expire
// or be rotated. Refresh by capturing from a live volkswagen.de network request.
const SIGNED_ENDPOINT = JSON.stringify({
  endpoint: {
    type: 'publish',
    country: 'de',
    language: 'de',
    content: 'onehub_pkw',
    envName: 'prod',
    testScenarioId: null,
  },
  signature: 'eXxF3Vp4siIxU67pK2Vs14eGqdMbD0HzeFcn3b058j8=',
});

/**
 * Fetches dealer data from VW BFF APIs.
 * @param {Object} modelData - Parsed model.json data
 * @returns {Object|null} Structured dealer data or null if not a dealer page
 */
export async function fetchDealerData(modelData) {
  // 1. Check if this is a dealer page by looking for the mydealerPageOwner property.
  //    This property is only present on dealer page model.json responses and contains
  //    the dealer's ID, display name, and legal name.
  const pageOwner = modelData?.[':items']?.root?.mydealerPageOwner;
  if (!pageOwner) return null;

  // 2. Extract dealer identifiers
  const dealerId = pageOwner.id;
  const displayName = pageOwner.displayName;
  const legalName = pageOwner.legalName;

  if (!dealerId) {
    console.error('[dealer-fetcher] mydealerPageOwner found but no dealer ID');
    return null;
  }

  // 3. Find BFF configs by walking the model.json component tree looking for
  //    featureAppSection components that contain baseUrl and apiKey configuration.
  const { mydealerConfig, dealerSearchConfig } = findBffConfigs(modelData);

  // 4. Fetch from all 3 BFF sources in parallel. Each fetch is independent and
  //    handles its own errors — a failure in one does not block the others.
  const [mydealerData, dealerSearchData, teasers] = await Promise.all([
    fetchMyDealerBff(dealerId, mydealerConfig),
    fetchDealerSearchBff(dealerId, dealerSearchConfig),
    fetchDealerTeasers(dealerId, mydealerConfig, ['service-highlights', 'vw-modelle']),
  ]);

  // 5. Build the structured result, merging data from all sources
  return buildDealerResult(dealerId, displayName, legalName, mydealerData, dealerSearchData, teasers);
}

/**
 * Walks the model.json component tree to find the MyDealer BFF and
 * Dealer Search BFF featureAppSection configs (baseUrl + apiKey).
 *
 * The component tree has featureAppSection nodes whose `config` property
 * contains a JSON string (or object) with the BFF endpoint details. This
 * function recursively traverses the tree via `:items` properties, looking
 * for configs named 'mydealer_stage' (MyDealer BFF) and 'Standalone Dealer
 * Search' or grouped as 'dealer-search' (Dealer Search BFF).
 */
function findBffConfigs(modelData) {
  let mydealerConfig = null;
  let dealerSearchConfig = null;

  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;

    // Check if this node has a featureApp config (may be JSON string or object)
    const config = parseConfig(obj.config);
    if (config) {
      // MyDealer BFF config: identified by name 'mydealer_stage'
      if (config.name === 'mydealer_stage' && config.baseUrl) {
        mydealerConfig = {
          baseUrl: config.baseUrl,
          apiKey: config.featureAppApiKey,
        };
      }
      // Dealer Search BFF config: identified by name or group name
      if (
        config.name === 'Standalone Dealer Search'
        || config.featureAppGroupName === 'dealer-search'
      ) {
        dealerSearchConfig = {
          baseUrl: config.baseUrl,
          apiKey: config.featureAppApiKey,
        };
      }
    }

    // Recurse into child components via the :items property
    const items = obj[':items'];
    if (items && typeof items === 'object') {
      for (const key of Object.keys(items)) {
        walk(items[key]);
      }
    }
  }

  walk(modelData?.[':items']?.root);
  return { mydealerConfig, dealerSearchConfig };
}

/**
 * Parses a config value that may be a JSON string or an object.
 */
function parseConfig(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string' && raw.startsWith('{')) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Fetches data from the MyDealer BFF (stage image, logo, intro text, next-step CTAs).
 *
 * URL pattern:
 *   ${baseUrl}/bff/shared/live?dealerId=${id}&dealerPath=${id}&dealerType=FULLSTACK
 *     &endpoint=${encodedEndpoint}&env=prod&language=de&oneapiKey=${apiKey}
 *
 * The 'shared/live' path returns the dealer's editorial content including
 * stage images (Scene7 refs), intro module text, and next-step CTA cards.
 * OUT OF SCOPE: dealerType is hardcoded to 'FULLSTACK' and language to 'de'.
 */
async function fetchMyDealerBff(dealerId, config) {
  if (!config?.baseUrl || !config?.apiKey) {
    console.warn('[dealer-fetcher] MyDealer BFF config not found in model.json, skipping');
    return null;
  }

  const encodedEndpoint = encodeURIComponent(SIGNED_ENDPOINT);
  const url = `${config.baseUrl}/bff/shared/live`
    + `?dealerId=${dealerId}`
    + `&dealerPath=${dealerId}`
    + `&dealerType=FULLSTACK`
    + `&endpoint=${encodedEndpoint}`
    + `&env=prod`
    + `&language=de`
    + `&oneapiKey=${config.apiKey}`;

  try {
    console.log(`[dealer-fetcher] Fetching MyDealer BFF for dealer ${dealerId}...`);
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`[dealer-fetcher] MyDealer BFF returned ${resp.status}: ${resp.statusText}`);
      return null;
    }
    return await resp.json();
  } catch (err) {
    console.error('[dealer-fetcher] MyDealer BFF fetch failed:', err.message);
    return null;
  }
}

/**
 * Fetches data from the Dealer Search BFF (address, contact, ratings, reviews, services).
 *
 * Uses a different URL pattern than MyDealer BFF:
 *   ${baseUrl}/bff-detail/dealer?serviceConfigEndpoint=${encodedEndpoint}
 *     &lufthansaApiKey=${apiKey}&query=${encodedQuery}
 *
 * Note the different parameter names: 'serviceConfigEndpoint' (vs 'endpoint')
 * and 'lufthansaApiKey' (vs 'oneapiKey'). The query is a JSON-encoded object
 * with dealerId, countryCode, and language.
 *
 * OUT OF SCOPE: countryCode 'DE' and language 'de' are hardcoded.
 */
async function fetchDealerSearchBff(dealerId, config) {
  if (!config?.baseUrl || !config?.apiKey) {
    console.warn('[dealer-fetcher] Dealer Search BFF config not found in model.json, skipping');
    return null;
  }

  const encodedEndpoint = encodeURIComponent(SIGNED_ENDPOINT);
  const query = JSON.stringify({
    dealerId,
    countryCode: 'DE',
    language: 'de',
  });
  const encodedQuery = encodeURIComponent(query);

  const url = `${config.baseUrl}/bff-detail/dealer`
    + `?serviceConfigEndpoint=${encodedEndpoint}`
    + `&lufthansaApiKey=${config.apiKey}`
    + `&query=${encodedQuery}`;

  try {
    console.log(`[dealer-fetcher] Fetching Dealer Search BFF for dealer ${dealerId}...`);
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`[dealer-fetcher] Dealer Search BFF returned ${resp.status}: ${resp.statusText}`);
      return null;
    }
    return await resp.json();
  } catch (err) {
    console.error('[dealer-fetcher] Dealer Search BFF fetch failed:', err.message);
    return null;
  }
}

/**
 * Fetches teaser content from multiple MyDealer teaser slots in parallel.
 * Each slot (e.g., 'service-highlights', 'vw-modelle') returns promotional
 * content cards with headline, copy, image (Scene7), and CTA.
 *
 * URL: ${baseUrl}/bff/teaser/live?dealerId=${id}&dealerPath=${id}&slot=${slot}&...
 *
 * The slot parameter determines which content category to fetch.
 * Copy text is cleaned of markdown-like annotations (@[...] and [@...]).
 * CTA URLs are cleaned of template placeholders (${...}).
 */
async function fetchDealerTeasers(dealerId, config, slots) {
  if (!config?.baseUrl || !config?.apiKey || !slots?.length) return {};

  const encodedEndpoint = encodeURIComponent(SIGNED_ENDPOINT);
  const results = {};

  const fetches = slots.map(async (slot) => {
    const url = `${config.baseUrl}/bff/teaser/live`
      + `?dealerId=${dealerId}`
      + `&dealerPath=${dealerId}`
      + `&dealerType=FULLSTACK`
      + `&slot=${slot}`
      + `&endpoint=${encodedEndpoint}`
      + `&env=prod`
      + `&language=de`
      + `&oneapiKey=${config.apiKey}`;

    try {
      console.log(`[dealer-fetcher] Fetching teaser slot: ${slot}...`);
      const resp = await fetch(url);
      if (!resp.ok) return;
      const data = await resp.json();
      const items = data?.section?.model?.items || [];
      if (items.length > 0) {
        results[slot] = items.map((item) => {
          let imgSrc = '';
          if (item.image?.scene7Metadata?.scene7Domain && item.image?.scene7Metadata?.scene7File) {
            imgSrc = `${item.image.scene7Metadata.scene7Domain}is/image/${item.image.scene7Metadata.scene7File}`;
          }
          return {
            headline: item.headline || '',
            copy: (item.copy || '').replace(/@\[.*?\]/g, '').replace(/\[@.*?\]/g, '').trim(),
            image: imgSrc,
            imageAlt: item.image?.altText || '',
            ctaLabel: item.cta?.label || '',
            ctaUrl: (item.cta?.url || '').replace(/\$\{[^}]+\}/g, ''),
          };
        });
      }
    } catch (err) {
      console.warn(`[dealer-fetcher] Teaser slot ${slot} fetch failed:`, err.message);
    }
  });

  await Promise.all(fetches);
  return results;
}

/**
 * Builds the structured dealer data object from BFF responses.
 * Handles partial data gracefully — if one BFF failed (returned null),
 * fields from the other sources are still populated. This means a failure
 * in the Dealer Search BFF won't prevent stage images from MyDealer BFF
 * from being included, and vice versa.
 */
function buildDealerResult(dealerId, displayName, legalName, mydealerData, dealerSearchData, teasers = {}) {
  const result = {
    dealerId,
    displayName,
    legalName,

    // From Dealer Search BFF
    address: null,
    contact: null,
    coordinates: null,
    ratings: null,
    reviews: [],
    services: [],
    departments: [],
    departmentContacts: [],

    // From MyDealer BFF
    stageImage: null,
    logo: null,
    introHeadline: null,
    introCopy: null,
    nextSteps: [],

    // From teaser BFF
    teasers: {},
  };

  // --- Dealer Search BFF data ---
  if (dealerSearchData?.dealer) {
    const dealer = dealerSearchData.dealer;

    // Address
    if (dealer.address) {
      result.address = {
        street: dealer.address.street || '',
        postalCode: dealer.address.postalCode || '',
        city: dealer.address.city || '',
        countryCode: dealer.address.countryCode || '',
      };
    }

    // Contact
    if (dealer.contact) {
      result.contact = {
        phone: dealer.contact.phoneNumber || '',
        fax: dealer.contact.faxNumber || '',
        email: dealer.contact.email || '',
        website: dealer.contact.website || '',
      };
    }

    // Coordinates (array of [lat, lng])
    if (Array.isArray(dealer.coordinates) && dealer.coordinates.length >= 2) {
      result.coordinates = {
        lat: dealer.coordinates[0],
        lng: dealer.coordinates[1],
      };
    }

    // Ratings
    if (dealer.ratings) {
      result.ratings = {
        avgRating: dealer.ratings.avgRating,
        totalRatings: dealer.ratings.totalRatings,
        categories: (dealer.ratings.ratingCategories || []).map((cat) => ({
          key: cat.categoryKey,
          label: cat.categoryLabel,
          avgRating: cat.categoryAvgRating,
          totalRatings: cat.categoryTotalRatings,
        })),
      };
    }

    // Reviews -- top 3 comments
    if (Array.isArray(dealer.comments)) {
      result.reviews = dealer.comments.slice(0, 3).map((c) => ({
        id: c.id,
        category: c.categoryKey,
        date: c.date,
        rating: c.rating,
        text: c.text,
      }));
    }

    // Services (filter out untranslated/internal-only entries)
    if (Array.isArray(dealer.services)) {
      result.services = dealer.services
        .filter((s) => {
          const label = (s.translatedService || '').trim();
          if (!label || label.startsWith('#')) return false;
          // Skip entries where the label is the same as the raw key (untranslated)
          if (label === s.service) return false;
          return true;
        })
        .map((s) => ({
          key: s.service,
          label: s.translatedService.trim(),
          icon: s.icon,
        }));
    }

    // Departments with hours (from Dealer Search BFF -- richer structure)
    if (Array.isArray(dealer.departments)) {
      result.departments = dealer.departments.map((dept) => ({
        key: dept.key,
        name: dept.name,
        address: dept.address ? {
          street: dept.address.street || '',
          postalCode: dept.address.postalCode || '',
          city: dept.address.city || '',
        } : null,
        contact: dept.contact ? {
          phone: dept.contact.phoneNumber || '',
          fax: dept.contact.faxNumber || '',
          email: dept.contact.email || '',
        } : null,
        hours: dept.businessHours?.days
          ? dept.businessHours.days.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            label: day.label,
            times: day.times || [],
          }))
          : [],
      }));

      // Department contacts (named persons)
      for (const dept of dealer.departments) {
        if (Array.isArray(dept.departmentContacts)) {
          for (const c of dept.departmentContacts) {
            const name = `${(c.firstname || '').trim()} ${(c.lastname || '').trim()}`.trim();
            if (!name) continue;
            result.departmentContacts.push({
              name,
              department: dept.name || '',
              position: c.position || '',
              email: c.email || '',
              phone: (c.phoneNumber || '').replace(/\s+/g, ' ').trim(),
            });
          }
        }
      }
    }
  }

  // --- MyDealer BFF data ---
  if (mydealerData) {
    const stage = mydealerData.stageSection?.model;

    // Stage image
    if (stage?.stageImage) {
      const img = stage.stageImage;
      if (img.scene7Metadata?.scene7Domain && img.scene7Metadata?.scene7File) {
        result.stageImage = `${img.scene7Metadata.scene7Domain}is/image/${img.scene7Metadata.scene7File}`;
      } else if (img.path) {
        result.stageImage = img.path;
      }
    }

    // Logo
    if (stage?.logo) {
      const logo = stage.logo;
      if (logo.scene7Metadata?.scene7Domain && logo.scene7Metadata?.scene7File) {
        result.logo = `${logo.scene7Metadata.scene7Domain}is/image/${logo.scene7Metadata.scene7File}`;
      } else if (logo.path) {
        result.logo = logo.path;
      }
    }

    // Intro module
    if (stage?.introModule) {
      result.introHeadline = stage.introModule.headline || null;
      result.introCopy = stage.introModule.copy || null;
    }

    // Next steps (CTA cards)
    if (mydealerData.nextStepsModule?.nextSteps) {
      result.nextSteps = mydealerData.nextStepsModule.nextSteps.map((step) => ({
        id: step.id,
        icon: step.icon,
        topline: step.topline,
        headline: step.headline,
        label: step.link?.label || '',
        url: step.link?.url || '',
      }));
    }
  }

  // --- Teaser BFF data ---
  result.teasers = teasers;

  return result;
}
