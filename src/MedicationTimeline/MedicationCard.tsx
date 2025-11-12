import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { AlertCircle, Calendar, Repeat, Repeat1, Repeat2 } from 'lucide-react'
import React from 'react'
import type { MedicationStatement, Timing } from './types'
import { getMedColor } from './utils'

/** Component to display medication strength with visual indicators for confidence */
const StrengthDisplay: React.FC<{
  strength: { amount: number; unit: string }
}> = ({ strength }) => {
  const isConfirmed = strength.amount > 0 && strength.unit !== 'unknown'
  const displayText = isConfirmed
    ? `${strength.amount} ${strength.unit}`
    : 'Unconfirmed strength'

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="body2" color="text.secondary">
        {displayText}
      </Typography>
      {!isConfirmed && (
        <Tooltip title="Strength could not be confirmed from source">
          <AlertCircle size={14} style={{ color: '#ff9800' }} />
        </Tooltip>
      )}
    </Box>
  )
}

/** Component to display frequency with visual icon */
const FrequencyBadge: React.FC<{ frequency: number | undefined }> = ({
  frequency,
}) => {
  if (!frequency || frequency === 0) return null

  const iconSize = 12
  let icon: React.ReactNode
  let label: string

  if (frequency === 1) {
    icon = <Repeat1 size={iconSize} />
    label = 'Once'
  } else if (frequency === 2) {
    icon = <Repeat2 size={iconSize} />
    label = 'Twice'
  } else {
    icon = <Repeat size={iconSize} />
    label = `${frequency}×`
  }

  return (
    <Tooltip title={`${label} daily`}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.3,
          px: 0.8,
          py: 0.3,
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          borderRadius: 1,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#2196f3',
        }}
      >
        {icon}
        {label}
      </Box>
    </Tooltip>
  )
}

/** Component to display period/schedule information */
const PeriodDisplay: React.FC<{ timing: Timing }> = ({ timing }) => {
  const period = timing.period || 1
  const periodUnit = timing.periodUnit || 'day'
  const periodMax = timing.periodMax

  if (!timing.frequency || timing.frequency === 0) {
    return (
      <Tooltip title="Timing frequency is unknown">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AlertCircle size={14} color="#ff9800" />
          <Typography variant="caption" color="text.secondary">
            Unknown timing
          </Typography>
        </Box>
      </Tooltip>
    )
  }

  let periodText = ''
  if (periodMax && periodMax !== period) {
    periodText = `every ${period}–${periodMax} ${periodUnit}${
      periodMax > 1 ? 's' : ''
    }`
  } else {
    if (period === 1) {
      periodText = `daily`
    } else {
      periodText = `every ${period} ${periodUnit}${period > 1 ? 's' : ''}`
    }
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Calendar size={13} color="#666" />
      <Typography variant="caption" color="text.secondary">
        {periodText}
      </Typography>
    </Box>
  )
}

/** Component to display special timing modifiers */
const TimingModifiers: React.FC<{ timing: Timing }> = ({ timing }) => {
  const modifiers: { label: string; color: string; tooltip?: string }[] = []

  if (timing.isAsNeeded) {
    modifiers.push({
      label: 'As needed',
      color: '#f57c00',
      tooltip: 'Take only when symptoms occur',
    })
  }

  if (timing.specificTimes && timing.specificTimes.length > 0) {
    modifiers.push({
      label: `${timing.specificTimes.length} set time(s)`,
      color: '#4caf50',
      tooltip: `Times: ${timing.specificTimes.join(', ')}`,
    })
  }

  if (timing.timeCategories && timing.timeCategories.length > 0) {
    modifiers.push({
      label: timing.timeCategories.join(', '),
      color: '#c869d9ff',
      tooltip: 'Times relative to meals or day periods',
    })
  }

  if (timing.weekdays && timing.weekdays.length > 0) {
    modifiers.push({
      label: `${timing.weekdays.length} day(s)/week`,
      color: '#73e2eeff',
      tooltip: `Days: ${timing.weekdays.join(', ')}`,
    })
  }

  if (timing.duration) {
    modifiers.push({
      label: `${timing.duration} ${timing.durationUnit || 'day'}${
        timing.duration > 1 ? 's' : ''
      }`,
      color: '#e46d95ff',
      tooltip: 'Duration of this timing block',
    })
  }

  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
      {modifiers.map((mod, idx) => (
        <Tooltip key={idx} title={mod.tooltip || ''}>
          <Chip
            label={mod.label}
            size="small"
            variant="outlined"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              borderColor: mod.color,
              color: mod.color,
              '& .MuiChip-label': {
                px: 0.8,
              },
            }}
          />
        </Tooltip>
      ))}
    </Stack>
  )
}

/** Component to display a single timing in the sequence */
const TimingBlock: React.FC<{ timing: Timing; index: number }> = ({
  timing,
  index,
}) => {
  const hasFrequency = timing.frequency !== undefined && timing.frequency > 0
  const hasAllInfo =
    hasFrequency &&
    (timing.period !== undefined || timing.specificTimes?.length) &&
    (timing.duration !== undefined || !timing.duration)

  return (
    <Box
      sx={{
        p: 1.5,
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Sequence indicator if multiple timings */}
      {index > 0 && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 1,
            fontStyle: 'italic',
            color: 'text.secondary',
          }}
        >
          Then →
        </Typography>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="caption">Take {timing.doseAmount}</Typography>
        <FrequencyBadge frequency={timing.frequency} />
        <PeriodDisplay timing={timing} />
      </Box>

      {/* Modifiers */}
      <TimingModifiers timing={timing} />

      {/* Raw text if available */}

      {/* Missing data indicator */}
      {!hasAllInfo && !hasFrequency && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
          <AlertCircle size={14} color="#ff9800" />
          <Typography variant="caption" color="text.secondary">
            Some timing information is missing
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export const MedicationCard: React.FC<{
  med: MedicationStatement
  idx: number
}> = ({ med, idx }) => {
  const hasAnyTiming = med.timingSequence.length > 0

  return (
    <Grid size={12}>
      <Card
        variant="outlined"
        sx={{
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: 2,
          },
        }}
      >
        <CardContent>
          {/* Header with color indicator and medication name */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'start',
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: getMedColor(idx),
                mt: 0.75,
                flexShrink: 0,
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight="700">
                {med.genericName || med.medication || 'Unknown medication'}
              </Typography>

              {/* Strength and form */}
              <Box sx={{ mt: 0.5, mb: 1 }}>
                <StrengthDisplay strength={med.strength} />
                {med.form && (
                  <Typography variant="body2" color="text.secondary">
                    {med.form}
                  </Typography>
                )}
              </Box>

              {/* Brand name if available */}
              {med.brandName && (
                <Typography variant="caption" color="text.secondary">
                  Brand: {med.brandName}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Timing information section */}
          {hasAnyTiming ? (
            <Box sx={{ mt: 2 }}>
              <Stack spacing={1}>
                {med.timingSequence.map((timing, idx) => (
                  <TimingBlock key={idx} timing={timing} index={idx} />
                ))}
              </Stack>
            </Box>
          ) : (
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                backgroundColor: 'rgba(255, 152, 0, 0.05)',
                borderRadius: 1,
                border: '1px solid rgba(255, 152, 0, 0.2)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
              }}
            >
              <AlertCircle
                size={14}
                color="#ff9800"
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <Box>
                <Typography
                  variant="caption"
                  fontWeight="600"
                  color="text.secondary"
                  sx={{ display: 'block' }}
                >
                  No timing information
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Unable to determine when this medication should be taken
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  )
}
