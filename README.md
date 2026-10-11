# Tourista Rwanda — Frontend

React + TypeScript + Vite + Tailwind CSS frontend for **Tourista Rwanda**, a platform for sustainable and inclusive tourism in Rwanda. Brand colours: white and `#00628B`.

## Run it

```bash
npm install
cp .env.example .env     # optional
npm run dev              # http://localhost:5173
npm run build            # type-check + production build
```

## Connecting the Node API (`tourista-be`)

All screens load from the API. Run Mongo and `npm run dev` in `tourista-be`, then:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

`src/services/apiClient.ts` sends `Authorization: Bearer <token>`. CORS on the API should allow `http://localhost:5173`. Expected endpoints:

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login/`, `POST /auth/register/`, `GET /auth/me/`, `PATCH /auth/me/`, `POST /auth/password-reset/`, `POST /auth/password-reset/confirm/` (login/register return `{ token, user }`) |
| Locations | `GET /locations/`, `GET /locations/:id/`, `POST /locations/`, `POST /locations/bulk/` |
| Experiences | `GET /experiences/`, `GET /experiences/:id/` |
| Businesses | `GET /businesses/`, `GET /businesses/:id/`, `GET /businesses/?owner=:id`, `GET /businesses/:id/payout/`, `POST /businesses/`, `PATCH /businesses/:id/`, `POST /businesses/bulk/` |
| Reviews | `GET /reviews/?targetId=&userId=`, `POST /reviews/`, `DELETE /reviews/:id/` |
| Itineraries | `GET/POST /itineraries/`, `GET/PUT/DELETE /itineraries/:id/` |
| Bookings | `GET /bookings/availability/`, `GET /bookings/?userId=&businessIds=`, `GET /bookings/:id/`, `POST /bookings/`, `POST /bookings/:id/pay/`, `PATCH /bookings/:id/` (`{ status: 'Canceled' }`) |
| Users | `GET /users/`, `GET /users/:id/`, `POST /users/`, `POST /users/bulk/`, `DELETE /users/:id/` |
| Favorites | `GET /favorites/`, `POST /favorites/`, `DELETE /favorites/:itemId/` |
| Analytics | `GET /analytics/overview/` |
| Search | `GET /search/?q=&scope=` |

Response shapes are the TypeScript interfaces in `src/types/index.ts`.

## Structure

```
src/
├── components/   ui/ (Button, Input, Modal, Badge, Rating, states…), layout/ (Navbar, Footer, SearchBar, Sidebar),
│                 cards/, map/ (RwandaMap), itinerary/ (ItineraryTimeline), reviews/, charts/, FilterPanel
├── pages/        public pages, auth/, dashboard/ (tourist), business/, admin/
├── layouts/      MainLayout, DashboardLayout
├── routes/       AppRoutes, ProtectedRoute (role-based)
├── services/     API client and resource functions
├── context/      Auth, Favorites, Toast
├── hooks/        useAsync, useDebounce, useDocumentTitle
├── types/        domain interfaces
├── data/         Hero and placeholder image URLs
└── utils/
```

## Notes
- **Images:** replace the URLs in `src/data/images.ts` with licensed Rwanda photography. A branded placeholder shows if any image fails.
- **Map:** `RwandaMap` is a lightweight SVG map. To use Google Maps/Leaflet, build a component with the same props (`points`, `selectedId`, `onSelect`).
- **Payments** are simulated in the API (`PAYMENT_PROVIDER=simulated`). The UI still collects card / MTN / Airtel details the same way.
