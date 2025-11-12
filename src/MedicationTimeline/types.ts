// Type definitions
export interface Strength {
  amount: number
  unit: string
}
export interface Timing {
  orderInSequence?: number
  frequency?: number
  frequencyMax?: number
  period?: number
  periodMax?: number
  periodUnit?: string
  duration?: number
  durationUnit?: string
  count?: number
  isAsNeeded: boolean
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
  times?: string[]
}
export interface MedicationWithSchedule extends MedicationStatement {
  schedule: MedicationSchedule
}
