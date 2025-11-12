export const getMedColor = (index: number): string => {
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
