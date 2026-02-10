# Japan Trip 2026

**Status:** In Progress

## Overview
A 17-day trip to Japan in November 2026 for a couple (first-time visitors). Focus on off-the-beaten-path experiences: nature, coffee shops, good food, onsen, and residential neighbourhoods.

## Trip Details
- **Duration**: 17 full days
- **When**: November 10-27, 2026 (autumn foliage season)
- **Travelers**: Couple
- **Budget**: ~£150/day per person (mid-range)
- **Dietary**: No shellfish for one person

## Route
Tokyo → Kanazawa → Takayama → Kyoto → Hiroshima/Miyajima → Tokyo

Fly into and out of Tokyo (Narita/Haneda).

## Cities & Duration
| City | Nights | Neighbourhood |
|------|--------|---------------|
| Tokyo | 4 | Yanaka/Nezu |
| Kanazawa | 3 | Kazuemachi/Teramachi |
| Takayama | 2 | Near Sanmachi Suji |
| Kyoto | 5 | Nishijin or Okazaki |
| Hiroshima/Miyajima | 2 | Nagarekawa/Hondori |
| Tokyo (return) | 1 | - |

## Key Interests
- Nature (not heavy hiking)
- Coffee shops (kissaten + third-wave)
- Good food (local specialties, markets)
- Art/architecture
- Onsen/relaxation
- Residential neighbourhoods (avoiding tourist crush)

## Project Components
- `itinerary.md` - Detailed day-by-day plan
- `data/` - JSON files for the app (cities, places with ratings, daily itinerary)
- `app/` - React trip planning app with interactive map
- `research/` - Source links and notes

## App Features

### Implemented
- **Interactive Map** - Google Maps with `@vis.gl/react-google-maps` (visgl)
  - City markers with route lines between destinations
  - Place markers (coffee shops, restaurants, nature spots)
  - Info windows showing place details and Google ratings
  - Pan/zoom to selected city
- **Timeline View** - Day-by-day itinerary with activities
  - Clean day headers with "Day X" labels
  - Place cards with photos fetched from Google Places API
  - Photo gallery lightbox for each place
- **Places List** - Filterable list of saved places by category and city
- **Budget Tracker** - Budget breakdown with GBP conversion (£1 = ¥190)
- **Dark Mode** - Toggle between light and dark themes
- **City/Category Filters** - Filter content by city and place type

### Tech Stack
- React + TypeScript + Vite
- Tailwind CSS
- `@vis.gl/react-google-maps` (Google-backed, OpenJS Foundation)
- Google Maps JavaScript API + Places API

## TODOs

### UI/UX Improvements
- [x] ~~Make map + timeline the default/main view (combined view)~~
- [x] ~~Improve Trip Timeline clarity - make it obvious that 1, 2, 3 represent days (e.g., "Day 1", "Day 2")~~
- [x] ~~Click place cards in timeline to zoom map to that location~~
- [x] ~~When clicking a day, highlight all locations for that day with enhanced/popped-out markers~~
- [x] ~~Add directional arrows to route lines to show trip direction~~

## Budget Estimate
| Item | Per Person |
|------|-----------|
| Accommodation (17 nights) | £1,190-1,530 |
| Food | £680-850 |
| Activities | £255-340 |
| Local transport | £170-255 |
| JR Pass (14-day) | £375 |
| Flights (London) | £600-900 |
| **Total** | **~£3,300-4,300** |
