#!/usr/bin/env node

/**
 * Fetch Google Places ratings for all places in places.json
 * Uses the new Places API (New)
 *
 * Usage:
 *   node scripts/fetch-ratings.js
 *
 * Requires: VITE_GOOGLE_MAPS_API_KEY in app/.env
 */

const fs = require('fs')
const path = require('path')

// Load API key from .env file
const envPath = path.join(__dirname, '../app/.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const apiKeyMatch = envContent.match(/VITE_GOOGLE_MAPS_API_KEY=(.+)/)
const API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : null

if (!API_KEY) {
  console.error('Error: VITE_GOOGLE_MAPS_API_KEY not found in app/.env')
  process.exit(1)
}

// Load places data
const placesPath = path.join(__dirname, '../data/places.json')
const placesData = JSON.parse(fs.readFileSync(placesPath, 'utf-8'))

// City names for better search
const cityNames = {
  tokyo: 'Tokyo',
  kanazawa: 'Kanazawa',
  takayama: 'Takayama',
  kyoto: 'Kyoto',
  uji: 'Uji',
  hiroshima: 'Hiroshima',
  miyajima: 'Miyajima',
}

async function searchPlace(place) {
  const cityName = cityNames[place.city] || place.city
  const searchQuery = `${place.name}, ${cityName}, Japan`

  // Use Places API (New) Text Search
  const url = 'https://places.googleapis.com/v1/places:searchText'

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.rating,places.userRatingCount,places.id,places.formattedAddress',
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        maxResultCount: 1,
      }),
    })

    const data = await response.json()

    if (data.places && data.places.length > 0) {
      const result = data.places[0]
      return {
        placeId: result.id,
        rating: result.rating || null,
        userRatingsTotal: result.userRatingCount || 0,
        formattedAddress: result.formattedAddress || null,
      }
    }
    return null
  } catch (error) {
    console.error(`  Error searching for ${place.name}:`, error.message)
    return null
  }
}

async function main() {
  console.log(`\nFetching ratings for ${placesData.places.length} places...\n`)

  let updated = 0
  let failed = 0

  for (const place of placesData.places) {
    process.stdout.write(`${place.name}... `)

    const result = await searchPlace(place)

    if (result && result.rating) {
      place.rating = result.rating
      place.userRatingsTotal = result.userRatingsTotal
      place.googlePlaceId = result.placeId
      console.log(`${result.rating} (${result.userRatingsTotal} reviews)`)
      updated++
    } else if (result) {
      console.log('found but no rating')
      place.googlePlaceId = result.placeId
    } else {
      console.log('not found')
      failed++
    }

    // Rate limiting: 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Save updated places.json
  fs.writeFileSync(placesPath, JSON.stringify(placesData, null, 2) + '\n')

  console.log(`\nDone! Updated ${updated} places, ${failed} not found.`)
  console.log(`Results saved to ${placesPath}`)
}

main().catch(console.error)
