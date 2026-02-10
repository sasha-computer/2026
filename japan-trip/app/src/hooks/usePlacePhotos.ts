import { useState, useEffect } from 'react'

interface PhotoCache {
  [placeId: string]: string[] | null // null means "loading" or "no photos"
}

// In-memory cache (persists across component re-renders)
const photoCache: PhotoCache = {}
const pendingRequests: { [placeId: string]: Promise<string[]> } = {}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

/**
 * Fetch photos for a place using Google Places API
 * Uses caching to avoid redundant API calls
 */
async function fetchPlacePhotos(googlePlaceId: string): Promise<string[]> {
  // Return cached result if available
  if (photoCache[googlePlaceId] !== undefined) {
    return photoCache[googlePlaceId] || []
  }

  // Return pending request if already in flight
  if (googlePlaceId in pendingRequests) {
    return pendingRequests[googlePlaceId]
  }

  // Create new request
  pendingRequests[googlePlaceId] = (async () => {
    try {
      // Use Places API (New) - fields-based pricing
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${googlePlaceId}?fields=photos&key=${API_KEY}`,
        {
          headers: {
            'X-Goog-FieldMask': 'photos',
          },
        }
      )

      if (!response.ok) {
        console.warn(`Failed to fetch photos for ${googlePlaceId}:`, response.status)
        photoCache[googlePlaceId] = null
        return []
      }

      const data = await response.json()

      if (!data.photos || data.photos.length === 0) {
        photoCache[googlePlaceId] = null
        return []
      }

      // Convert photo references to URLs (max 4 photos)
      const photos = data.photos.slice(0, 4).map((photo: { name: string }) => {
        // New Places API format: places/{place_id}/photos/{photo_reference}
        return `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=400&maxWidthPx=400&key=${API_KEY}`
      })

      photoCache[googlePlaceId] = photos
      return photos
    } catch (error) {
      console.error(`Error fetching photos for ${googlePlaceId}:`, error)
      photoCache[googlePlaceId] = null
      return []
    } finally {
      delete pendingRequests[googlePlaceId]
    }
  })()

  return pendingRequests[googlePlaceId]
}

/**
 * Hook to get photos for a place
 * Returns loading state and photo URLs
 */
export function usePlacePhotos(googlePlaceId: string | undefined) {
  const [photos, setPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!googlePlaceId || !API_KEY) {
      setLoading(false)
      return
    }

    // Check cache first
    if (photoCache[googlePlaceId] !== undefined) {
      setPhotos(photoCache[googlePlaceId] || [])
      setLoading(false)
      return
    }

    setLoading(true)
    fetchPlacePhotos(googlePlaceId).then((result) => {
      setPhotos(result)
      setLoading(false)
    })
  }, [googlePlaceId])

  return { photos, loading }
}

/**
 * Preload photos for multiple places
 * Call this when a day expands to start loading photos early
 */
export function preloadPlacePhotos(googlePlaceIds: (string | undefined)[]) {
  const ids = googlePlaceIds.filter((id): id is string => !!id)
  ids.forEach((id) => {
    if (photoCache[id] === undefined && !pendingRequests[id]) {
      fetchPlacePhotos(id)
    }
  })
}

/**
 * Get cached photos synchronously (returns empty if not cached)
 */
export function getCachedPhotos(googlePlaceId: string | undefined): string[] {
  if (!googlePlaceId) return []
  return photoCache[googlePlaceId] || []
}
