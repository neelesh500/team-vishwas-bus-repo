# REST API Specifications

This document outlines the REST API architecture for the **Vrindavan Bus Navigation System**. All requests and responses are in JSON format.

---

## 1. Authentication Endpoints

### Post User Registration
* **Endpoint:** `POST /api/auth/register`
* **Description:** Creates a new passenger, driver, or admin account.
* **Request Body:**
```json
{
  "full_name": "Radha Sharma",
  "email": "radha@example.com",
  "phone_number": "+919876543210",
  "password": "SecurePassword123",
  "role": "Passenger"
}
```
* **Response (201 Created):**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "user_id": 15
}
```

### Post User Login
* **Endpoint:** `POST /api/auth/login`
* **Description:** Authenticates user and returns a JWT token.
* **Request Body:**
```json
{
  "email": "radha@example.com",
  "password": "SecurePassword123"
}
```
* **Response (200 OK):**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 15,
    "full_name": "Radha Sharma",
    "role": "Passenger"
  }
}
```

---

## 2. Bus Tracking & Navigation Endpoints

### Get All Bus Stops
* **Endpoint:** `GET /api/stops`
* **Description:** Retrieves list of all designated bus stops in Vrindavan.
* **Response (200 OK):**
```json
[
  {
    "stop_id": 1,
    "stop_name": "Prem Mandir",
    "latitude": 27.572111,
    "longitude": 77.681144,
    "address": "Bhakti Dham, Vrindavan"
  },
  {
    "stop_id": 2,
    "stop_name": "Banke Bihari Mandir",
    "latitude": 27.578500,
    "longitude": 77.698300,
    "address": "Bihari Pura, Vrindavan"
  }
]
```

### Search Routes
* **Endpoint:** `GET /api/routes/search?source_id={stop_id}&destination_id={stop_id}`
* **Description:** Find routes connecting the selected source and destination.
* **Response (200 OK):**
```json
[
  {
    "route_id": 3,
    "route_name": "Prem Mandir to Banke Bihari Express",
    "distance_km": 3.8,
    "estimated_duration": "00:15:00",
    "stops_count": 5
  }
]
```

### Get Live Bus Locations
* **Endpoint:** `GET /api/buses/live`
* **Description:** Returns the current coordinates of all active buses.
* **Response (200 OK):**
```json
[
  {
    "bus_id": 101,
    "bus_number": "UP-85-AT-4321",
    "bus_name": "Vrindavan Parikrama Express",
    "latitude": 27.573500,
    "longitude": 77.683500,
    "speed": 32.5,
    "heading": 120.0,
    "status": "Active",
    "last_updated": "2026-06-11T20:50:00Z"
  }
]
```

### Update Bus GPS Location (Driver Endpoint)
* **Endpoint:** `POST /api/buses/location`
* **Description:** Invoked by the Driver app to update the live GPS telemetry of their assigned bus.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:**
```json
{
  "bus_id": 101,
  "latitude": 27.574000,
  "longitude": 77.684100,
  "speed": 30.0,
  "heading": 122.5
}
```
* **Response (200 OK):**
```json
{
  "status": "success",
  "message": "Location updated successfully"
}
```

---

## 3. Ticketing & Payment Endpoints

### Book Ticket
* **Endpoint:** `POST /api/bookings`
* **Description:** Initiates a ticket booking for a user.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:**
```json
{
  "bus_id": 101,
  "source_stop_id": 1,
  "destination_stop_id": 2,
  "seat_count": 2,
  "fare": 40.00
}
```
* **Response (201 Created):**
```json
{
  "status": "success",
  "booking_id": 4022,
  "payment_url": "https://gateway.example.com/pay/4022"
}
```

### Process Payment
* **Endpoint:** `POST /api/payments/process`
* **Description:** Verifies payment transaction status.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:**
```json
{
  "booking_id": 4022,
  "amount": 40.00,
  "payment_method": "UPI",
  "transaction_id": "TXN9876543210"
}
```
* **Response (200 OK):**
```json
{
  "status": "success",
  "payment_status": "Successful",
  "ticket_qr_code": "QR_DATA_BASE64..."
}
```
