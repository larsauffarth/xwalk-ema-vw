/**
 * Dealer data fetcher for VW BFF APIs.
 *
 * Fetches dealer information from two BFF endpoints at import time:
 * - MyDealer BFF: stage image, logo, intro text, CTA next-steps
 * - Dealer Search BFF: address, contact, ratings, reviews, departments, services
 *
 * Both APIs require a signed endpoint config for authentication.
 */

// Hardcoded signed endpoint config.
// NOTE: This signature may need refreshing if the VW backend rotates it.
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
  // 1. Check if this is a dealer page
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

  // 3. Find BFF configs from featureAppSection components in the component tree
  const { mydealerConfig, dealerSearchConfig } = findBffConfigs(modelData);

  // 4. Fetch from all BFFs in parallel, handling errors independently
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
 */
function findBffConfigs(modelData) {
  let mydealerConfig = null;
  let dealerSearchConfig = null;

  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;

    // Check if this node has a featureApp config
    const config = parseConfig(obj.config);
    if (config) {
      if (config.name === 'mydealer_stage' && config.baseUrl) {
        mydealerConfig = {
          baseUrl: config.baseUrl,
          apiKey: config.featureAppApiKey,
        };
      }
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

    // Recurse into :items
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
 * Fetches data from the MyDealer BFF.
 *
 * URL pattern:
 *   ${baseUrl}/bff/shared/live?dealerId=${id}&dealerPath=${id}&dealerType=FULLSTACK
 *     &endpoint=${encodedEndpoint}&env=prod&language=de&oneapiKey=${apiKey}
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
 * Fetches data from the Dealer Search BFF.
 *
 * URL pattern:
 *   ${baseUrl}/bff-detail/dealer?serviceConfigEndpoint=${encodedEndpoint}
 *     &lufthansaApiKey=${apiKey}&query=${encodedQuery}
 *
 * Query: {"dealerId":"${id}","countryCode":"DE","language":"de"}
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
 * URL: ${baseUrl}/bff/teaser/live?dealerId=${id}&dealerPath=${id}&slot=${slot}&...
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
 * Handles partial data gracefully -- if one BFF failed, fields from
 * the other are still populated.
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
