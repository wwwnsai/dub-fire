# 🔥 Fire Detection System - Complete Flow Explanation

## 📋 Overview

This system uses an **event-driven architecture** to manage fire status changes, email notifications, and map updates. All components communicate through a central EventBus.

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ACTION (Test Button)                    │
│              FireAlertTest Component                            │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│             1. UPDATE FIRE STATUS                                │
│         FireStatusContext.updateFireLocation()                  │
│                                                                 │
│  • Updates fireLocations state                                  │
│  • Changes severity: "non-fire" → "high" (or vice versa)       │
│  • Triggers useEffect that watches fireLocations               │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│             2. DETECT STATUS CHANGE                             │
│         FireStatusContext useEffect (lines 108-136)             │
│                                                                 │
│  • Compares current severity with previous severity             │
│  • If changed: emits "fire:status-changed" event               │
│  • Event payload: { fromStatus, toStatus, location, ... }      │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│             3. EVENT BUS BROADCAST                              │
│         eventBus.emit("fire:status-changed", payload)          │
│                                                                 │
│  • Central event hub broadcasts to ALL subscribers              │
│  • Multiple components can listen simultaneously               │
└────────────┬───────────────────────┬───────────────────────────┘
             │                       │
             ▼                       ▼
    ┌─────────────────┐    ┌──────────────────────┐
    │  4A. EMAIL      │    │  4B. MAP UPDATE      │
    │  SERVICE        │    │  SERVICE             │
    └────────┬────────┘    └──────────┬───────────┘
             │                        │
             ▼                        ▼
┌────────────────────────┐  ┌─────────────────────────────┐
│ EmailEventListener     │  │ Map Component               │
│ (emailEventListener.ts)│  │ (map/page.tsx)              │
│                        │  │                            │
│ • Listens to event     │  │ • Listens to event         │
│ • Calls API            │  │ • Updates map markers      │
│ • Sends emails         │  │ • Re-renders map            │
└────────┬───────────────┘  └─────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│             5. SAVE TO JSON FILE                                 │
│         FireStatusContext useEffect (lines 83-102)             │
│                                                                 │
│  • Automatically saves fireLocations to fire-status.json       │
│  • Persists state across app restarts                          │
│  • API: POST /api/fire-status                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📧 Email Service Flow

### Step-by-Step Email Notification Process:

```
1. STATUS CHANGE DETECTED
   └─> FireStatusContext detects severity change
       └─> Emits "fire:status-changed" event

2. EMAIL EVENT LISTENER RECEIVES EVENT
   └─> emailEventListener.ts (initializeEmailEventListener)
       └─> Checks if transition is significant (non-fire ↔ fire)
           └─> If yes, proceeds to step 3

3. CALL EMAIL API
   └─> POST /api/fire-alert
       └─> Body: { fromStatus, toStatus, location, coordinates }

4. API ROUTE PROCESSES REQUEST
   └─> /api/fire-alert/route.ts
       └─> Calls sendStatusChangeNotification()

5. EMAIL SERVICE SENDS EMAILS
   └─> emailService.ts
       ├─> getActiveSubscriptions() - Gets all users with email_noti=true
       ├─> For each subscriber:
       │   ├─> deliverEmail() - Sends via SendGrid/Resend
       │   └─> Updates last_notified_at in database
       └─> Returns success/failure

6. EMAIL DELIVERY
   └─> deliverEmail() function
       ├─> Uses SendGrid (if SENDGRID_API_KEY set)
       └─> Or Resend (if RESEND_API_KEY set)
```

### Email Service Components:

**File: `src/lib/emailService.ts`**
- `getActiveSubscriptions()` - Fetches users from Supabase profiles table
- `sendStatusChangeNotification()` - Main function that sends emails
- `deliverEmail()` - Low-level email sending (SendGrid/Resend)
- `emailTemplates` - HTML email templates

**File: `src/lib/emailEventListener.ts`**
- `initializeEmailEventListener()` - Sets up event listener
- Listens to `fire:status-changed` events
- Automatically calls email API when status changes

**File: `src/app/api/fire-alert/route.ts`**
- API endpoint that receives email requests
- Calls emailService functions
- Returns success/error responses

---

## 🗺️ Map Service Flow

### Step-by-Step Map Update Process:

```
1. STATUS CHANGE DETECTED
   └─> FireStatusContext detects severity change
       └─> Emits "fire:status-changed" event

2. MAP COMPONENT RECEIVES EVENT
   └─> map/page.tsx (useEffect lines 37-62)
       └─> Listens to "fire:status-changed" event
           └─> Updates local state/logs event

3. MAP RE-RENDERS
   └─> LocationMap component receives updated fireLocations
       └─> Updates fire markers on map
           └─> Shows fire icons at updated locations
```

### Map Service Components:

**File: `src/app/map/page.tsx`**
- Uses `useFireStatus()` hook to get fireLocations
- Listens to `fire:status-changed` events
- Passes fireLocations to LocationMap component

**File: `src/component/LocationMap.tsx`**
- Renders map with Leaflet
- Displays fire markers based on fireLocations prop
- Automatically updates when fireLocations change

---

## 🔄 Status Change Flow (Detailed)

### When User Clicks Test Button:

```
1. FireAlertTest Component
   └─> User clicks "Test Fire Alert" button
       └─> Calls triggerFireAlert()

2. Update Fire Status
   └─> Uses useFireStatus() hook
       └─> Calls updateFireLocation()
           └─> Updates severity: "non-fire" ↔ "high"
           └─> Updates name: "Fire Detected" ↔ "Fire Cleared"

3. FireStatusContext State Update
   └─> setFireLocations() updates state
       └─> Triggers useEffect (lines 108-136)

4. Status Change Detection
   └─> useEffect compares:
       ├─> previousSeveritiesRef.current[locationId] (old)
       └─> severityToFireStatus(location.severity) (new)
       
   └─> If different:
       └─> Emits "fire:status-changed" event
           └─> Payload: { fromStatus, toStatus, location }

5. Event Bus Broadcast
   └─> eventBus.emit("fire:status-changed", payload)
       └─> All listeners receive event simultaneously:
           ├─> EmailEventListener (sends emails)
           ├─> Map Component (updates map)
           ├─> Layout Component (shows notification badge)
           └─> Any other listeners

6. JSON Persistence
   └─> Separate useEffect (lines 83-102)
       └─> Watches fireLocations changes
           └─> Saves to /api/fire-status (POST)
               └─> Writes to public/fire-status.json
```

---

## 📦 Key Components

### 1. FireStatusContext (`src/lib/fireStatusContext.tsx`)
**Purpose:** Central state management for fire locations

**Key Functions:**
- `updateFireLocation()` - Updates a specific location's status
- `getCurrentFireStatus()` - Returns "safe" or "alert"
- Auto-loads from JSON on mount
- Auto-saves to JSON on changes
- Emits events when status changes

**State:**
- `fireLocations` - Array of FireLocation objects
- `previousSeveritiesRef` - Tracks previous states to detect changes

### 2. EventBus (`src/lib/eventBus.ts`)
**Purpose:** Central event hub (Publish-Subscribe pattern)

**Methods:**
- `on(event, callback)` - Subscribe to events
- `off(event, callback)` - Unsubscribe from events
- `emit(event, payload)` - Broadcast event to all subscribers

**Events:**
- `fire:status-changed` - When fire severity changes
- `fire:alert` - Direct fire alert (from test button)
- `fire:location-added` - New location added
- `fire:location-updated` - Location updated
- `fire:location-removed` - Location removed

### 3. Email Service (`src/lib/emailService.ts`)
**Purpose:** Handles email notifications

**Key Functions:**
- `sendStatusChangeNotification()` - Sends emails for status changes
- `getActiveSubscriptions()` - Gets users from database
- `deliverEmail()` - Sends email via SendGrid/Resend

**Email Providers:**
- SendGrid (if SENDGRID_API_KEY set)
- Resend (if RESEND_API_KEY set)

### 4. Email Event Listener (`src/lib/emailEventListener.ts`)
**Purpose:** Automatically sends emails when status changes

**Flow:**
- Listens to `fire:status-changed` events
- Calls `/api/fire-alert` API
- API sends emails to all subscribers

### 5. Map Component (`src/app/map/page.tsx`)
**Purpose:** Displays map with fire locations

**Flow:**
- Uses `useFireStatus()` to get fireLocations
- Listens to `fire:status-changed` events
- Passes fireLocations to LocationMap component
- Map automatically updates when fireLocations change

---

## 🔗 Data Flow Summary

```
User Action
    ↓
FireStatusContext (State Update)
    ↓
EventBus (Event Broadcast)
    ├─→ EmailEventListener → API → EmailService → Send Emails
    ├─→ Map Component → Update Map Markers
    ├─→ Layout Component → Show Notification Badge
    └─→ Any Other Listeners
    ↓
JSON Persistence (Automatic Save)
    ↓
fire-status.json (Persistent Storage)
```

---

## 🎯 Key Design Patterns

1. **Event-Driven Architecture** - Components communicate via events, not direct calls
2. **Single Source of Truth** - FireStatusContext is the only place fire status is stored
3. **Separation of Concerns** - Email, Map, and UI are separate, decoupled components
4. **Automatic Persistence** - Status automatically saves to JSON file
5. **Reactive Updates** - All components update automatically when status changes

---

## 📝 Example: Complete Flow When Toggling Fire Status

1. **User clicks "Set to Fire" button** in FireAlertTest component
2. **updateFireLocation()** called → Changes severity from "non-fire" to "high"
3. **fireLocations state updates** → Triggers useEffect
4. **Status change detected** → previousStatus="non-fire", currentStatus="fire"
5. **Event emitted** → `fire:status-changed` with payload
6. **EmailEventListener receives event** → Calls `/api/fire-alert` → Sends emails
7. **Map component receives event** → Updates map markers
8. **Layout component receives event** → Shows notification badge
9. **JSON file updated** → fire-status.json saved with new status
10. **UI updates** → All components reflect new fire status

---

## 🔍 Debugging Tips

- Check browser console for event logs
- Check server console for email sending logs
- Check `public/fire-status.json` for persisted state
- Use React DevTools to inspect FireStatusContext state
- Check EventBus listeners: `eventBus.listeners` (in console)

