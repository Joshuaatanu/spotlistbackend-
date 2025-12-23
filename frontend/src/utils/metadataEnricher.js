/**
 * Metadata Enrichment Utility
 * 
 * Enriches raw data with human-readable names from metadata endpoints.
 * Caches metadata to avoid repeated API calls.
 */

import { API_BASE_URL } from '../config';

// In-memory cache for metadata
const metadataCache = {
    channels: null,
    companies: null,
    brands: null,
    products: null,
    dayparts: null,
    epgCategories: null,
    profiles: null,
    lastFetch: null,
    cacheExpiry: 5 * 60 * 1000 // 5 minutes
};

/**
 * Fetch metadata from backend API
 */
async function fetchMetadata(type) {
    // Check cache first
    if (metadataCache[type] && metadataCache.lastFetch) {
        const age = Date.now() - metadataCache.lastFetch;
        if (age < metadataCache.cacheExpiry) {
            return metadataCache[type];
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}/metadata/${type}`);
        if (!response.ok) {
            console.warn(`Failed to fetch ${type} metadata:`, response.statusText);
            return null;
        }
        const data = await response.json();
        metadataCache[type] = data;
        metadataCache.lastFetch = Date.now();
        return data;
    } catch (error) {
        console.error(`Error fetching ${type} metadata:`, error);
        return null;
    }
}

/**
 * Create lookup maps for fast ID -> name resolution
 */
function createLookupMap(metadata, idField = 'value', nameField = 'caption') {
    if (!metadata || !Array.isArray(metadata)) return {};
    const map = {};
    metadata.forEach(item => {
        const id = item[idField];
        const name = item[nameField] || item.name || item.label || String(id);
        if (id !== undefined && id !== null) {
            map[String(id)] = name;
        }
    });
    return map;
}

/**
 * Initialize all metadata caches
 */
export async function initializeMetadata() {
    const types = ['channels', 'companies', 'dayparts', 'epg-categories', 'profiles'];
    await Promise.all(types.map(type => fetchMetadata(type)));
}

/**
 * Enrich a single data item with metadata names
 */
export async function enrichDataItem(item, options = {}) {
    const {
        enrichChannels = true,
        enrichCompanies = true,
        enrichDayparts = true,
        enrichEPGCategories = true,
        enrichProfiles = true
    } = options;

    const enriched = { ...item };

    // Enrich channel IDs
    if (enrichChannels) {
        const channels = await fetchMetadata('channels');
        if (channels) {
            const channelMap = createLookupMap(channels);
            // Try multiple field name variations for channel ID
            const channelId = String(
                item.channel_id || 
                item.channelId || 
                item.Channel_ID ||
                item['Channel ID'] ||
                ''
            );
            
            if (channelId && channelId !== '' && channelMap[channelId]) {
                enriched.channel_name = channelMap[channelId];
                enriched.channel_display = channelMap[channelId];
            } else {
                // Try to match by name if ID not found
                const channelName = item.channel || 
                                   item.Channel || 
                                   item.program_original || 
                                   item.program_norm ||
                                   '';
                
                if (channelName) {
                    const matchingChannel = channels.find(ch => {
                        const chName = ch.caption || ch.name || ch.label || '';
                        return chName.toLowerCase() === String(channelName).toLowerCase();
                    });
                    
                    if (matchingChannel) {
                        enriched.channel_name = matchingChannel.caption || matchingChannel.name;
                        enriched.channel_display = enriched.channel_name;
                    } else {
                        enriched.channel_display = channelName;
                    }
                }
            }
        }
    }

    // Enrich company IDs
    if (enrichCompanies && (item.company_id !== undefined || item.companyId !== undefined)) {
        const companies = await fetchMetadata('companies');
        if (companies) {
            const companyMap = createLookupMap(companies);
            const companyId = String(item.company_id || item.companyId || '');
            if (companyMap[companyId]) {
                enriched.company_name = companyMap[companyId];
                enriched.company_display = companyMap[companyId];
            }
        }
    }

    // Enrich daypart values
    if (enrichDayparts && item.daypart !== undefined) {
        const dayparts = await fetchMetadata('dayparts');
        if (dayparts) {
            // Dayparts might be stored as strings like "6 - 9" or as IDs
            const daypartValue = String(item.daypart);
            // Try to find matching daypart
            const daypart = dayparts.find(d => 
                String(d.value) === daypartValue || 
                String(d.caption) === daypartValue ||
                String(d.name) === daypartValue
            );
            if (daypart) {
                enriched.daypart_name = daypart.caption || daypart.name || daypartValue;
                enriched.daypart_display = enriched.daypart_name;
            }
        }
    }

    // Enrich EPG category IDs
    if (enrichEPGCategories && (item.epg_category_id !== undefined || item.epgCategoryId !== undefined)) {
        const epgCategories = await fetchMetadata('epg-categories');
        if (epgCategories) {
            const epgMap = createLookupMap(epgCategories);
            const epgId = String(item.epg_category_id || item.epgCategoryId || '');
            if (epgMap[epgId]) {
                enriched.epg_category_name = epgMap[epgId];
                enriched.epg_category_display = epgMap[epgId];
            }
        }
    }

    // Enrich profile IDs
    if (enrichProfiles && (item.profile_id !== undefined || item.profileId !== undefined)) {
        const profiles = await fetchMetadata('profiles');
        if (profiles) {
            const profileMap = createLookupMap(profiles);
            const profileId = String(item.profile_id || item.profileId || '');
            if (profileMap[profileId]) {
                enriched.profile_name = profileMap[profileId];
                enriched.profile_display = profileMap[profileId];
            }
        }
    }

    return enriched;
}

/**
 * Enrich an array of data items
 */
export async function enrichDataArray(data, options = {}) {
    if (!data || !Array.isArray(data)) return data;
    
    // Fetch all needed metadata first
    const metadataPromises = [];
    if (options.enrichChannels !== false) metadataPromises.push(fetchMetadata('channels'));
    if (options.enrichCompanies !== false) metadataPromises.push(fetchMetadata('companies'));
    if (options.enrichDayparts !== false) metadataPromises.push(fetchMetadata('dayparts'));
    if (options.enrichEPGCategories !== false) metadataPromises.push(fetchMetadata('epg-categories'));
    if (options.enrichProfiles !== false) metadataPromises.push(fetchMetadata('profiles'));
    
    await Promise.all(metadataPromises);

    // Create lookup maps
    const channels = await fetchMetadata('channels');
    const companies = await fetchMetadata('companies');
    const dayparts = await fetchMetadata('dayparts');
    const epgCategories = await fetchMetadata('epg-categories');
    const profiles = await fetchMetadata('profiles');

    const channelMap = createLookupMap(channels);
    const companyMap = createLookupMap(companies);
    const daypartMap = createLookupMap(dayparts, 'value', 'caption');
    const epgMap = createLookupMap(epgCategories);
    const profileMap = createLookupMap(profiles);

    // Enrich all items
    return data.map(item => {
        const enriched = { ...item };

        // Enrich channels
        if (options.enrichChannels !== false) {
            // Try multiple field name variations
            const channelId = String(
                item.channel_id || 
                item.channelId || 
                item.channel_id || 
                item.Channel_ID ||
                item['Channel ID'] ||
                ''
            );
            
            // Try to find by ID first
            if (channelId && channelId !== '' && channelMap[channelId]) {
                enriched.channel_name = channelMap[channelId];
                enriched.channel_display = channelMap[channelId];
            } else {
                // If no ID found, try to match by name
                const channelName = item.channel || 
                                   item.Channel || 
                                   item.program_original || 
                                   item.program_norm ||
                                   item['Channel'] ||
                                   '';
                
                if (channelName) {
                    // Try to find exact match in channel names
                    const matchingChannel = channels?.find(ch => {
                        const chName = ch.caption || ch.name || ch.label || '';
                        return chName.toLowerCase() === String(channelName).toLowerCase();
                    });
                    
                    if (matchingChannel) {
                        enriched.channel_name = matchingChannel.caption || matchingChannel.name;
                        enriched.channel_display = enriched.channel_name;
                    } else {
                        // If it's already a readable name, use it
                        enriched.channel_display = channelName;
                    }
                } else {
                    // No channel info found
                    enriched.channel_display = 'N/A';
                }
            }
        }

        // Enrich companies
        if (options.enrichCompanies !== false) {
            const companyId = String(item.company_id || item.companyId || item.company || '');
            if (companyMap[companyId]) {
                enriched.company_name = companyMap[companyId];
                enriched.company_display = companyMap[companyId];
            } else if (item.company && !item.company_name) {
                enriched.company_display = item.company;
            }
        }

        // Enrich dayparts
        if (options.enrichDayparts !== false && item.daypart !== undefined) {
            const daypartValue = String(item.daypart);
            // Try multiple lookup strategies
            if (daypartMap[daypartValue]) {
                enriched.daypart_name = daypartMap[daypartValue];
                enriched.daypart_display = enriched.daypart_name;
            } else {
                // Check if it's already a readable name
                const matchingDaypart = dayparts?.find(d => 
                    String(d.value) === daypartValue || 
                    String(d.caption) === daypartValue
                );
                if (matchingDaypart) {
                    enriched.daypart_name = matchingDaypart.caption || matchingDaypart.name;
                    enriched.daypart_display = enriched.daypart_name;
                } else {
                    enriched.daypart_display = daypartValue; // Fallback to original
                }
            }
        }

        // Enrich EPG categories
        if (options.enrichEPGCategories !== false) {
            const epgId = String(item.epg_category_id || item.epgCategoryId || item.epg_category || '');
            if (epgMap[epgId]) {
                enriched.epg_category_name = epgMap[epgId];
                enriched.epg_category_display = epgMap[epgId];
            }
        }

        // Enrich profiles
        if (options.enrichProfiles !== false) {
            const profileId = String(item.profile_id || item.profileId || item.profile || '');
            if (profileMap[profileId]) {
                enriched.profile_name = profileMap[profileId];
                enriched.profile_display = profileMap[profileId];
            }
        }

        return enriched;
    });
}

/**
 * Get display name for a field (uses enriched name if available, falls back to ID)
 */
export function getDisplayName(item, field) {
    const displayField = `${field}_display` || `${field}_name`;
    return item[displayField] || item[field] || 'N/A';
}

/**
 * Clear metadata cache (useful for testing or forced refresh)
 */
export function clearMetadataCache() {
    Object.keys(metadataCache).forEach(key => {
        if (key !== 'cacheExpiry') {
            metadataCache[key] = null;
        }
    });
    metadataCache.lastFetch = null;
}



