import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  CssBaseline,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material'
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded'
import EventRoundedIcon from '@mui/icons-material/EventRounded'
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded'
import RadarRoundedIcon from '@mui/icons-material/RadarRounded'
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded'
import WorkRoundedIcon from '@mui/icons-material/WorkRounded'
import './App.css'

const API_URL = 'http://4.224.186.213/evaluation-service/notifications'
const STORAGE_KEY = 'campus-viewed-notifications'
const TOKEN_KEY = 'campus-notification-token'
const notificationTypes = ['All', 'Placement', 'Result', 'Event']
const typeWeight = {
  Placement: 3,
  Result: 2,
  Event: 1,
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2f5f8f' },
    secondary: { main: '#477a67' },
    warning: { main: '#c7772e' },
    success: { main: '#477a67' },
    background: { default: '#f7f8f6', paper: '#ffffff' },
    text: { primary: '#1f2933', secondary: '#64707d' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'Inter, Segoe UI, Roboto, Arial, sans-serif',
    h1: { fontWeight: 800, letterSpacing: 0 },
    h2: { fontWeight: 800, letterSpacing: 0 },
    button: { fontWeight: 800, textTransform: 'none' },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 16px 36px rgba(31, 41, 51, 0.08)',
          border: '1px solid rgba(100, 112, 125, 0.16)',
        },
      },
    },
  },
})

function normalizeNotification(item) {
  return {
    id: item.ID || item.id,
    type: item.Type || item.type,
    message: item.Message || item.message,
    timestamp: item.Timestamp || item.timestamp,
  }
}

function buildNotificationUrl({ limit, page, type }) {
  const url = new URL(API_URL)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('page', String(page))

  if (type && type !== 'All') {
    url.searchParams.set('notification_type', type)
  }

  return url.toString()
}

function getAuthHeaders() {
  const token = import.meta.env.VITE_NOTIFICATION_TOKEN || localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function priorityScore(notification) {
  return typeWeight[notification.type] || 0
}

function compareByPriority(a, b) {
  const scoreGap = priorityScore(b) - priorityScore(a)
  if (scoreGap !== 0) return scoreGap
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function App() {
  const [activePage, setActivePage] = useState('priority')
  const [notifications, setNotifications] = useState([])
  const [typeFilter, setTypeFilter] = useState('All')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [viewedIds, setViewedIds] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  })

  const loadNotifications = useCallback(async () => {
    const requestUrl =
      activePage === 'priority'
        ? buildNotificationUrl({ limit: 50, page: 1, type: 'All' })
        : buildNotificationUrl({ limit, page, type: typeFilter })

    try {
      setStatus('loading')
      setError('')

      const response = await fetch(requestUrl, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error(`Notification API returned ${response.status}`)
      }

      const data = await response.json()
      const list = Array.isArray(data.notifications)
        ? data.notifications.map(normalizeNotification)
        : []

      setNotifications(list)
      setStatus('success')
    } catch (err) {
      setError(err.message || 'Unable to load notifications right now')
      setStatus('error')
    }
  }, [activePage, limit, page, typeFilter])

  useEffect(() => {
    const firstLoad = setTimeout(loadNotifications, 0)
    const refreshTimer = setInterval(loadNotifications, 30000)
    return () => {
      clearTimeout(firstLoad)
      clearInterval(refreshTimer)
    }
  }, [loadNotifications])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(viewedIds))
  }, [viewedIds])

  const priorityNotifications = useMemo(() => {
    const unread = notifications.filter((item) => !viewedIds.includes(item.id))
    const viewed = notifications.filter((item) => viewedIds.includes(item.id))
    return [...unread.sort(compareByPriority), ...viewed.sort(compareByPriority)].slice(0, 10)
  }, [notifications, viewedIds])

  const allNotifications = useMemo(
    () => [...notifications].sort(compareByPriority),
    [notifications],
  )

  const displayedNotifications =
    activePage === 'priority' ? priorityNotifications : allNotifications

  const unreadCount = notifications.filter((item) => !viewedIds.includes(item.id)).length
  const placementCount = notifications.filter((item) => item.type === 'Placement').length
  const resultCount = notifications.filter((item) => item.type === 'Result').length
  const eventCount = notifications.filter((item) => item.type === 'Event').length
  const canGoNext = activePage === 'all' && notifications.length === limit

  function openPage(nextPage) {
    setActivePage(nextPage)
    setPage(1)
  }

  function markAsViewed(id) {
    setViewedIds((current) => (current.includes(id) ? current : [...current, id]))
  }

  function markAllAsViewed() {
    setViewedIds((current) => Array.from(new Set([...current, ...notifications.map((item) => item.id)])))
  }

  function handleTypeChange(value) {
    setTypeFilter(value)
    setPage(1)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="app-backdrop">
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{
            borderBottom: '1px solid rgba(100, 112, 125, 0.14)',
            backdropFilter: 'blur(18px)',
            background: 'rgba(255, 255, 255, 0.88)',
          }}
        >
          <Toolbar sx={{ gap: 2, justifyContent: 'space-between', py: 1 }}>
            <Stack direction="row" spacing={1.4} alignItems="center">
              <Box className="brand-mark">
                <RadarRoundedIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Campus Notifications
                </Typography>
                <Typography variant="subtitle1" fontWeight={850}>
                  Priority Desk
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} className="nav-buttons">
              <Button
                variant={activePage === 'priority' ? 'contained' : 'text'}
                onClick={() => openPage('priority')}
              >
                Priority Inbox
              </Button>
              <Button
                variant={activePage === 'all' ? 'contained' : 'text'}
                onClick={() => openPage('all')}
              >
                All Notifications
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
          <Box
            component="section"
            className="signal-hero"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 340px' },
              alignItems: 'stretch',
              gap: { xs: 2.5, md: 4 },
              mb: 2.5,
            }}
          >
            <Box className="hero-copy">
              <Chip
                color="secondary"
                label="Live campus updates"
                icon={<NotificationsActiveRoundedIcon />}
                sx={{ mb: 2, fontWeight: 800 }}
              />
              <Typography
                variant="h1"
                sx={{
                  maxWidth: 820,
                  fontSize: { xs: '2.15rem', sm: '3.1rem', lg: '4.25rem' },
                  lineHeight: 1.02,
                  mb: 2,
                }}
              >
                Campus updates, sorted before they become noise.
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 680, lineHeight: 1.55 }}>
                The inbox keeps hiring notices, result updates, and event reminders in one place,
                with the most useful messages kept near the top.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mt: 2.4 }}>
                <Chip label="Placement first" color="primary" variant="filled" />
                <Chip label="Results next" color="secondary" variant="outlined" />
                <Chip label="Newest wins ties" variant="outlined" />
              </Stack>
            </Box>

            <Card className="radio-card" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ height: '100%' }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.4 }}>
                  <span className="pulse-dot" />
                  <Typography variant="overline" fontWeight={900} color="secondary">
                    Live API Feed
                  </Typography>
                </Stack>
                <Stack spacing={1.2} sx={{ mb: 2 }}>
                  <SummaryLine label="Loaded" value={notifications.length} />
                  <SummaryLine label="New" value={unreadCount} />
                  <SummaryLine label="Hiring" value={placementCount} />
                </Stack>
                <Box className="priority-note">
                  <Typography variant="subtitle2" fontWeight={900}>
                    Priority rule
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Placement updates are ranked first, then results, then events. Newer messages
                    come first when the type is the same.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box
            component="section"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 2.5,
            }}
          >
            <MetricCard label="Placements" value={placementCount} icon={<WorkRoundedIcon />} color="#2f5f8f" />
            <MetricCard label="Results" value={resultCount} icon={<SchoolRoundedIcon />} color="#7a5b99" />
            <MetricCard label="Events" value={eventCount} icon={<EventRoundedIcon />} color="#c7772e" />
            <MetricCard label="Viewed" value={viewedIds.length} icon={<DoneAllRoundedIcon />} color="#477a67" />
          </Box>

          <Card component="section" className="desk-card" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', md: 'center' }}
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="overline" color="secondary" fontWeight={900}>
                    {activePage === 'priority' ? 'Unread and important first' : 'Filter the live feed'}
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.35rem' } }}>
                    {activePage === 'priority' ? 'Priority Inbox' : 'All Notifications'}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    {activePage === 'priority'
                      ? 'Showing the top 10 messages after applying the priority rule.'
                      : 'These controls call the API with limit, page, and notification type.'}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<DoneAllRoundedIcon />}
                  onClick={markAllAsViewed}
                  disabled={notifications.length === 0}
                >
                  Mark shown as viewed
                </Button>
              </Stack>

              {activePage === 'all' && (
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'stretch', md: 'center' }}
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 3,
                    border: '1px solid rgba(100, 112, 125, 0.14)',
                    backgroundColor: '#f7f9fb',
                  }}
                >
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={typeFilter}
                      label="Type"
                      onChange={(event) => handleTypeChange(event.target.value)}
                    >
                      {notificationTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Limit</InputLabel>
                    <Select
                      value={limit}
                      label="Limit"
                      onChange={(event) => {
                        setLimit(Number(event.target.value))
                        setPage(1)
                      }}
                    >
                      {[5, 10, 15, 20].map((value) => (
                        <MenuItem key={value} value={value}>
                          {value}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: { md: 'auto' } }}>
                    <Button variant="contained" disabled={page === 1} onClick={() => setPage(page - 1)}>
                      Prev
                    </Button>
                    <Chip label={`Page ${page}`} />
                    <Button variant="contained" disabled={!canGoNext} onClick={() => setPage(page + 1)}>
                      Next
                    </Button>
                  </Stack>
                </Stack>
              )}

              {status === 'loading' && <Alert severity="info">Loading notifications from the API...</Alert>}
              {status === 'error' && (
                <Alert severity="error">
                  Could not reach the notification API. {error}
                </Alert>
              )}
              {status === 'success' && displayedNotifications.length === 0 && (
                <Alert severity="warning">No notifications found for this view.</Alert>
              )}

              {status === 'success' && displayedNotifications.length > 0 && (
                <Stack spacing={1.4}>
                  {displayedNotifications.map((notification, index) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      index={activePage === 'priority' ? index + 1 : (page - 1) * limit + index + 1}
                      viewed={viewedIds.includes(notification.id)}
                      onView={() => markAsViewed(notification.id)}
                    />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

function SummaryLine({ label, value }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 74,
        px: 2,
        borderRadius: 3,
        backgroundColor: '#f4f7f5',
      }}
    >
      <Typography variant="body1" color="text.secondary" fontWeight={800}>
        {label}
      </Typography>
      <Typography variant="h4" color="primary" fontWeight={900}>
        {value}
      </Typography>
    </Box>
  )
}

function MetricCard({ label, value, icon, color }) {
  return (
    <Card className="metric-tile" sx={{ borderLeft: `5px solid ${color}`, borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight={900}>
              {value}
            </Typography>
            <Typography color="text.secondary" fontWeight={800}>
              {label}
            </Typography>
          </Box>
          <Box sx={{ color, display: 'grid', placeItems: 'center' }}>{icon}</Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

function NotificationCard({ notification, index, viewed, onView }) {
  const color = notification.type === 'Placement' ? 'primary' : notification.type === 'Result' ? 'secondary' : 'warning'

  return (
    <Card
      sx={{
        borderRadius: 3,
        borderColor: viewed ? 'rgba(100, 112, 125, 0.14)' : 'rgba(47, 95, 143, 0.34)',
        background: viewed
          ? '#ffffff'
          : 'linear-gradient(90deg, rgba(230, 239, 247, 0.9), #ffffff 48%)',
        opacity: viewed ? 0.72 : 1,
      }}
    >
      <CardContent
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '52px minmax(0, 1fr) auto' },
          gap: 2,
          alignItems: 'center',
        }}
      >
        <Box className="rank-badge">{index}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={notification.type} color={color} size="small" sx={{ fontWeight: 850 }} />
            <Chip
              label={viewed ? 'Viewed' : 'New'}
              variant={viewed ? 'outlined' : 'filled'}
              color={viewed ? 'default' : 'success'}
              size="small"
              sx={{ fontWeight: 850 }}
            />
          </Stack>
          <Typography variant="h6" sx={{ mt: 1, overflowWrap: 'anywhere', fontWeight: 850 }}>
            {notification.message}
          </Typography>
          <Typography color="text.secondary">{formatDate(notification.timestamp)}</Typography>
        </Box>
        <Button variant={viewed ? 'outlined' : 'contained'} disabled={viewed} onClick={onView}>
          {viewed ? 'Done' : 'View'}
        </Button>
      </CardContent>
    </Card>
  )
}

export default App
