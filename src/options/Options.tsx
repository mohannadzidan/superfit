import { Container, Typography, Box } from '@mui/material'

export const Options = () => {
  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          SuperFit Options
        </Typography>
        <Typography variant="body1">
          Configuration settings will go here.
        </Typography>
      </Box>
    </Container>
  )
}

export default Options
