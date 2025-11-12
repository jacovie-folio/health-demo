import { CssBaseline, ThemeProvider } from '@mui/material'
import MedicationTimeline from './MedicationTimeline/MedicationTimeline'
import { baseTheme } from './theme/theme'

function App() {
  return (
    <ThemeProvider theme={baseTheme}>
      <CssBaseline />
      <MedicationTimeline />
    </ThemeProvider>
  )
}

export default App
