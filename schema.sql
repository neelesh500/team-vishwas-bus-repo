-- PostgreSQL Database Schema for Vrindavan Bus Navigation System
-- Created on: 2026-06-11
-- Target Database: PostgreSQL (13+)

-- Enable PostGIS extension if you plan to use spatial queries (optional but recommended for production)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- =========================================================================
-- ENUMS DEFINITIONS
-- =========================================================================

CREATE TYPE user_role AS ENUM ('Passenger', 'Driver', 'Admin');
CREATE TYPE driver_status AS ENUM ('On Duty', 'Off Duty', 'Suspended');
CREATE TYPE bus_status AS ENUM ('Active', 'Inactive', 'Maintenance');
CREATE TYPE booking_status AS ENUM ('Booked', 'Completed', 'Cancelled');
CREATE TYPE payment_status AS ENUM ('Pending', 'Successful', 'Failed');

-- =========================================================================
-- TABLES DEFINITIONS
-- =========================================================================

-- 1. Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'Passenger' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Drivers Table
CREATE TABLE drivers (
    driver_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE UNIQUE,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    assigned_bus_id INT, -- Will be set as FK after buses table is created
    status driver_status DEFAULT 'Off Duty' NOT NULL
);

-- 3. Buses Table
CREATE TABLE buses (
    bus_id SERIAL PRIMARY KEY,
    bus_number VARCHAR(20) UNIQUE NOT NULL,
    bus_name VARCHAR(50) NOT NULL,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    driver_id INT REFERENCES drivers(driver_id) ON DELETE SET NULL,
    status bus_status DEFAULT 'Active' NOT NULL
);

-- Alter Drivers table to add the Foreign Key referencing Buses
ALTER TABLE drivers ADD CONSTRAINT fk_driver_bus FOREIGN KEY (assigned_bus_id) REFERENCES buses(bus_id) ON DELETE SET NULL;

-- 4. Routes Table
CREATE TABLE IF NOT EXISTS routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  price INTEGER,
  frequency TEXT
);

DELETE FROM routes; -- optional: clear existing
INSERT INTO routes ("from","to",price,frequency) VALUES ('Vrindavan','Mathura',30,'Every 15 mins');
INSERT INTO routes ("from","to",price,frequency) VALUES ('Mathura','Goverdhan',45,'Every 30 mins');
INSERT INTO routes ("from","to",price,frequency) VALUES ('Vrindavan','Prem Mandir',50,'Several times a day');
INSERT INTO routes ("from","to",price,frequency) VALUES ('Vrindavan','ISKCON',20,'Hourly');
INSERT INTO routes ("from","to",price,frequency) VALUES ('Mathura','Banke Bihari',40,'Every 30 mins');

-- 5. Bus Stops Table
CREATE TABLE bus_stops (
    stop_id SERIAL PRIMARY KEY,
    stop_name VARCHAR(100) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DECIMAL(9, 6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    address TEXT
);

-- 6. Route Stops Table (Junction table to map Stops in order for a Route)
CREATE TABLE route_stops (
    route_stop_id SERIAL PRIMARY KEY,
    route_id INT NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
    stop_id INT NOT NULL REFERENCES bus_stops(stop_id) ON DELETE CASCADE,
    stop_order INT NOT NULL CHECK (stop_order > 0),
    UNIQUE (route_id, stop_order)
);

-- 7. Live Bus Locations Table
CREATE TABLE live_bus_locations (
    location_id SERIAL PRIMARY KEY,
    bus_id INT NOT NULL REFERENCES buses(bus_id) ON DELETE CASCADE,
    latitude DECIMAL(9, 6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DECIMAL(9, 6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    speed DECIMAL(5, 2) DEFAULT 0.0 CHECK (speed >= 0),
    heading DECIMAL(5, 2), -- Direction in degrees (0 - 360)
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. Ticket Bookings Table
CREATE TABLE ticket_bookings (
    booking_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    bus_id INT NOT NULL REFERENCES buses(bus_id) ON DELETE RESTRICT,
    source_stop_id INT NOT NULL REFERENCES bus_stops(stop_id) ON DELETE RESTRICT,
    destination_stop_id INT NOT NULL REFERENCES bus_stops(stop_id) ON DELETE RESTRICT,
    fare DECIMAL(8, 2) NOT NULL CHECK (fare >= 0),
    seat_count INT NOT NULL DEFAULT 1 CHECK (seat_count > 0),
    booking_status booking_status DEFAULT 'Booked' NOT NULL,
    booking_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. Payments Table
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES ticket_bookings(booking_id) ON DELETE CASCADE UNIQUE,
    amount DECIMAL(8, 2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(50) NOT NULL, -- e.g., 'UPI', 'Card', 'NetBanking'
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    payment_status payment_status DEFAULT 'Pending' NOT NULL,
    payment_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 10. Notifications Table
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =========================================================================
-- INDEX DEFINITIONS (Optimizations)
-- =========================================================================

-- GPS Location query optimization (B-tree composite index for standard lat/long lookups)
CREATE INDEX idx_live_bus_coords ON live_bus_locations (latitude, longitude);

-- Fast tracking lookups for most recent location of a bus
CREATE INDEX idx_live_bus_id_timestamp ON live_bus_locations (bus_id, timestamp DESC);

-- Fast user authentication lookups
CREATE INDEX idx_users_email ON users (email);

-- Fast route searching by stop IDs in booking queries
CREATE INDEX idx_route_stops_mapping ON route_stops (route_id, stop_id);

-- Booking lookups for passenger history
CREATE INDEX idx_bookings_user_id ON ticket_bookings (user_id);
