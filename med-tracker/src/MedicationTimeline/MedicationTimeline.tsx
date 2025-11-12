import {
  AppBar,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  LoaderIcon,
  Pill,
  Send,
  X,
} from 'lucide-react'
import React, { useCallback, useState } from 'react'
import type {
  CalendarDay,
  MedicationSchedule,
  MedicationStatement,
  MedicationWithSchedule,
  Message,
} from './types'
import { useLLM } from './useLLM'

const MedicationTimeline: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Hi there! I can help you manage your medication schedule. Can you tell me what medications you're taking?",
    },
  ])
  const [inputValue, setInputValue] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [notifyMedicationChange, setNotifyMedicationChange] = useState(false)

  const handleAlertMedChange = useCallback(() => {
    setNotifyMedicationChange(true)
  }, [setNotifyMedicationChange])
  const handleDismissMedChange = useCallback(() => {
    setNotifyMedicationChange(false)
  }, [setNotifyMedicationChange])

  const { isLoading, sendPrompt, medications } = useLLM({
    onUpdateMedications: handleAlertMedChange,
  })

  // Sample medication data

  const handleSendMessage = (): void => {
    if (!inputValue.trim()) return

    setMessages((prev) => [...prev, { role: 'user', text: inputValue }])
    setInputValue('')
    sendPrompt(
      [
        ...messages
          .filter((message) => message.role === 'user')
          .map((message) => message.text),
        inputValue,
      ].join('\n')
    )
      .then((response) => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text:
              response?.data.freeTextResponse ||
              "Alrighty! I've added your meds to the calendar. Did you have any others to add?",
          },
        ])
      })
      .catch((err) => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `${err}`,
          },
        ])
      })
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Calculate medication schedule
  const getMedicationSchedule = useCallback(
    (med: MedicationStatement, date: Date): MedicationSchedule | null => {
      const startDate = new Date(currentDate)
      startDate.setHours(0, 0, 0, 0)

      const daysDiff = Math.floor(
        (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      let durationSoFar = 0

      const times: string[] = []

      for (const timing of med.timingSequence) {
        if (timing.duration && daysDiff >= timing.duration + durationSoFar) {
          durationSoFar += timing.duration
          continue
        }

        if (!timing.duration) {
          return null
        }

        const frequency = timing.frequency || 1

        if (timing.isAsNeeded) {
          return { asNeeded: true, max: timing.frequencyMax || frequency }
        }

        if (frequency === 1) {
          times.push('08:00')
        } else if (frequency === 2) {
          times.push('08:00', '20:00')
        } else if (frequency === 3) {
          times.push('08:00', '14:00', '20:00')
        } else if (frequency === 4) {
          times.push('08:00', '12:00', '16:00', '20:00')
        }
      }

      return { times }
    },
    [currentDate]
  )

  const generateCalendarDays = (): CalendarDay[] => {
    const start = new Date(currentDate)
    start.setDate(1)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setMonth(end.getMonth() + 1)
    end.setDate(0)

    const days: CalendarDay[] = []
    const firstDay = start.getDay()

    for (let i = 0; i < firstDay; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() - (firstDay - i))
      days.push({ date: d, isCurrentMonth: false })
    }

    for (let i = 1; i <= end.getDate(); i++) {
      const d = new Date(start)
      d.setDate(i)
      days.push({ date: d, isCurrentMonth: true })
    }

    return days
  }

  const getDayMedications = useCallback(
    (date: Date): MedicationWithSchedule[] => {
      return (
        medications?.medicationStatements
          .map((med) => {
            const schedule = getMedicationSchedule(med, date)
            if (!schedule) return null
            return { ...med, schedule }
          })
          .filter((med): med is MedicationWithSchedule => med !== null) || []
      )
    },
    [getMedicationSchedule, medications]
  )

  const getDaysUntilRunOut = (med: MedicationStatement): number | null => {
    return med.timingSequence.reduce(
      (sum, timing) => sum + (timing?.duration || 0),
      0
    )
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const getMedColor = (index: number): string => {
    const colors = [
      '#2196f3',
      '#4caf50',
      '#9c27b0',
      '#ff9800',
      '#e91e63',
      '#3f51b5',
    ]
    return colors[index % colors.length]
  }

  const calendarDays = generateCalendarDays()
  const monthYear = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const navigateMonth = (direction: number): void => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  return (
    <Stack direction={'row'} divider={<Divider orientation="vertical" />}>
      <Box
        borderRight={'1px solid'}
        borderColor={'divider'}
        sx={{
          height: '100vh',
          width: '50vw',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Pill size={24} />
              <Typography variant="h6">Medication Assistant</Typography>
            </Box>
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <Container maxWidth="md">
            <List>
              {messages.map((msg, idx) => (
                <ListItem
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent:
                      msg.role === 'user' ? 'flex-end' : 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      maxWidth: '70%',
                      flexDirection:
                        msg.role === 'user' ? 'row-reverse' : 'row',
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: msg.role === 'user' ? '#2196f3' : '#4caf50',
                        width: 36,
                        height: 36,
                      }}
                    >
                      {msg.role === 'user' ? 'U' : 'A'}
                    </Avatar>
                    <Paper
                      elevation={msg.role === 'user' ? 1 : 4}
                      sx={{
                        p: 2,

                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="body1">{msg.text}</Typography>
                    </Paper>
                  </Box>
                </ListItem>
              ))}
              {isLoading && (
                <ListItem
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      maxWidth: '70%',
                      flexDirection: 'row',
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: '#4caf50',
                        width: 36,
                        height: 36,
                      }}
                    >
                      {'A'}
                    </Avatar>
                    <Paper
                      elevation={1}
                      sx={{
                        p: 2,

                        borderRadius: 2,
                      }}
                    >
                      <LoaderIcon
                        style={{
                          animation: 'spin 1s infinite linear',
                        }}
                      />
                    </Paper>
                  </Box>
                </ListItem>
              )}
            </List>
          </Container>
        </Box>

        <Paper elevation={3} sx={{ p: 2 }}>
          <Container maxWidth="md">
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Add your medications to the tracker."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                multiline
                maxRows={3}
              />
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
              >
                <Send size={20} />
              </IconButton>
            </Box>
            <Snackbar
              open={notifyMedicationChange}
              autoHideDuration={5000}
              onClose={handleDismissMedChange}
              message={`Updated tracker medications: ${medications?.medicationStatements.map(
                (s) => s.medication
              )}`}
            />
          </Container>
        </Paper>
      </Box>

      <Box sx={{ height: '100vh', width: '50vw', p: 3 }}>
        <Container maxWidth="lg">
          <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 56, height: 56 }}>
                  <Pill size={28} />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    Medication Schedule
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Track your daily medication routine
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <IconButton onClick={() => navigateMonth(-1)}>
                <ChevronLeft />
              </IconButton>
              <Typography variant="h6" fontWeight="600">
                {monthYear}
              </Typography>
              <IconButton onClick={() => navigateMonth(1)}>
                <ChevronRight />
              </IconButton>
            </Box>
          </Paper>

          <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Grid size={12 / 7} key={day}>
                  <Typography
                    align="center"
                    variant="body2"
                    fontWeight="600"
                    color="text.secondary"
                  >
                    {day}
                  </Typography>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={1}>
              {calendarDays.map((day, idx) => {
                const dayMeds = getDayMedications(day.date)
                const regularMeds = dayMeds.filter((m) => !m.schedule.asNeeded)
                const asNeededMeds = dayMeds.filter((m) => m.schedule.asNeeded)
                const totalDoses = regularMeds.reduce(
                  (sum, m) => sum + (m.schedule.times?.length || 0),
                  0
                )

                return (
                  <Grid size={12 / 7} key={idx}>
                    <Paper
                      elevation={
                        selectedDate?.toDateString() === day.date.toDateString()
                          ? 4
                          : 1
                      }
                      onClick={() => setSelectedDate(day.date)}
                      sx={{
                        minHeight: 100,
                        p: 1,
                        cursor: 'pointer',
                        // bgcolor: day.isCurrentMonth ? '#fff' : '#f5f5f5',
                        border: isToday(day.date)
                          ? '2px solid #2196f3'
                          : 'none',
                        borderColor:
                          selectedDate?.toDateString() ===
                          day.date.toDateString()
                            ? '#9c27b0'
                            : undefined,
                        '&:hover': { bgcolor: 'secondary.main' },
                        transition: 'all 0.2s',
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight="500"
                        sx={{ mb: 1 }}
                      >
                        {day.date.getDate()}
                      </Typography>

                      {day.isCurrentMonth && dayMeds.length > 0 && (
                        <Box>
                          {totalDoses > 0 && (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                mb: 0.5,
                              }}
                            >
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(100, (totalDoses / 6) * 100)}
                                sx={{ flex: 1, height: 6, borderRadius: 1 }}
                              />
                              <Typography variant="caption" fontWeight="600">
                                {totalDoses}
                              </Typography>
                            </Box>
                          )}
                          {asNeededMeds.length > 0 && (
                            <Chip
                              label={`PRN × ${asNeededMeds.length}`}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                              }}
                            />
                          )}
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                )
              })}
            </Grid>
          </Paper>

          <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
              Active Medications
            </Typography>
            <Grid container spacing={2}>
              {medications?.medicationStatements.map((med, idx) => {
                const daysLeft = getDaysUntilRunOut(med)
                return (
                  <Grid size={{ xs: 12, md: 6 }} key={idx}>
                    <Card variant="outlined" sx={{}}>
                      <CardContent>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'start',
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: getMedColor(idx),
                              mt: 0.5,
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight="600">
                              {med.medication}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {med.strength.amount}
                              {med.strength.unit} {med.form}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', mt: 1 }}
                            >
                              {med.timingSequence
                                .map((timing) => timing.rawText)
                                .join(', then ')}
                            </Typography>
                            {daysLeft && (
                              <Chip
                                label={`Runs out in ${daysLeft} days`}
                                size="small"
                                color="warning"
                                sx={{ mt: 1 }}
                              />
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Paper>

          <Dialog
            open={selectedDate !== null}
            onClose={() => setSelectedDate(null)}
            maxWidth="md"
            fullWidth
          >
            {selectedDate && (
              <>
                <DialogTitle>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Typography variant="h6" fontWeight="600">
                        {selectedDate.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Daily medication schedule
                      </Typography>
                    </Box>
                    <IconButton onClick={() => setSelectedDate(null)}>
                      <X />
                    </IconButton>
                  </Box>
                </DialogTitle>
                <DialogContent>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      pt: 1,
                    }}
                  >
                    {getDayMedications(selectedDate).map((med, idx) => (
                      <Card
                        key={idx}
                        variant="outlined"
                        sx={{ borderLeft: `4px solid ${getMedColor(idx)}` }}
                      >
                        <CardContent>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              mb: 2,
                            }}
                          >
                            <Box>
                              <Typography variant="h6" fontWeight="600">
                                {med.medication}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {med.brandName} ({med.genericName})
                              </Typography>
                            </Box>
                            <Chip
                              label={`${med.strength.amount}${med.strength.unit}`}
                              sx={{ bgcolor: `${getMedColor(idx)}20` }}
                            />
                          </Box>

                          {med.schedule.asNeeded ? (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                color: '#f57c00',
                              }}
                            >
                              <Clock size={16} />
                              <Typography variant="body2" fontWeight="500">
                                As needed - up to {med.schedule.max} times today
                              </Typography>
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                              }}
                            >
                              {med.schedule.times?.map((time, timeIdx) => (
                                <Paper
                                  key={timeIdx}
                                  variant="outlined"
                                  sx={{
                                    p: 1.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                  }}
                                >
                                  <Clock size={16} color="#2196f3" />
                                  <Typography fontWeight="600">
                                    {time}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Take 1 {med.form}
                                  </Typography>
                                </Paper>
                              ))}
                            </Box>
                          )}

                          <Divider sx={{ my: 2 }} />
                          <Typography variant="caption" color="text.secondary">
                            {med.timingSequence
                              .map((timing) => timing.rawText)
                              .join(', then ')}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </DialogContent>
              </>
            )}
          </Dialog>
        </Container>
      </Box>
    </Stack>
  )
}

export default MedicationTimeline
