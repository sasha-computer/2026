import { useState, useEffect } from 'react'
import { Map as MapIcon, Calendar, Coffee, Utensils, TreePine, Sun, Moon, Filter, PoundSterling, List, Building2 } from 'lucide-react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { TripMap } from './components/TripMap'
import { Timeline } from './components/Timeline'
import { PlacesList } from './components/PlacesList'
import { Budget } from './components/Budget'
import { Planner } from './components/Planner'
import { CitiesData, PlacesData, DaysData, PlaceCategory } from './types'

// Import data
import citiesData from '../../data/cities.json'
import placesData from '../../data/places.json'
import daysData from '../../data/days.json'

type View = 'trip' | 'places' | 'planner' | 'budget'
type MobilePanel = 'timeline' | 'map'

const categoryFilters: { id: PlaceCategory | 'all'; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All', icon: <Filter size={16} /> },
  { id: 'coffee', label: 'Coffee', icon: <Coffee size={16} /> },
  { id: 'restaurant', label: 'Food', icon: <Utensils size={16} /> },
  { id: 'nature', label: 'Nature', icon: <TreePine size={16} /> },
]

const TRIP_START_DATE = '2026-03-06'
const TRIP_DAYS = 16

// Format date range for header display
const formatDateRange = (startDate: string, numDays: number): string => {
  const start = new Date(startDate)
  const end = new Date(startDate)
  end.setDate(end.getDate() + numDays - 1)

  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const startStr = start.toLocaleDateString('en-GB', formatOptions)
  const endStr = end.toLocaleDateString('en-GB', formatOptions)
  const year = start.getFullYear()

  return `${startStr} - ${endStr}, ${year}`
}

function App() {
  const [view, setView] = useState<View>('trip')
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('timeline')
  const [darkMode, setDarkMode] = useState(false)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<PlaceCategory | 'all'>('all')
  const [highlightedPlace, setHighlightedPlace] = useState<string | null>(null)

  // Clean up old localStorage from removed date picker feature
  useEffect(() => {
    localStorage.removeItem('tripStartDate')
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const cities = (citiesData as CitiesData).cities
  const routes = (citiesData as CitiesData).route
  const places = (placesData as PlacesData).places
  const days = (daysData as DaysData).days

  const filteredPlaces = places.filter(place => {
    const cityMatch = !selectedCity || place.city === selectedCity
    const categoryMatch = categoryFilter === 'all' || place.category === categoryFilter
    return cityMatch && categoryMatch
  })

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors`}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Japan Trip
            </h1>
            <p className="text-base text-gray-500 dark:text-gray-400">
              {formatDateRange(TRIP_START_DATE, TRIP_DAYS)} · {TRIP_DAYS} days
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={24} className="text-gray-400" /> : <Moon size={24} className="text-gray-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="max-w-7xl mx-auto flex gap-2">
          {[
            { id: 'trip' as View, label: 'Trip', icon: <Calendar size={22} /> },
            { id: 'places' as View, label: 'Places', icon: <Coffee size={22} /> },
            { id: 'planner' as View, label: 'Planner', icon: <Building2 size={22} /> },
            { id: 'budget' as View, label: 'Budget', icon: <PoundSterling size={22} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-4 border-b-3 transition-colors ${
                view === tab.id
                  ? 'border-japan-red text-japan-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.icon}
              <span className="font-semibold text-base">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* City Filter (not shown on planner/budget pages) */}
      {view !== 'budget' && view !== 'planner' && (
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-3">
          <button
            onClick={() => setSelectedCity(null)}
            className={`px-5 py-2.5 rounded-full text-base font-medium whitespace-nowrap transition-colors ${
              !selectedCity
                ? 'bg-japan-red text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All Cities
          </button>
          {cities.filter(c => c.nights > 0).map(city => (
            <button
              key={city.id}
              onClick={() => setSelectedCity(city.id)}
              className={`px-5 py-2.5 rounded-full text-base font-medium whitespace-nowrap transition-colors ${
                selectedCity === city.id
                  ? 'bg-japan-red text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Category Filter (for Places view) */}
      {view === 'places' && (
        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="max-w-7xl mx-auto flex gap-3">
            {categoryFilters.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-base font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === cat.id
                    ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main>
        {view === 'trip' && (
          <>
            {/* Mobile Toggle */}
            <div className="md:hidden flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <button
                onClick={() => setMobilePanel('timeline')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                  mobilePanel === 'timeline'
                    ? 'bg-white dark:bg-gray-800 text-japan-red border-b-2 border-japan-red'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <List size={18} />
                Timeline
              </button>
              <button
                onClick={() => setMobilePanel('map')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                  mobilePanel === 'map'
                    ? 'bg-white dark:bg-gray-800 text-japan-red border-b-2 border-japan-red'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <MapIcon size={18} />
                Map
              </button>
            </div>

            {/* Desktop: Side by side layout */}
            <div className="hidden md:flex h-[calc(100vh-180px)]">
              {/* Timeline Panel */}
              <div className="w-[420px] lg:w-[480px] xl:w-[520px] flex-shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <Timeline
                  days={days}
                  cities={cities}
                  places={places}
                  selectedCity={selectedCity}
                  selectedDay={selectedDay}
                  onDaySelect={setSelectedDay}
                  onPlaceSelect={setHighlightedPlace}
                  selectedPlace={highlightedPlace}
                />
              </div>
              {/* Map Panel */}
              <div className="flex-1">
                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
                  <TripMap
                    cities={cities}
                    routes={routes}
                    places={filteredPlaces}
                    selectedCity={selectedCity}
                    highlightedPlace={highlightedPlace}
                    selectedDay={selectedDay}
                    onCitySelect={setSelectedCity}
                    onPlaceSelect={setHighlightedPlace}
                    days={days}
                  />
                </APIProvider>
              </div>
            </div>

            {/* Mobile: Show one panel at a time */}
            <div className="md:hidden">
              {mobilePanel === 'timeline' ? (
                <div className="max-w-7xl mx-auto">
                  <Timeline
                    days={days}
                    cities={cities}
                    places={places}
                    selectedCity={selectedCity}
                    selectedDay={selectedDay}
                    onDaySelect={setSelectedDay}
                    onPlaceSelect={setHighlightedPlace}
                    selectedPlace={highlightedPlace}
                  />
                </div>
              ) : (
                <div className="h-[calc(100vh-220px)]">
                  <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
                    <TripMap
                      cities={cities}
                      routes={routes}
                      places={filteredPlaces}
                      selectedCity={selectedCity}
                      highlightedPlace={highlightedPlace}
                      selectedDay={selectedDay}
                      onCitySelect={setSelectedCity}
                      onPlaceSelect={setHighlightedPlace}
                      days={days}
                    />
                  </APIProvider>
                </div>
              )}
            </div>
          </>
        )}

        {view === 'places' && (
          <div className="max-w-7xl mx-auto">
            <PlacesList
              places={filteredPlaces}
              cities={cities}
              selectedCity={selectedCity}
              highlightedPlace={highlightedPlace}
              onPlaceSelect={setHighlightedPlace}
            />
          </div>
        )}

        {view === 'planner' && (
          <div className="max-w-7xl mx-auto">
            <Planner cities={cities} />
          </div>
        )}

        {view === 'budget' && (
          <div className="max-w-7xl mx-auto">
            <Budget />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
