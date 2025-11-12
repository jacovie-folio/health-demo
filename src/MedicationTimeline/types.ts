// Type definitions
export interface Strength {
  amount: number
  unit: string
}
export interface Timing {
  orderInSequence?: number
  doseAmount: number
  doseUnit?: string
  frequency?: number
  frequencyMax?: number
  period?: number
  periodMax?: number
  periodUnit?: string
  duration?: number
  durationUnit?: string
  count?: number
  isAsNeeded: boolean
  /**
   * Specific literal times of day, e.g. ["08:00", "20:00"]
   * If present, scheduling should prefer these explicit times.
   */
  specificTimes?: string[]
  /**
   * Human categories that map to approximate times, e.g. ["morning", "night"].
   * These will be interpreted into concrete times for display.
   */
  timeCategories?: string[]
  /**
   * Explicit weekdays on which this timing applies. 0 = Sunday, 6 = Saturday.
   * Values should be weekday names in lowercase, e.g. 'sunday', 'monday'
   */
  weekdays?: string[]
  rawText?: string
}
export interface MedicationStatement {
  medication: string
  brandName?: string
  genericName?: string
  rxnormCode: string
  form?: string
  timingSequence: Timing[]
  strength: Strength
  sourceText: string
}
export interface MedicationData {
  medicationStatements: MedicationStatement[]
  freeTextResponse?: string
}
export interface Message {
  role: 'user' | 'assistant'
  text: string
}
export interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
}
export interface MedicationSchedule {
  asNeeded?: boolean
  max?: number
  /** Concrete times to display for this date (either explicit or calculated) */
  times?: string[]
  doseAmount: number
  doseUnit?: string
  /** If the schedule was produced from explicit instructions vs calculated from frequency/period */
  source?: 'explicit' | 'calculated'
  /** If the original timing specified weekdays explicitly, these will be present (weekday names in lowercase) */
  explicitWeekdays?: string[]
  /** If the original timing specified time categories, these will be preserved */
  timeCategories?: string[]
}
export interface MedicationWithSchedule extends MedicationStatement {
  schedule: MedicationSchedule
}
