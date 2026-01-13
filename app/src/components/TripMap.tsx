import { useState, useEffect, useMemo } from 'react'
import { Map, Marker, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { Polyline } from './map/Polyline'
import { City, Route, Place, Day } from '../types'

interface TripMapProps {
  cities: City[]
  routes: Route[]
  places: Place[]
  selectedCity: string | null
  highlightedPlace: string | null
  selectedDay: number | null
  onCitySelect: (cityId: string | null) => void
  onPlaceSelect: (placeId: string | null) => void
  days: Day[]
}

// Exchange rate: ¥192 = £1
const YEN_TO_GBP = 0.0052

// Convert yen price range to include GBP
const convertPriceRange = (priceRange: string): string => {
  const match = priceRange.match(/¥([\d,]+)(?:-([\d,]+))?/)
  if (!match) return priceRange

  const low = parseInt(match[1].replace(',', ''))
  const high = match[2] ? parseInt(match[2].replace(',', '')) : null

  const lowGbp = Math.round(low * YEN_TO_GBP)
  const highGbp = high ? Math.round(high * YEN_TO_GBP) : null

  if (highGbp) {
    return `${priceRange} (£${lowGbp}-${highGbp})`
  }
  return `${priceRange} (~£${lowGbp})`
}

// Generate Google Maps URL from coordinates
const getGoogleMapsUrl = (lat: number, lng: number, name: string) => {
  const query = encodeURIComponent(name)
  return `https://www.google.com/maps/search/?api=1&query=${query}&query=${lat},${lng}`
}

const categoryColors: Record<string, string> = {
  coffee: '#f59e0b',
  restaurant: '#f97316',
  nature: '#22c55e',
  activity: '#3b82f6',
}

// Custom marker SVGs as data URLs
const createCityMarkerIcon = (isSelected: boolean) => {
  const color = isSelected ? '#dc2626' : '#1f2937'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2"/>
    <path d="M16 8a6 6 0 0 0-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 0 0-6-6zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" fill="white"/>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const createPlaceMarkerIcon = (category: string, isHighlighted: boolean) => {
  const color = categoryColors[category] || '#6b7280'
  const size = isHighlighted ? 28 : 20
  const strokeWidth = isHighlighted ? 3 : 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - strokeWidth}" fill="${color}" stroke="white" stroke-width="${strokeWidth}"/>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// Map Legend component
function MapLegend() {
  const categories = [
    { color: '#1f2937', label: 'City' },
    { color: '#f59e0b', label: 'Coffee' },
    { color: '#f97316', label: 'Food' },
    { color: '#22c55e', label: 'Nature' },
    { color: '#3b82f6', label: 'Activity' },
  ]

  return (
    <div className="absolute bottom-6 left-4 z-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Legend</p>
      <div className="space-y-2.5">
        {categories.map(cat => (
          <div key={cat.label} className="flex items-center gap-3">
            <div
              className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: cat.color }}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{cat.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-3 pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="w-5 h-5 rounded-full bg-japan-red border-2 border-white shadow-sm flex items-center justify-center">
            <span className="text-[9px] text-white font-bold">1</span>
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300">Route #</span>
        </div>
      </div>
    </div>
  )
}

const defaultCenter = { lat: 36.5, lng: 137.5 }

// Info window type
type InfoWindowData =
  | { type: 'city'; city: City }
  | { type: 'place'; place: Place }
  | { type: 'route'; route: { index: number; method: string; duration?: string }; position: google.maps.LatLngLiteral }
  | null

// Inner component that uses useMap hook
function TripMapInner({
  cities,
  routes,
  places,
  selectedCity,
  highlightedPlace,
  selectedDay,
  onCitySelect,
  onPlaceSelect,
  days,
}: TripMapProps) {
  const [infoWindow, setInfoWindow] = useState<InfoWindowData>(null)
  const map = useMap()

  // Get place IDs for the selected day
  const dayPlaceIds = useMemo(() => {
    if (!selectedDay) return new Set<string>()
    const day = days.find(d => d.day === selectedDay)
    if (!day) return new Set<string>()
    const ids = day.activities
      .map(a => a.placeId)
      .filter((id): id is string => !!id)
    return new Set(ids)
  }, [selectedDay, days])

  // Pan to city when selected
  useEffect(() => {
    if (map && selectedCity && !highlightedPlace) {
      const city = cities.find(c => c.id === selectedCity)
      if (city) {
        map.panTo({ lat: city.coordinates[0], lng: city.coordinates[1] })
        map.setZoom(12)
      }
    } else if (map && !selectedCity && !highlightedPlace) {
      map.panTo(defaultCenter)
      map.setZoom(6)
    }
  }, [map, selectedCity, cities, highlightedPlace])

  // Pan and zoom to highlighted place
  useEffect(() => {
    if (map && highlightedPlace) {
      const place = places.find(p => p.id === highlightedPlace)
      if (place) {
        map.panTo({ lat: place.coordinates[0], lng: place.coordinates[1] })
        map.setZoom(15)
        // Open info window for the place
        setInfoWindow({ type: 'place', place })
      }
    }
  }, [map, highlightedPlace, places])

  // Zoom to fit all places for selected day (but not if a specific place is highlighted)
  useEffect(() => {
    if (map && selectedDay && dayPlaceIds.size > 0 && !highlightedPlace) {
      const dayPlaces = places.filter(p => dayPlaceIds.has(p.id))
      if (dayPlaces.length > 0) {
        const bounds = new google.maps.LatLngBounds()
        dayPlaces.forEach(place => {
          bounds.extend({ lat: place.coordinates[0], lng: place.coordinates[1] })
        })
        map.fitBounds(bounds, 80)
        setInfoWindow(null) // Clear any open info window
      }
    }
  }, [map, selectedDay, dayPlaceIds, places, highlightedPlace])

  // Create route data
  const routeData = useMemo(() => routes.map((route, index) => {
    const fromCity = cities.find(c => c.id === route.from)
    const toCity = cities.find(c => c.id === route.to)
    if (fromCity && toCity) {
      const midpoint = {
        lat: (fromCity.coordinates[0] + toCity.coordinates[0]) / 2,
        lng: (fromCity.coordinates[1] + toCity.coordinates[1]) / 2,
      }
      return {
        path: [
          { lat: fromCity.coordinates[0], lng: fromCity.coordinates[1] },
          { lat: toCity.coordinates[0], lng: toCity.coordinates[1] },
        ],
        midpoint,
        index: index + 1,
        method: route.method,
        duration: route.duration,
      }
    }
    return null
  }).filter(Boolean) as { path: google.maps.LatLngLiteral[]; midpoint: google.maps.LatLngLiteral; index: number; method: string; duration?: string }[], [routes, cities])

  // Get InfoWindow position
  const getInfoWindowPosition = (): { lat: number; lng: number } | undefined => {
    if (!infoWindow) return undefined
    if (infoWindow.type === 'city') {
      return { lat: infoWindow.city.coordinates[0], lng: infoWindow.city.coordinates[1] }
    }
    if (infoWindow.type === 'place') {
      return { lat: infoWindow.place.coordinates[0], lng: infoWindow.place.coordinates[1] }
    }
    if (infoWindow.type === 'route') {
      return infoWindow.position
    }
    return undefined
  }

  return (
    <>
      {/* Route polylines */}
      {routeData.map((route, i) => (
        <Polyline
          key={`route-line-${i}`}
          path={route.path}
          strokeColor="#dc2626"
          strokeOpacity={1}
          strokeWeight={3}
          icons={[{
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 3,
              strokeColor: '#dc2626',
              strokeWeight: 2,
              fillColor: '#dc2626',
              fillOpacity: 1,
            },
            offset: '50%',
          }]}
        />
      ))}

      {/* City markers */}
      {cities.map(city => (
        <Marker
          key={city.id}
          position={{ lat: city.coordinates[0], lng: city.coordinates[1] }}
          icon={{
            url: createCityMarkerIcon(selectedCity === city.id),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 32),
          }}
          onClick={() => {
            onCitySelect(city.id === selectedCity ? null : city.id)
            setInfoWindow({ type: 'city', city })
          }}
        />
      ))}

      {/* Place markers */}
      {places.map(place => (
        <Marker
          key={place.id}
          position={{ lat: place.coordinates[0], lng: place.coordinates[1] }}
          icon={(() => {
            const isHighlighted = highlightedPlace === place.id || dayPlaceIds.has(place.id)
            return {
              url: createPlaceMarkerIcon(place.category, isHighlighted),
              scaledSize: new google.maps.Size(
                isHighlighted ? 28 : 20,
                isHighlighted ? 28 : 20
              ),
              anchor: new google.maps.Point(
                isHighlighted ? 14 : 10,
                isHighlighted ? 28 : 20
              ),
            }
          })()}
          onClick={() => {
            onPlaceSelect(place.id === highlightedPlace ? null : place.id)
            setInfoWindow({ type: 'place', place })
          }}
        />
      ))}

      {/* Single InfoWindow */}
      {infoWindow && (
        <InfoWindow
          position={getInfoWindowPosition()}
          onClose={() => setInfoWindow(null)}
          pixelOffset={[0, -32]}
        >
          <>
            {infoWindow.type === 'route' && (
              <div style={{ padding: '4px', textAlign: 'center' }}>
                <p style={{ fontWeight: 'bold', margin: 0, fontSize: '12px' }}>Route {infoWindow.route.index}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#6b7280' }}>
                  {infoWindow.route.method}
                  {infoWindow.route.duration && ` · ${infoWindow.route.duration}`}
                </p>
              </div>
            )}

            {infoWindow.type === 'city' && (
              <div style={{ minWidth: '280px', maxWidth: '340px', padding: '8px 4px 4px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '20px', margin: 0, paddingRight: '28px', lineHeight: 1.2 }}>{infoWindow.city.name}</h3>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: '6px 0 0' }}>{infoWindow.city.nameJa}</p>
                <p style={{ fontSize: '15px', margin: '12px 0', color: '#374151', lineHeight: 1.5 }}>{infoWindow.city.description}</p>
                {infoWindow.city.nights > 0 && (
                  <p style={{ fontSize: '16px', color: '#dc2626', fontWeight: 600, margin: '12px 0' }}>
                    {infoWindow.city.nights} nights
                  </p>
                )}
                <a
                  href={getGoogleMapsUrl(infoWindow.city.coordinates[0], infoWindow.city.coordinates[1], infoWindow.city.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    background: '#dc2626',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    marginTop: '8px',
                  }}
                >
                  Open in Google Maps ↗
                </a>
              </div>
            )}

            {infoWindow.type === 'place' && (
              <div style={{ minWidth: '280px', maxWidth: '340px', padding: '8px 4px 4px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '18px', margin: 0, paddingRight: '28px', lineHeight: 1.2 }}>{infoWindow.place.name}</h3>
                <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0 0' }}>{infoWindow.place.nameJa}</p>
                <p style={{ fontSize: '15px', margin: '12px 0', color: '#374151', lineHeight: 1.5 }}>{infoWindow.place.description}</p>
                {infoWindow.place.rating && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ color: '#f59e0b', fontSize: '16px' }}>{'★'.repeat(Math.round(infoWindow.place.rating))}</span>
                    <span style={{ fontWeight: 600, fontSize: '16px' }}>{infoWindow.place.rating}</span>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                      ({infoWindow.place.userRatingsTotal?.toLocaleString()})
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                  <span style={{ background: '#f3f4f6', padding: '4px 10px', borderRadius: '6px', fontWeight: 500 }}>
                    {infoWindow.place.category}
                  </span>
                  <span style={{ padding: '4px 0' }}>{convertPriceRange(infoWindow.place.priceRange)}</span>
                </div>
                {infoWindow.place.shellfish && (
                  <p style={{ fontSize: '13px', color: '#ef4444', margin: '12px 0' }}>
                    ⚠️ {infoWindow.place.shellfishNote || 'Contains shellfish'}
                  </p>
                )}
                <a
                  href={getGoogleMapsUrl(infoWindow.place.coordinates[0], infoWindow.place.coordinates[1], infoWindow.place.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    background: '#dc2626',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    marginTop: '4px',
                  }}
                >
                  Open in Google Maps ↗
                </a>
              </div>
            )}
          </>
        </InfoWindow>
      )}
    </>
  )
}

// Map styles for a cleaner look
const mapStyles = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'simplified' }]
  }
]

export function TripMap(props: TripMapProps) {
  return (
    <div className="relative h-full w-full">
      <Map
        style={{ width: '100%', height: '100%' }}
        defaultCenter={defaultCenter}
        defaultZoom={6}
        gestureHandling="greedy"
        disableDefaultUI={false}
        zoomControl={true}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
        styles={mapStyles}
        onClick={() => {
          // Close info window when clicking map background
        }}
      >
        <TripMapInner {...props} />
      </Map>
      <MapLegend />
    </div>
  )
}
