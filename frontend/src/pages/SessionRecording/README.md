# Session Recordings Page

A minimal, focused page that displays session recordings with just session names and play buttons.

## Features

- **Simple Session List**: Clean table showing only session names and play buttons
- **Direct Access**: Click play button or row to open session recording
- **Minimal UI**: No filters, search, or extra information - just the essentials
- **Responsive Design**: Adapts to different screen sizes
- **Dark/Light Mode Support**: Follows the app's theme system

## Components

### Main Component

- `index.tsx` - Main session recordings page component

### Supporting Files

- `types.ts` - TypeScript interfaces for session recording data
- `styles.scss` - Minimal styling with theme support
- `README.md` - This documentation file

## Data Structure

Each session recording includes:

- Basic identification (ID, session ID)
- User information (name, user agent)
- Timing details (start time, duration)
- Geographic data (country, city)
- Technical details (device, browser, OS)
- Status information (completion status, error flags)
- Recording URL for playback

## Table Columns

1. **Session Name** - Session identifier
2. **Actions** - Play button to open session recording

## Usage

The page automatically loads with mock data for demonstration. In production, replace the mock data with actual API calls to fetch session recordings.

### Table Interaction

- Click on any row to open the session recording
- Use the play button in the Actions column for quick access
- Sort by session name by clicking the column header
- Navigate through pages using the pagination controls

## Styling

The page uses CSS custom properties for theming:

- Dark mode: Uses `--bg-ink-*` and `--bg-slate-*` color variables
- Light mode: Uses `--bg-vanilla-*` color variables
- Accent colors: Uses `--bg-sakura-*` for primary actions and highlights

## Responsive Behavior

- **Desktop**: Clean table layout with proper spacing
- **Tablet**: Responsive table with maintained readability
- **Mobile**: Single-column layout with touch-friendly buttons

## Design Philosophy

The UI follows an extremely minimalist approach:

- Only essential information displayed
- No visual clutter or unnecessary features
- Focus on quick access to session recordings
- Clean, readable table layout
- Consistent with the app's design system

## Future Enhancements

- Session count display
- Basic sorting options
- Export functionality
- Real-time updates for active sessions
