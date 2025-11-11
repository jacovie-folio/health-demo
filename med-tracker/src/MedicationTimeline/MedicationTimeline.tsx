import {
  AppBar,
  Avatar,
  Box,
  Button,
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
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import {
  CalendarDays,
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

// const _sampleMedications = {
//   medicationStatements: [
//     {
//       medication: 'Lisinopril',
//       brandName: 'Zestril',
//       genericName: 'Lisinopril',
//       rxnormCode: '104377',
//       strength: { amount: 10, unit: 'mg' },
//       form: 'tablet',
//       timing: {
//         frequency: 1,
//         period: 1,
//         periodUnit: 'day',
//         duration: 30,
//         durationUnit: 'days',
//         count: 30,
//         isAsNeeded: false,
//         rawText: 'Take 1 tablet by mouth once daily',
//       },
//       sourceText: 'Lisinopril 10mg - Take 1 tablet daily',
//     },
//     {
//       medication: 'Metformin',
//       brandName: 'Glucophage',
//       genericName: 'Metformin',
//       rxnormCode: '6809',
//       strength: { amount: 500, unit: 'mg' },
//       form: 'tablet',
//       timing: {
//         frequency: 2,
//         period: 1,
//         periodUnit: 'day',
//         duration: 30,
//         durationUnit: 'days',
//         count: 60,
//         isAsNeeded: false,
//         rawText: 'Take 1 tablet by mouth twice daily with meals',
//       },
//       sourceText: 'Metformin 500mg - Take twice daily with meals',
//     },
//     {
//       medication: 'Ibuprofen',
//       brandName: 'Advil',
//       genericName: 'Ibuprofen',
//       rxnormCode: '5640',
//       strength: { amount: 200, unit: 'mg' },
//       form: 'tablet',
//       timing: {
//         frequency: 1,
//         frequencyMax: 3,
//         period: 1,
//         periodUnit: 'day',
//         isAsNeeded: true,
//         rawText: 'Take 1 tablet as needed for pain, up to 3 times daily',
//       },
//       sourceText: 'Ibuprofen 200mg - As needed for pain',
//     },
//     {
//       medication: 'Atorvastatin',
//       brandName: 'Lipitor',
//       genericName: 'Atorvastatin',
//       rxnormCode: '83367',
//       strength: { amount: 20, unit: 'mg' },
//       form: 'tablet',
//       timing: {
//         frequency: 1,
//         period: 1,
//         periodUnit: 'day',
//         duration: 90,
//         durationUnit: 'days',
//         count: 90,
//         isAsNeeded: false,
//         rawText: 'Take 1 tablet by mouth at bedtime',
//       },
//       sourceText: 'Atorvastatin 20mg - Take at bedtime',
//     },
//   ],
// }

const MedicationTimeline: React.FC = () => {
  const [showCalendar, setShowCalendar] = useState<boolean>(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Hi! I can help you manage your medication schedule. What would you like to know?',
    },
  ])
  const [inputValue, setInputValue] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  const { isLoading, sendPrompt, medications } = useLLM()

  // Sample medication data

  const handleSendMessage = (): void => {
    if (!inputValue.trim()) return

    setMessages((prev) => [...prev, { role: 'user', text: inputValue }])
    setInputValue('')
    sendPrompt(inputValue)
      .then((response) => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text:
              response?.data.freeTextExplanationOfMissingData ||
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
  const getMedicationSchedule = (
    med: MedicationStatement,
    date: Date
  ): MedicationSchedule | null => {
    const startDate = new Date(currentDate)
    startDate.setHours(0, 0, 0, 0)

    const daysDiff = Math.floor(
      (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (med.timing.duration && daysDiff >= med.timing.duration) {
      return null
    }

    const frequency = med.timing.frequency || 1
    const times: string[] = []

    if (med.timing.isAsNeeded) {
      return { asNeeded: true, max: med.timing.frequencyMax || frequency }
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

    return { times }
  }

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
    [getMedicationSchedule]
  )

  const getDaysUntilRunOut = (med: MedicationStatement): number | null => {
    if (!med.timing.duration) return null
    return med.timing.duration
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

  if (!showCalendar) {
    return (
      <Box
        sx={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#f5f5f5',
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
                      elevation={1}
                      sx={{
                        p: 2,
                        bgcolor: msg.role === 'user' ? '#e3f2fd' : '#fff',
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
                        bgcolor: '#fff',
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
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<CalendarDays size={20} />}
                onClick={() => setShowCalendar(true)}
                fullWidth
                size="large"
              >
                View Medication Calendar
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Ask about your medications..."
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
                sx={{
                  bgcolor: '#2196f3',
                  color: 'white',
                  '&:hover': { bgcolor: '#1976d2' },
                }}
              >
                <Send size={20} />
              </IconButton>
            </Box>
          </Container>
        </Paper>
      </Box>
    )
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
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', p: 3 }}>
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
              <Avatar sx={{ bgcolor: '#2196f3', width: 56, height: 56 }}>
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
            <Button
              variant="outlined"
              onClick={() => setShowCalendar(false)}
              startIcon={<ChevronLeft size={20} />}
            >
              Back to Chat
            </Button>
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
                      bgcolor: day.isCurrentMonth ? '#fff' : '#f5f5f5',
                      border: isToday(day.date) ? '2px solid #2196f3' : 'none',
                      borderColor:
                        selectedDate?.toDateString() === day.date.toDateString()
                          ? '#9c27b0'
                          : undefined,
                      '&:hover': { bgcolor: '#fafafa' },
                      transition: 'all 0.2s',
                    }}
                  >
                    <Typography variant="body2" fontWeight="500" sx={{ mb: 1 }}>
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
                              bgcolor: '#fff3e0',
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
                  <Card variant="outlined" sx={{ bgcolor: '#fafafa' }}>
                    <CardContent>
                      <Box
                        sx={{ display: 'flex', alignItems: 'start', gap: 1.5 }}
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
                            {med.timing.rawText}
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
                            <Typography variant="body2" color="text.secondary">
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
                                <Typography fontWeight="600">{time}</Typography>
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
                          {med.timing.rawText}
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
  )
}

export default MedicationTimeline
