import { useState, useEffect } from 'react';
import { Filter, Clock, Tv, Users, Calendar } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function EnhancedFilters({ 
  filters, 
  setFilters,
  showAdvanced = false 
}) {
  const [expanded, setExpanded] = useState(showAdvanced);
  const [metadata, setMetadata] = useState({
    dayparts: [],
    epgCategories: [],
    profiles: [],
    loading: false
  });

  // Fetch metadata when component mounts or when expanded
  useEffect(() => {
    if (expanded && metadata.dayparts.length === 0 && !metadata.loading) {
      fetchMetadata();
    }
  }, [expanded]);

  const fetchMetadata = async () => {
    setMetadata(prev => ({ ...prev, loading: true }));
    try {
      // Note: These endpoints need to be added to the backend
      // For now, we'll use placeholder data structure
      const [daypartsRes, epgRes, profilesRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/metadata/dayparts`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/metadata/epg-categories`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/metadata/profiles`).catch(() => ({ data: [] }))
      ]);

      setMetadata({
        dayparts: daypartsRes.status === 'fulfilled' ? (daypartsRes.value.data || []) : [],
        epgCategories: epgRes.status === 'fulfilled' ? (epgRes.value.data || []) : [],
        profiles: profilesRes.status === 'fulfilled' ? (profilesRes.value.data || []) : [],
        loading: false
      });
    } catch (error) {
      console.error('Error fetching metadata:', error);
      setMetadata(prev => ({ ...prev, loading: false }));
    }
  };

  const weekdays = [
    { id: 0, name: 'Monday', short: 'Mon' },
    { id: 1, name: 'Tuesday', short: 'Tue' },
    { id: 2, name: 'Wednesday', short: 'Wed' },
    { id: 3, name: 'Thursday', short: 'Thu' },
    { id: 4, name: 'Friday', short: 'Fri' },
    { id: 5, name: 'Saturday', short: 'Sat' },
    { id: 6, name: 'Sunday', short: 'Sun' }
  ];

  const toggleWeekday = (dayId) => {
    setFilters(prev => {
      const weekdays = prev.weekdays || [];
      if (weekdays.includes(dayId)) {
        return { ...prev, weekdays: weekdays.filter(d => d !== dayId) };
      } else {
        return { ...prev, weekdays: [...weekdays, dayId] };
      }
    });
  };

  const toggleDaypart = (daypartId) => {
    setFilters(prev => {
      const dayparts = prev.dayparts || [];
      if (dayparts.includes(daypartId)) {
        return { ...prev, dayparts: dayparts.filter(d => d !== daypartId) };
      } else {
        return { ...prev, dayparts: [...dayparts, daypartId] };
      }
    });
  };

  const toggleEPGCategory = (categoryId) => {
    setFilters(prev => {
      const epgCategories = prev.epgCategories || [];
      if (epgCategories.includes(categoryId)) {
        return { ...prev, epgCategories: epgCategories.filter(c => c !== categoryId) };
      } else {
        return { ...prev, epgCategories: [...epgCategories, categoryId] };
      }
    });
  };

  const toggleProfile = (profileId) => {
    setFilters(prev => {
      const profiles = prev.profiles || [];
      if (profiles.includes(profileId)) {
        return { ...prev, profiles: profiles.filter(p => p !== profileId) };
      } else {
        return { ...prev, profiles: [...profiles, profileId] };
      }
    });
  };

  const hasActiveFilters = 
    (filters.weekdays && filters.weekdays.length > 0) ||
    (filters.dayparts && filters.dayparts.length > 0) ||
    (filters.epgCategories && filters.epgCategories.length > 0) ||
    (filters.profiles && filters.profiles.length > 0);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: 'var(--space-s) var(--space-m)',
          border: hasActiveFilters ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
          borderRadius: '8px',
          backgroundColor: hasActiveFilters ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 500,
          marginBottom: expanded ? 'var(--space-m)' : 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }}>
          <Filter size={16} />
          <span>Advanced Filters</span>
          {hasActiveFilters && (
            <span style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'white',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600
            }}>
              {[
                filters.weekdays?.length || 0,
                filters.dayparts?.length || 0,
                filters.epgCategories?.length || 0,
                filters.profiles?.length || 0
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </div>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{
          padding: 'var(--space-m)',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-l)'
        }}>
          {/* Weekdays */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-s)',
              marginBottom: 'var(--space-s)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--text-primary)'
            }}>
              <Calendar size={16} />
              Weekdays
            </label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--space-xs)'
            }}>
              {weekdays.map(day => {
                const isSelected = filters.weekdays?.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleWeekday(day.id)}
                    style={{
                      padding: 'var(--space-xs) var(--space-s)',
                      border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      borderRadius: '6px',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-primary)',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: isSelected ? 600 : 400,
                      transition: 'all 0.2s'
                    }}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dayparts */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-s)',
              marginBottom: 'var(--space-s)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--text-primary)'
            }}>
              <Clock size={16} />
              Dayparts {metadata.loading && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>(Loading...)</span>}
            </label>
            {metadata.dayparts.length > 0 ? (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-xs)',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                {metadata.dayparts.map(daypart => {
                  const isSelected = filters.dayparts?.includes(daypart.value || daypart.id);
                  return (
                    <button
                      key={daypart.value || daypart.id}
                      type="button"
                      onClick={() => toggleDaypart(daypart.value || daypart.id)}
                      style={{
                        padding: 'var(--space-xs) var(--space-s)',
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: '6px',
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-primary)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: isSelected ? 600 : 400
                      }}
                    >
                      {daypart.caption || daypart.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                No dayparts available (endpoint may not be supported)
              </p>
            )}
          </div>

          {/* EPG Categories */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-s)',
              marginBottom: 'var(--space-s)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--text-primary)'
            }}>
              <Tv size={16} />
              EPG Categories {metadata.loading && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>(Loading...)</span>}
            </label>
            {metadata.epgCategories.length > 0 ? (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-xs)',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                {metadata.epgCategories.map(category => {
                  const isSelected = filters.epgCategories?.includes(category.value || category.id);
                  return (
                    <button
                      key={category.value || category.id}
                      type="button"
                      onClick={() => toggleEPGCategory(category.value || category.id)}
                      style={{
                        padding: 'var(--space-xs) var(--space-s)',
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: '6px',
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-primary)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: isSelected ? 600 : 400
                      }}
                    >
                      {category.caption || category.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                No EPG categories available (endpoint may not be supported)
              </p>
            )}
          </div>

          {/* Profiles */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-s)',
              marginBottom: 'var(--space-s)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--text-primary)'
            }}>
              <Users size={16} />
              Audience Profiles {metadata.loading && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>(Loading...)</span>}
            </label>
            {metadata.profiles.length > 0 ? (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-xs)',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                {metadata.profiles.map(profile => {
                  const isSelected = filters.profiles?.includes(profile.value || profile.id);
                  return (
                    <button
                      key={profile.value || profile.id}
                      type="button"
                      onClick={() => toggleProfile(profile.value || profile.id)}
                      style={{
                        padding: 'var(--space-xs) var(--space-s)',
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: '6px',
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-primary)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: isSelected ? 600 : 400
                      }}
                    >
                      {profile.caption || profile.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                No profiles available (endpoint may not be supported)
              </p>
            )}
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setFilters({
                ...filters,
                weekdays: [],
                dayparts: [],
                epgCategories: [],
                profiles: []
              })}
              style={{
                padding: 'var(--space-s)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}


