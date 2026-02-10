import { useState, useEffect, useCallback } from 'react'
import { Day, City, Place } from '../types'
import { usePlacePhotos, preloadPlacePhotos } from '../hooks/usePlacePhotos'
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Train,
  MapPin,
  Coffee,
  Utensils,
  TreePine,
  Landmark,
  Camera,
  AlertTriangle,
  ExternalLink,
  Clock,
  Star,
  X,
  ZoomIn,
  ImageOff
} from 'lucide-react'

interface TimelineProps {
  days: Day[]
  cities: City[]
  places: Place[]
  selectedCity: string | null
  selectedDay: number | null
  onDaySelect: (day: number | null) => void
  onPlaceSelect: (placeId: string | null) => void
  selectedPlace: string | null
}

const activityIcons: Record<string, React.ReactNode> = {
  coffee: <Coffee size={14} />,
  food: <Utensils size={14} />,
  restaurant: <Utensils size={14} />,
  walk: <MapPin size={14} />,
  temple: <Landmark size={14} />,
  garden: <TreePine size={14} />,
  nature: <TreePine size={14} />,
  museum: <Camera size={14} />,
  market: <Utensils size={14} />,
  sake: <Coffee size={14} />,
  shopping: <MapPin size={14} />,
  travel: <Train size={14} />,
  arrival: <MapPin size={14} />,
  departure: <Train size={14} />,
  prep: <MapPin size={14} />,
  activity: <Camera size={14} />,
}

// Generate Google Maps URL from coordinates
const getGoogleMapsUrl = (lat: number, lng: number, name: string) => {
  const query = encodeURIComponent(name)
  return `https://www.google.com/maps/search/?api=1&query=${query}&query=${lat},${lng}`
}

// Gallery/Lightbox component
function PhotoGallery({
  photos,
  placeName,
  initialIndex = 0,
  onClose
}: {
  photos: string[]
  placeName: string
  initialIndex?: number
  onClose: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const goNext = useCallback(() => {
    setCurrentIndex(i => (i + 1) % photos.length)
  }, [photos.length])

  const goPrev = useCallback(() => {
    setCurrentIndex(i => (i - 1 + photos.length) % photos.length)
  }, [photos.length])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, goNext, goPrev])

  // Prevent body scroll when gallery is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <div>
          <h3 className="font-semibold text-lg">{placeName}</h3>
          <p className="text-sm text-white/60">
            {currentIndex + 1} / {photos.length}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main image */}
      <div
        className="flex-1 flex items-center justify-center px-4 pb-4"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={photos[currentIndex].replace('w=600', 'w=1200').replace('w=800', 'w=1200')}
          alt={`${placeName} ${currentIndex + 1}`}
          className="max-h-full max-w-full object-contain rounded-lg"
        />
      </div>

      {/* Navigation arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); goPrev() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); goNext() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div
          className="flex justify-center gap-2 p-4 bg-black/50"
          onClick={e => e.stopPropagation()}
        >
          {photos.map((photo, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                i === currentIndex
                  ? 'border-white opacity-100'
                  : 'border-transparent opacity-50 hover:opacity-75'
              }`}
            >
              <img
                src={photo}
                alt={`Thumbnail ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Place card component with photos from Google Places API
function PlaceCard({
  place,
  onSelect,
  isSelected
}: {
  place: Place
  onSelect: (id: string | null) => void
  isSelected: boolean
}) {
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const { photos, loading } = usePlacePhotos(place.googlePlaceId)
  const mapsUrl = getGoogleMapsUrl(place.coordinates[0], place.coordinates[1], place.name)

  const openGallery = (index: number) => {
    if (photos.length > 0) {
      setGalleryIndex(index)
      setGalleryOpen(true)
    }
  }

  const hasPhotos = photos.length > 0

  return (
    <>
      {/* Gallery Modal */}
      {galleryOpen && hasPhotos && (
        <PhotoGallery
          photos={photos}
          placeName={place.name}
          initialIndex={galleryIndex}
          onClose={() => setGalleryOpen(false)}
        />
      )}

      <div
        className={`bg-white dark:bg-gray-800 rounded-lg border-2 overflow-hidden transition-all cursor-pointer ${
          isSelected
            ? 'border-japan-red shadow-lg ring-2 ring-japan-red/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-japan-red/50 dark:hover:border-japan-red/60 hover:shadow-lg hover:ring-4 hover:ring-japan-red/20 dark:hover:ring-japan-red/30'
        }`}
        onClick={() => onSelect(isSelected ? null : place.id)}
      >
        {/* Photo Grid - Clickable (only if photos available) */}
        {loading ? (
          <div className="h-32 bg-gray-100 dark:bg-gray-700 animate-pulse flex items-center justify-center">
            <span className="text-gray-400 text-sm">Loading...</span>
          </div>
        ) : hasPhotos ? (
          <div className="relative group cursor-pointer" onClick={(e) => { e.stopPropagation(); openGallery(0) }}>
            {photos.length === 1 ? (
              <img
                src={photos[0]}
                alt={place.name}
                className="w-full h-32 object-cover"
                loading="lazy"
              />
            ) : (
              <div className="grid grid-cols-2 gap-0.5">
                {photos.slice(0, 4).map((photo, i) => (
                  <img
                    key={i}
                    src={photo}
                    alt={`${place.name} ${i + 1}`}
                    className={`w-full h-16 object-cover ${photos.length === 3 && i === 0 ? 'col-span-2' : ''}`}
                    loading="lazy"
                    onClick={(e) => { e.stopPropagation(); openGallery(i) }}
                  />
                ))}
              </div>
            )}

            {/* Hover overlay with zoom icon */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-2 rounded-full">
                <ZoomIn size={20} className="text-white" />
              </div>
            </div>

            {/* Photo count badge */}
            {photos.length > 1 && (
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium bg-black/60 text-white">
                {photos.length} photos
              </span>
            )}

            {/* Category badge */}
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium bg-black/60 text-white">
              {place.subcategory}
            </span>

            {/* Highlight badge */}
            {place.highlight && (
              <span className="absolute top-2 right-2">
                <Star size={16} className="text-amber-400 fill-amber-400 drop-shadow" />
              </span>
            )}
          </div>
        ) : (
          // No photos placeholder
          <div className="h-24 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center relative">
            <ImageOff size={24} className="text-gray-300 dark:text-gray-600" />
            {/* Category badge */}
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
              {place.subcategory}
            </span>
            {/* Highlight badge */}
            {place.highlight && (
              <span className="absolute top-2 right-2">
                <Star size={16} className="text-amber-400 fill-amber-400 drop-shadow" />
              </span>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-semibold text-gray-900 dark:text-white truncate">{place.name}</h4>
              <p className="text-xs text-gray-400">{place.nameJa}</p>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Open in Google Maps"
            >
              <ExternalLink size={14} className="text-gray-500" />
            </a>
          </div>

          {/* Rating from Google */}
          {place.rating && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{place.rating}</span>
              {place.userRatingsTotal && (
                <span className="text-xs text-gray-400">({place.userRatingsTotal.toLocaleString()})</span>
              )}
            </div>
          )}

          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
            {place.description}
          </p>

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="font-medium">{place.priceRange}</span>
            {place.hours && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {place.hours}
              </span>
            )}
          </div>

          {place.shellfish && (
            <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
              <AlertTriangle size={12} />
              <span>{place.shellfishNote || 'Contains shellfish'}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export function Timeline({
  days,
  cities,
  places,
  selectedCity,
  selectedDay,
  onDaySelect,
  onPlaceSelect,
  selectedPlace,
}: TimelineProps) {
  // Start with all days expanded
  const [expandedDays, setExpandedDays] = useState<Set<number>>(() => new Set(days.map(d => d.day)))

  const filteredDays = selectedCity
    ? days.filter(day => day.city === selectedCity)
    : days

  const toggleDay = (dayNum: number) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(dayNum)) {
      newExpanded.delete(dayNum)
    } else {
      newExpanded.add(dayNum)
    }
    setExpandedDays(newExpanded)
  }

  const getCityName = (cityId: string) => {
    const city = cities.find(c => c.id === cityId)
    return city?.name || cityId
  }

  const getPlace = (placeId: string | undefined) => {
    if (!placeId) return null
    return places.find(p => p.id === placeId)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Get all places for a day
  const getDayPlaces = (day: Day): Place[] => {
    const placeIds = day.activities
      .map(a => a.placeId)
      .filter((id): id is string => !!id)
    return placeIds.map(id => places.find(p => p.id === id)).filter((p): p is Place => !!p)
  }

  // Preload photos when a day is expanded
  useEffect(() => {
    expandedDays.forEach(dayNum => {
      const day = days.find(d => d.day === dayNum)
      if (day) {
        const dayPlaces = getDayPlaces(day)
        preloadPlacePhotos(dayPlaces.map(p => p.googlePlaceId))
      }
    })
  }, [expandedDays, days, places])

  return (
    <div className="p-4 pb-20">
      <div className="space-y-3">
        {filteredDays.map(day => {
          const isExpanded = expandedDays.has(day.day)
          const dayPlaces = getDayPlaces(day)

          return (
            <div
              key={day.day}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in"
            >
              {/* Day Header - Clean, no hero image */}
              <button
                onClick={() => {
                  toggleDay(day.day)
                  // Toggle day selection for map highlighting
                  onDaySelect(selectedDay === day.day ? null : day.day)
                  // Clear place selection when selecting a day
                  onPlaceSelect(null)
                }}
                className={`w-full text-left p-4 transition-colors ${
                  selectedDay === day.day
                    ? 'bg-japan-red/5 dark:bg-japan-red/10'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Day number badge */}
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Day</span>
                      <div className={`w-10 h-10 rounded-full bg-japan-red text-white flex items-center justify-center font-bold text-lg transition-all ${
                        selectedDay === day.day ? 'ring-4 ring-japan-red/30 scale-110' : ''
                      }`}>
                        {day.day}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {day.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(day.date)} · {getCityName(day.city)}
                        {dayPlaces.length > 0 && (
                          <span className="ml-2 text-gray-400">· {dayPlaces.length} places</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {isExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  {/* Summary */}
                  <div className="px-4 pt-4">
                    <p className="text-gray-600 dark:text-gray-300">
                      {day.summary}
                    </p>
                  </div>

                  {/* Travel Info */}
                  {day.travelInfo && (
                    <div className="mx-4 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                        <Train size={18} />
                        <span className="font-semibold">
                          {day.travelInfo.from} → {day.travelInfo.to}
                        </span>
                      </div>
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 ml-6">
                        {day.travelInfo.method}
                        {day.travelInfo.duration && ` · ${day.travelInfo.duration}`}
                        {day.travelInfo.jrPass && ' · JR Pass ✓'}
                        {day.travelInfo.cost && ` · ${day.travelInfo.cost}`}
                      </p>
                    </div>
                  )}

                  {/* Places Grid with Photos */}
                  {dayPlaces.length > 0 && (
                    <div className="px-4 py-4">
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                        Places to Visit
                      </h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {dayPlaces.map(place => (
                          <PlaceCard
                            key={place.id}
                            place={place}
                            onSelect={onPlaceSelect}
                            isSelected={selectedPlace === place.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Activity List */}
                  <div className="px-4 pb-4">
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                      Schedule
                    </h4>
                    <div className="space-y-2">
                      {day.activities.map((activity, idx) => {
                        const place = getPlace(activity.placeId)
                        const hasShellfish = place?.shellfish
                        const mapsUrl = place
                          ? getGoogleMapsUrl(place.coordinates[0], place.coordinates[1], place.name)
                          : null

                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                          >
                            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5">
                              {activityIcons[activity.type] || <MapPin size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-400 uppercase tracking-wide">
                                  {activity.time}
                                </span>
                                {hasShellfish && (
                                  <span className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertTriangle size={10} />
                                    Shellfish
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-200">
                                {activity.description}
                              </p>
                              {place && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-400">
                                    {place.priceRange}
                                  </span>
                                  {mapsUrl && (
                                    <a
                                      href={mapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                                    >
                                      <ExternalLink size={10} />
                                      Maps
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  {day.notes && (
                    <div className="mx-4 mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        📝 {day.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
