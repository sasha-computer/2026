import { PoundSterling, Train, Home, Utensils, Ticket, Info } from 'lucide-react'

interface BudgetData {
  exchangeRate: {
    jpyToGbp: number
    note: string
  }
  transport: {
    jrPass: { type: string; yen: number; gbp: number; perPerson: boolean; note: string }
    flights: { type: string; yen: number; gbp: number; perPerson: boolean; note: string }
    notCoveredByJR: { route: string; method: string; yen: number; gbp: number }[]
  }
  accommodation: {
    perNight: Record<string, { yen: number; gbp: number }>
    estimate: {
      nights: number
      breakdown: { type: string; nights: number; yenPerNight: number; totalYen: number }[]
      totalYen: number
      totalGbp: number
      perPerson: boolean
      note: string
    }
  }
  activities: {
    entries: { name: string; city: string; yen: number; gbp: number }[]
    totalYen: number
    totalGbp: number
    perPerson: boolean
  }
  food: {
    daily: Record<string, { yen: number; gbp: number; note: string }>
    estimate: {
      days: number
      dailyYen: number
      dailyGbp: number
      totalYen: number
      totalGbp: number
      perPerson: boolean
      note: string
    }
    splurges: { name: string; yen: number; gbp: number }[]
  }
  summary: {
    perPerson: Record<string, { yen: number; gbp: number; note?: string }>
    totalPerPerson: { yen: number; gbp: number }
    totalForTwo: { yen: number; gbp: number }
  }
  tips: string[]
}

// Import budget data
import budgetData from '../../../data/budget.json'

const data = budgetData as BudgetData

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`
}

function formatGbp(amount: number): string {
  return `£${amount.toLocaleString()}`
}

function CostRow({
  label,
  yen,
  gbp,
  note,
  highlight = false
}: {
  label: string
  yen: number
  gbp: number
  note?: string
  highlight?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${highlight ? 'font-semibold' : ''}`}>
      <div className="flex-1">
        <span className={highlight ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}>
          {label}
        </span>
        {note && (
          <span className="text-xs text-gray-400 ml-2">({note})</span>
        )}
      </div>
      <div className="flex gap-4 text-right">
        <span className="w-24 text-gray-500 dark:text-gray-400">{formatYen(yen)}</span>
        <span className={`w-20 ${highlight ? 'text-japan-red font-bold' : 'text-gray-900 dark:text-white'}`}>
          {formatGbp(gbp)}
        </span>
      </div>
    </div>
  )
}

function Section({
  title,
  icon,
  children
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
        <span className="text-gray-500">{icon}</span>
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

export function Budget() {
  return (
    <div className="p-4 pb-20 space-y-4">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-japan-red to-red-700 rounded-xl p-6 text-white">
        <h2 className="text-lg font-medium opacity-90 mb-1">Total Trip Cost</h2>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{formatGbp(data.summary.totalForTwo.gbp)}</span>
          <span className="opacity-75">for two people</span>
        </div>
        <div className="mt-2 text-sm opacity-75">
          {formatYen(data.summary.totalForTwo.yen)} · {formatGbp(data.summary.totalPerPerson.gbp)} per person
        </div>
        <div className="mt-4 pt-4 border-t border-white/20 text-sm opacity-75">
          {data.exchangeRate.note}
        </div>
      </div>

      {/* Per Person Breakdown */}
      <Section title="Per Person Summary" icon={<PoundSterling size={18} />}>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {Object.entries(data.summary.perPerson).map(([key, value]) => (
            <CostRow
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
              yen={value.yen}
              gbp={value.gbp}
              note={value.note}
            />
          ))}
          <CostRow
            label="Total per person"
            yen={data.summary.totalPerPerson.yen}
            gbp={data.summary.totalPerPerson.gbp}
            highlight
          />
        </div>
      </Section>

      {/* Transport */}
      <Section title="Transport" icon={<Train size={18} />}>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <CostRow
            label={data.transport.flights.type}
            yen={data.transport.flights.yen}
            gbp={data.transport.flights.gbp}
            note={data.transport.flights.note}
          />
          <CostRow
            label={data.transport.jrPass.type}
            yen={data.transport.jrPass.yen}
            gbp={data.transport.jrPass.gbp}
            note={data.transport.jrPass.note}
          />
          <div className="py-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Not covered by JR Pass:
            </p>
            {data.transport.notCoveredByJR.map((item, i) => (
              <CostRow
                key={i}
                label={item.route}
                yen={item.yen}
                gbp={item.gbp}
                note={item.method}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Accommodation */}
      <Section title="Accommodation" icon={<Home size={18} />}>
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-750 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">{data.accommodation.estimate.note}</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {data.accommodation.estimate.breakdown.map((item, i) => (
            <CostRow
              key={i}
              label={`${item.type} (${item.nights} nights)`}
              yen={item.totalYen}
              gbp={Math.round(item.totalYen * data.exchangeRate.jpyToGbp)}
              note={`${formatYen(item.yenPerNight)}/night`}
            />
          ))}
          <CostRow
            label="Total accommodation"
            yen={data.accommodation.estimate.totalYen}
            gbp={data.accommodation.estimate.totalGbp}
            highlight
          />
        </div>
      </Section>

      {/* Activities & Entry Fees */}
      <Section title="Activities & Entry Fees" icon={<Ticket size={18} />}>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {data.activities.entries.map((item, i) => (
            <CostRow
              key={i}
              label={item.name}
              yen={item.yen}
              gbp={item.gbp}
              note={item.city}
            />
          ))}
          <CostRow
            label="Total activities"
            yen={data.activities.totalYen}
            gbp={data.activities.totalGbp}
            highlight
          />
        </div>
      </Section>

      {/* Food */}
      <Section title="Food & Drink" icon={<Utensils size={18} />}>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {Object.entries(data.food.daily).map(([level, value]) => (
            <div key={level} className="p-3 bg-gray-50 dark:bg-gray-750 rounded-lg text-center">
              <p className="text-xs text-gray-500 uppercase">{level}</p>
              <p className="font-semibold text-gray-900 dark:text-white">{formatGbp(value.gbp)}/day</p>
              <p className="text-xs text-gray-400">{formatYen(value.yen)}</p>
            </div>
          ))}
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <CostRow
            label={`Estimate (${data.food.estimate.days} days)`}
            yen={data.food.estimate.totalYen}
            gbp={data.food.estimate.totalGbp}
            note={`${formatGbp(data.food.estimate.dailyGbp)}/day`}
          />
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Splurge meals:</p>
          {data.food.splurges.map((item, i) => (
            <CostRow
              key={i}
              label={item.name}
              yen={item.yen}
              gbp={item.gbp}
            />
          ))}
        </div>
      </Section>

      {/* Tips */}
      <Section title="Money Tips" icon={<Info size={18} />}>
        <ul className="space-y-2">
          {data.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="text-japan-red mt-1">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
