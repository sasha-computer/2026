import { City, Place } from '../types'
import { Coffee, Utensils, TreePine, Landmark, Star, AlertTriangle, Clock, MapPin, ExternalLink } from 'lucide-react'

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

interface PlacesListProps {
  places: Place[]
  cities: City[]
  selectedCity: string | null
  highlightedPlace: string | null
  onPlaceSelect: (placeId: string | null) => void
}

// Generate Google Maps URL from coordinates
const getGoogleMapsUrl = (lat: number, lng: number, name: string) => {
  const query = encodeURIComponent(name)
  return `https://www.google.com/maps/search/?api=1&query=${query}&query=${lat},${lng}`
}

const categoryIcons: Record<string, React.ReactNode> = {
  coffee: <Coffee size={20} className="text-amber-500" />,
  restaurant: <Utensils size={20} className="text-orange-500" />,
  nature: <TreePine size={20} className="text-green-500" />,
  activity: <Landmark size={20} className="text-blue-500" />,
}

const categoryColors: Record<string, string> = {
  coffee: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  restaurant: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  nature: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  activity: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}

export function PlacesList({
  places,
  cities,
  selectedCity,
}: PlacesListProps) {
  // Group places by city
  const placesByCity = places.reduce((acc, place) => {
    if (!acc[place.city]) {
      acc[place.city] = []
    }
    acc[place.city].push(place)
    return acc
  }, {} as Record<string, Place[]>)

  // Sort places within each city - highlights first
  Object.keys(placesByCity).forEach(city => {
    placesByCity[city].sort((a, b) => {
      if (a.highlight && !b.highlight) return -1
      if (!a.highlight && b.highlight) return 1
      return 0
    })
  })

  const cityOrder = ['tokyo', 'kanazawa', 'takayama', 'kyoto', 'uji', 'hiroshima', 'miyajima']

  return (
    <div className="p-6">
      <div className="space-y-8">
        {cityOrder.map(cityId => {
          const cityPlaces = placesByCity[cityId]
          if (!cityPlaces || cityPlaces.length === 0) return null

          const city = cities.find(c => c.id === cityId)

          return (
            <div key={cityId} className="animate-fade-in">
              {/* City Header */}
              {!selectedCity && (
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <MapPin size={22} className="text-japan-red" />
                  {city?.name || cityId}
                  <span className="text-base font-normal text-gray-500">
                    ({cityPlaces.length} places)
                  </span>
                </h2>
              )}

              {/* Places Grid */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {cityPlaces.map(place => (
                  <div
                    key={place.id}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                            {place.name}
                          </h3>
                          {place.highlight && (
                            <Star size={18} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-400 truncate">{place.nameJa}</p>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${categoryColors[place.category]}`}>
                        {place.subcategory}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-base text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                      {place.description}
                    </p>

                    {/* Google Rating */}
                    {place.rating && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              className={
                                star <= Math.round(place.rating!)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-gray-300 dark:text-gray-600'
                              }
                            />
                          ))}
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {place.rating}
                        </span>
                        <span className="text-sm text-gray-400">
                          ({place.userRatingsTotal?.toLocaleString()} reviews)
                        </span>
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-4">
                        <span className="font-semibold">{convertPriceRange(place.priceRange)}</span>
                        {place.hours && (
                          <span className="flex items-center gap-1.5">
                            <Clock size={14} />
                            {place.hours}
                          </span>
                        )}
                      </div>
                      {categoryIcons[place.category]}
                    </div>

                    {/* Closed Days */}
                    {place.closedDays && place.closedDays.length > 0 && (
                      <p className="text-sm text-gray-400 mb-2">
                        Closed: {place.closedDays.join(', ')}
                      </p>
                    )}

                    {/* Shellfish Warning */}
                    {place.shellfish && (
                      <div className="mb-3 flex items-center gap-2 text-sm text-red-500">
                        <AlertTriangle size={16} />
                        <span>{place.shellfishNote || 'Contains shellfish'}</span>
                      </div>
                    )}

                    {/* Neighbourhood & Maps Link */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-sm text-gray-400">
                        {place.neighbourhood}
                      </p>
                      <a
                        href={getGoogleMapsUrl(place.coordinates[0], place.coordinates[1], place.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-japan-red text-white text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        <ExternalLink size={14} />
                        Maps
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {places.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Coffee size={56} className="mx-auto mb-5 opacity-50" />
          <p className="text-lg">No places match your filters</p>
        </div>
      )}
    </div>
  )
}
