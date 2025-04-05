// src/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    typography: {
        fontFamily: "'Noto Sans SC', 'Roboto', 'Arial', sans-serif", // Chinese first, then Latin fallbacks
        h4: {
          fontWeight: 700,
        },
        body2: {
          fontWeight: 400,
        },
      },
});

export default theme;
