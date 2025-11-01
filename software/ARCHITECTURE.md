# Event-Driven Architecture

This application uses an **event-driven architecture** for real-time fire detection and notifications.

## 📡 Event Flow

### 1. **Fire Status Context** (`fireStatusContext.tsx`)
- Emits events when fire locations change:
  - `fire:status-changed` - When fire severity changes (non-fire ↔ fire)
  - `fire:location-added` - When a new fire location is added
  - `fire:location-updated` - When a fire location is updated
  - `fire:location-removed` - When a fire location is removed
  - `fire:all-cleared` - When all fire locations are cleared

### 2. **Email Event Listener** (`emailEventListener.ts`)
- **Automatically subscribes** to `fire:status-changed` events
- **Sends email notifications** when fire status transitions occur
- Decoupled from UI components - works globally

### 3. **Map Component** (`map/page.tsx`)
- **Listens** to `fire:status-changed` events
- **Updates map markers** reactively when events are received
- No polling needed - updates happen instantly

### 4. **Event Bus** (`eventBus.ts`)
- Central event hub using publish-subscribe pattern
- Supports: `on()`, `off()`, `emit()` methods
- Type-safe event payloads

## 🔄 How It Works

```
Fire Status Changes
    ↓
FireStatusContext emits event
    ↓
EventBus broadcasts to all subscribers
    ↓
┌─────────────────────┬──────────────────────┐
│                     │                      │
EmailEventListener    Map Component          Other Components
(listens & sends)     (listens & updates)   (can listen too)
```

## ✨ Benefits

1. **Decoupled Components**: Email service doesn't know about map, map doesn't know about email
2. **Real-time Updates**: Instant notifications without polling
3. **Scalable**: Easy to add new listeners without modifying existing code
4. **Testable**: Each component can be tested independently
5. **Maintainable**: Clear separation of concerns

## 🚀 Usage Example

### Listening to Events
```typescript
import { eventBus } from "@/lib/eventBus";

// Subscribe
eventBus.on("fire:status-changed", (event) => {
  console.log("Fire status changed!", event);
});

// Unsubscribe
eventBus.off("fire:status-changed", handler);
```

### Emitting Events
```typescript
eventBus.emit("fire:status-changed", {
  locationId: "123",
  fromStatus: "non-fire",
  toStatus: "fire",
  location: { lat: 25.2048, lng: 55.2708 }
});
```

## 📧 Email Notification Flow

1. User/System updates fire location in `FireStatusContext`
2. Context detects severity change (non-fire → fire)
3. Context emits `fire:status-changed` event
4. `EmailEventListenerProvider` (initialized globally) receives event
5. Email service automatically sends notifications to all subscribers
6. No manual API calls needed - it's automatic!

## 🗺️ Map Update Flow

1. Fire location changes in `FireStatusContext`
2. Context emits `fire:status-changed` event
3. Map component listens to event
4. Map automatically re-renders with new fire locations
5. No polling or manual refresh needed

## 🔍 Event Types

| Event | Payload | Trigger |
|-------|---------|---------|
| `fire:status-changed` | `{ locationId, fromStatus, toStatus, location }` | Severity changes |
| `fire:location-added` | `{ location }` | New location added |
| `fire:location-updated` | `{ locationId, updates }` | Location updated |
| `fire:location-removed` | `{ locationId }` | Location removed |
| `fire:all-cleared` | `{}` | All locations cleared |

## 🛠️ Adding New Listeners

To add a new listener (e.g., SMS notifications):

1. Create a new listener service in `src/lib/`
2. Subscribe to events in `useEffect`
3. Add initialization in `EmailEventListenerProvider` or create a new provider

Example:
```typescript
// src/lib/smsEventListener.ts
eventBus.on("fire:status-changed", async (event) => {
  if (event.toStatus === "fire") {
    await sendSMS(event.location);
  }
});
```
