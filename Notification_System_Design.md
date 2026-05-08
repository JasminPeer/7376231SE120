# Stage 1

## Priority logic

The frontend ranks campus notifications with a deterministic priority score:

- Placement: highest priority
- Result: medium priority
- Event: lowest priority

When two notifications have the same type, the newer notification is shown first. This keeps the top 10 inbox useful even when new notifications continue arriving.

## Frontend approach

The React application fetches notifications from:

`http://4.224.186.213/evaluation-service/notifications`

The app refreshes the list every 30 seconds, sorts the data in memory, and displays the highest priority unread and recent items in the Priority Inbox. The All Notifications page supports notification type filtering, page selection, and adjustable result limits.

Viewed notification IDs are stored in `localStorage`, so users can distinguish new and already viewed updates without needing a separate database.

## Efficiency

For the expected notification volume, sorting the current response and slicing the top 10 is simple and reliable. If the dataset grows heavily, this can be changed to a bounded priority queue so only the top `n` notifications are retained while streaming through the response.
