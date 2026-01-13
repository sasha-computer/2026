import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, MapPin, Calendar, Building2, ExternalLink, X, Check } from 'lucide-react'
import { City } from '../types'

interface Accommodation {
  id: string
  name: string
  cityId: string
  checkIn: string
  checkOut: string
  address: string
  cost: number
}

interface PlannerProps {
  cities: City[]
}

const STORAGE_KEY = 'japan-trip-accommodation'

// Generate Google Maps URL from address
const getMapsUrl = (address: string) => {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

// Calculate nights between dates
const calculateNights = (checkIn: string, checkOut: string): number => {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const diff = end.getTime() - start.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// Format date for display
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function Planner({ cities }: PlannerProps) {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<Omit<Accommodation, 'id'>>({
    name: '',
    cityId: '',
    checkIn: '',
    checkOut: '',
    address: '',
    cost: 0,
  })

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setAccommodations(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse saved accommodations', e)
      }
    }
  }, [])

  // Save to localStorage when accommodations change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accommodations))
  }, [accommodations])

  const resetForm = () => {
    setFormData({
      name: '',
      cityId: '',
      checkIn: '',
      checkOut: '',
      address: '',
      cost: 0,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingId) {
      // Update existing
      setAccommodations(prev => prev.map(acc =>
        acc.id === editingId ? { ...formData, id: editingId } : acc
      ))
      setEditingId(null)
    } else {
      // Add new
      const newAccommodation: Accommodation = {
        ...formData,
        id: crypto.randomUUID(),
      }
      setAccommodations(prev => [...prev, newAccommodation])
    }

    resetForm()
    setIsAdding(false)
  }

  const handleEdit = (acc: Accommodation) => {
    setFormData({
      name: acc.name,
      cityId: acc.cityId,
      checkIn: acc.checkIn,
      checkOut: acc.checkOut,
      address: acc.address,
      cost: acc.cost,
    })
    setEditingId(acc.id)
    setIsAdding(true)
  }

  const handleDelete = (id: string) => {
    setAccommodations(prev => prev.filter(acc => acc.id !== id))
  }

  const handleCancel = () => {
    resetForm()
    setEditingId(null)
    setIsAdding(false)
  }

  const getCityName = (cityId: string) => {
    return cities.find(c => c.id === cityId)?.name || cityId
  }

  // Sort by check-in date
  const sortedAccommodations = [...accommodations].sort((a, b) =>
    new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime()
  )

  // Calculate grand total
  const grandTotal = accommodations.reduce((sum, acc) => sum + acc.cost, 0)
  const totalNights = accommodations.reduce((sum, acc) => sum + calculateNights(acc.checkIn, acc.checkOut), 0)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Accommodation</h2>
          <p className="text-gray-500 dark:text-gray-400">Track your hotel bookings</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-japan-red text-white rounded-lg hover:bg-japan-red/90 transition-colors"
          >
            <Plus size={20} />
            Add Booking
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">
            {editingId ? 'Edit Booking' : 'New Booking'}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Hotel Name */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hotel / Accommodation Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Hotel Graphy Nezu"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-japan-red focus:border-japan-red"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                City
              </label>
              <select
                required
                value={formData.cityId}
                onChange={e => setFormData(prev => ({ ...prev, cityId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-japan-red focus:border-japan-red"
              >
                <option value="">Select city...</option>
                {cities.filter(c => c.nights > 0).map(city => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </select>
            </div>

            {/* Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Cost (£)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.cost || ''}
                onChange={e => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-japan-red focus:border-japan-red"
              />
            </div>

            {/* Check-in */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Check-in
              </label>
              <input
                type="date"
                required
                value={formData.checkIn}
                onChange={e => setFormData(prev => ({ ...prev, checkIn: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-japan-red focus:border-japan-red"
              />
            </div>

            {/* Check-out */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Check-out
              </label>
              <input
                type="date"
                required
                value={formData.checkOut}
                onChange={e => setFormData(prev => ({ ...prev, checkOut: e.target.value }))}
                min={formData.checkIn}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-japan-red focus:border-japan-red"
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="e.g. 4-5-10 Ikenohata, Taito City, Tokyo"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-japan-red focus:border-japan-red"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={18} />
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-japan-red text-white rounded-lg hover:bg-japan-red/90 transition-colors"
            >
              <Check size={18} />
              {editingId ? 'Save Changes' : 'Add Booking'}
            </button>
          </div>
        </form>
      )}

      {/* Accommodation List */}
      {sortedAccommodations.length > 0 ? (
        <div className="space-y-4">
          {sortedAccommodations.map(acc => {
            const nights = calculateNights(acc.checkIn, acc.checkOut)
            const costPerNight = nights > 0 ? acc.cost / nights : 0

            return (
              <div
                key={acc.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 size={18} className="text-japan-red flex-shrink-0" />
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {acc.name}
                      </h3>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin size={14} className="flex-shrink-0" />
                        <span>{getCityName(acc.cityId)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar size={14} className="flex-shrink-0" />
                        <span>
                          {formatDate(acc.checkIn)} → {formatDate(acc.checkOut)}
                          <span className="text-gray-400 dark:text-gray-500 ml-1">
                            ({nights} {nights === 1 ? 'night' : 'nights'})
                          </span>
                        </span>
                      </div>

                      {acc.address && (
                        <a
                          href={getMapsUrl(acc.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                        >
                          <ExternalLink size={14} className="flex-shrink-0" />
                          <span className="truncate">{acc.address}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Cost & Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        £{acc.cost.toFixed(2)}
                      </div>
                      {nights > 0 && (
                        <div className="text-xs text-gray-400">
                          £{costPerNight.toFixed(2)}/night
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(acc)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Grand Total */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mt-6 border-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Accommodation
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {sortedAccommodations.length} {sortedAccommodations.length === 1 ? 'booking' : 'bookings'} · {totalNights} nights
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                £{grandTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        !isAdding && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Building2 size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No bookings yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Add your accommodation bookings to keep track of costs
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-japan-red text-white rounded-lg hover:bg-japan-red/90 transition-colors"
            >
              <Plus size={20} />
              Add First Booking
            </button>
          </div>
        )
      )}
    </div>
  )
}
