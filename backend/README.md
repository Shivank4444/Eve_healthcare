# EVE Healthcare — Backend API

A backend service for diagnostic test discovery, appointment bookings, and simulated payments.

## Features

- User registration and login with JWT authentication
- Password hashing using `bcryptjs`
- Diagnostic centre and test management
- Centre-specific test pricing
- Authenticated booking creation, retrieval, and cancellation
- Mock payment processing with `SUCCESS` and `FAILED` outcomes
- Payment webhook endpoint with duplicate-event handling
- Request validation using Zod
- PostgreSQL database with Prisma ORM
- Centralized not-found and error-handling middleware

## Tech Stack

- **Runtime:** Node.js (ES modules)
- **Backend:** Express 5
- **Database:** PostgreSQL(Neon)
- **ORM:** Prisma 7
- **Authentication:** JSON Web Tokens (JWT), bcryptjs, HTTP-only cookies
- **Validation:** Zod

## Project Structure

```text
backend/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── generated/
│   └── prisma/                          # Generated Prisma client
├── src/
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── booking.controller.js
│   │   ├── centre.controller.js
│   │   ├── payment.controller.js
│   │   └── test.controller.js
│   ├── libs/
│   │   └── db.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── booking.routes.js
│   │   ├── centre.routes.js
│   │   ├── payment.routes.js
│   │   └── test.routes.js
│   └── index.js
├── .env.example
├── package.json
├── package-lock.json
└── prisma7.config.ts
```

## Prerequisites

- Node.js and npm
- A running PostgreSQL database (local PostgreSQL or a hosted provider such as Neon)
- Git (optional, for cloning the repository)

## Getting Started

### 1. Clone the repository and enter the backend directory

```bash
git clone <your-repository-url>
cd Eve_healthcare/backend
```

If you already have the project locally, simply open its `backend` directory.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the `backend` directory. You can use `.env.example` as a starting point.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
PORT=5000
JWT_SECRET="replace-with-a-long-random-secret"
```

- `DATABASE_URL`: PostgreSQL connection string.
- `PORT`: Port on which the API server runs.
- `JWT_SECRET`: Secret used to sign and verify JWTs. Use a strong, private value.


### 4. Set up the database and Prisma client

This project uses Prisma 7 with a PostgreSQL driver adapter. Make sure the database exists and the connection string is correct.

```bash
npx prisma generate
npx prisma migrate deploy
```

For local development when creating or changing migrations, use the migration workflow supported by your Prisma configuration. Do not run destructive database commands against production data.

### 5. Start the server

Development mode:

```bash
npm run dev
```

Start mode:

```bash
npm start
```

The API will run at:

```text
http://localhost:5000
```

Check the root endpoint or health endpoint:

```http
GET /
GET /health
```

Example health response:

```json
{
  "success": true,
  "message": "Server is healthy"
}
```

## API Base URL

```text
http://localhost:5000/api/v1
```


## API Endpoints

### Authentication

| Method | Endpoint | Authentication | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Register a user |
| `POST` | `/auth/login` | No | Log in |
| `POST` | `/auth/logout` | Yes | Log out and clear the auth cookie |
| `GET` | `/auth/check` | Yes | Check the current authenticated user |

Register example:

```http
POST /api/v1/auth/register
Content-Type: application/json
```

```json
{
  "name": "Aarav Sharma",
  "email": "aarav@example.com",
  "password": "strongpass123"
}
```

Login example:

```json
{
  "email": "aarav@example.com",
  "password": "strongpass123"
}
```

The register and login endpoints set the `jwt` cookie on successful authentication.

### Diagnostic Centres

| Method | Endpoint | Authentication | Description |
|---|---|---|---|
| `GET` | `/centres` | No | List centres and their offered tests |
| `GET` | `/centres/:id` | No | Get a centre by ID |
| `POST` | `/centres` | Yes | Create a centre |
| `PATCH` | `/centres/:id` | Yes | Update a centre |
| `DELETE` | `/centres/:id` | Yes | Delete a centre |
| `POST` | `/centres/:centreId/tests` | Yes | Add a test and price to a centre |
| `DELETE` | `/centres/:centreId/tests/:testId` | Yes | Remove a test from a centre |

Create-centre example:

```json
{
  "name": "EVE Diagnostics",
  "location": "Noida, Uttar Pradesh"
}
```

Add a test to a centre:

```json
{
  "testId": 1,
  "price": 799
}
```

The `centreTestId` used when creating a booking refers to the centre-test association, not the diagnostic test's own ID.

### Diagnostic Tests

| Method | Endpoint | Authentication | Description |
|---|---|---|---|
| `GET` | `/tests` | No | List tests |
| `GET` | `/tests/:id` | No | Get a test by ID |
| `POST` | `/tests` | Yes | Create a test |
| `PATCH` | `/tests/:id` | Yes | Update a test |
| `DELETE` | `/tests/:id` | Yes | Delete a test |

Create-test example:

```json
{
  "name": "Complete Blood Count",
  "description": "A blood test that measures different components of blood."
}
```

### Bookings

All booking endpoints require authentication.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/bookings` | Create a booking |
| `GET` | `/bookings` | List the authenticated user's bookings |
| `GET` | `/bookings/:id` | Get a booking owned by the user |
| `POST` | `/bookings/:id/cancel` | Cancel a booking |

Create-booking example:

```json
{
  "centreTestId": 1,
  "appointmentAt": "2027-01-15T10:30:00.000Z"
}
```

The user ID is taken from the authenticated session. The server obtains the amount from the selected centre-test record rather than trusting a client-supplied price. New bookings start with the `PENDING` status. Appointment times must be in the future.

Booking statuses:

- `PENDING`
- `CONFIRMED`
- `FAILED`
- `CANCELLED`

### Payments

| Method | Endpoint | Authentication | Description |
|---|---|---|---|
| `POST` | `/payments` | Yes | Simulate payment for a booking |
| `GET` | `/payments/:id` | Yes | Retrieve a payment owned by the user |
| `POST` | `/payments/webhook` | No | Receive a simulated payment-status event |

Create-payment example:

```http
POST /api/v1/payments
Content-Type: application/json
```

```json
{
  "bookingId": 1,
  "outcome": "SUCCESS"
}
```

`outcome` is optional. When omitted, the current implementation randomly simulates success or failure. Supplying `SUCCESS` or `FAILED` is useful for predictable manual testing.

The payment endpoint creates a payment record and updates the related booking:
- `SUCCESS` updates the booking to `CONFIRMED`.
- `FAILED` updates the booking to `FAILED`.

Webhook example:

```http
POST /api/v1/payments/webhook
Content-Type: application/json
```

```json
{
  "eventId": "evt_demo_001",
  "bookingId": 1,
  "transactionId": "txn_demo_001",
  "status": "SUCCESS"
}
```

The webhook accepts an event ID, booking ID, transaction ID, and payment status. The implementation records event IDs uniquely to help prevent duplicate processing.

**Webhook limitation:** The current endpoint does not verify a provider signature or shared secret. Treat it as a local simulated endpoint only; do not expose it as a trusted production payment webhook without adding authentication and stronger event/transaction consistency checks.

## Database Design

The Prisma schema defines the following models:

| Model | Purpose |
|---|---|
| `User` | Stores user identity and hashed password |
| `DiagnosticCentre` | Stores centre name and location |
| `DiagnosticTest` | Stores test name and optional description |
| `CentreTest` | Connects centres to tests and stores centre-specific price |
| `Booking` | Stores user booking, appointment, amount, and status |
| `Payment` | Stores payment transaction, amount, and status |
| `WebhookEvent` | Stores webhook event IDs and processing information |

### Relationships

- A `User` can have many `Booking` records.
- A `DiagnosticCentre` can offer many tests through `CentreTest`.
- A `DiagnosticTest` can be offered by many centres through `CentreTest`.
- A `CentreTest` can be referenced by many bookings.
- A `Booking` can have multiple payment records.
- `WebhookEvent.eventId` is unique.
- The pair `(centreId, testId)` is unique in `CentreTest`.
- `Payment.transactionId` is unique.

The many-to-many relationship between centres and tests is represented explicitly by `CentreTest` because the price depends on both the centre and the test.

## Validation and Error Handling

Request payloads and route IDs are validated using Zod. The API handles common errors such as invalid input, missing resources, duplicate records, unauthorized access, and invalid booking/payment operations.

## Suggested End-to-End API Flow

1. Register a user using `/auth/register`.
2. Log in using `/auth/login` and retain the `jwt` cookie.
3. Retrieve diagnostic centres using `GET /centres`.
4. Retrieve tests using `GET /tests` and identify a centre-test association.
5. Create a booking using `POST /bookings`.
6. Simulate payment using `POST /payments`.
7. Retrieve the booking using `GET /bookings/:id` and confirm its status.
8. Send a webhook event to `/payments/webhook` and verify the event handling behavior.

For manual testing, use separate requests for successful payments, failed payments, repeated webhook event IDs, invalid IDs, and attempts to access another user's booking.

## Assumptions

- One booking is for one test offered by one diagnostic centre.
- The price is determined by the centre-test association at booking time.
- Appointment date and time are submitted as a date-time value.
- Payments are simulated and do not move real money.
- A successful payment confirms the booking; a failed payment marks it as failed.
- JWT authentication is stored in an HTTP-only cookie.
- Centre and test write routes currently require authentication, but the project does not define separate administrator roles.

## Future Improvements

- Add role-based access control for centre/test management.
- Verify webhook signatures or shared secrets.
- Strengthen payment idempotency and state-transition rules, including concurrent payment attempts and conflicting webhook events.
- Add rate limiting and security hardening.
- Add Docker and docker-compose for reproducible local setup.



