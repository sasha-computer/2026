export interface City {
  id: string
  name: string
  nameJa: string
  coordinates: [number, number]
  days: number[]
  nights: number
  description: string
  neighbourhoods: Neighbourhood[]
}

export interface Neighbourhood {
  name: string
  nameJa: string
  description: string
  recommended?: boolean
}

export interface Route {
  from: string
  to: string
  method: string
  duration: string
  jrPass: boolean
  cost?: string
}

export interface Place {
  id: string
  name: string
  nameJa: string
  city: string
  category: PlaceCategory
  subcategory: string
  coordinates: [number, number]
  neighbourhood: string
  description: string
  priceRange: string
  hours?: string
  closedDays?: string[]
  shellfish: boolean
  shellfishNote?: string
  highlight?: boolean
  photos?: string[]  // Array of photo URLs
  rating?: number  // Google Places rating (1-5)
  userRatingsTotal?: number  // Number of Google reviews
  googlePlaceId?: string  // Google Places ID
}

export type PlaceCategory =
  | 'coffee'
  | 'restaurant'
  | 'activity'
  | 'nature'

export interface Activity {
  time: string
  type: string
  description: string
  placeId?: string
}

export interface TravelInfo {
  from: string
  to: string
  method: string
  duration?: string
  jrPass?: boolean
  cost?: string
  notes?: string
}

export interface Day {
  day: number
  date: string
  title: string
  city: string
  summary: string
  activities: Activity[]
  travelInfo?: TravelInfo
  notes?: string
}

export interface CitiesData {
  cities: City[]
  route: Route[]
}

export interface PlacesData {
  places: Place[]
}

export interface DaysData {
  days: Day[]
}
