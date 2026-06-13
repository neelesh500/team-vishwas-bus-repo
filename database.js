const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'vrindavan.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Create Tables
        db.run(`CREATE TABLE IF NOT EXISTS stops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            fare_per_stop INTEGER NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS route_stops (
            route_id INTEGER,
            stop_id INTEGER,
            stop_order INTEGER,
            FOREIGN KEY (route_id) REFERENCES routes (id),
            FOREIGN KEY (stop_id) REFERENCES stops (id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS buses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            number TEXT NOT NULL,
            name TEXT NOT NULL,
            route_id INTEGER,
            capacity INTEGER NOT NULL,
            booked_seats INTEGER DEFAULT 0,
            FOREIGN KEY (route_id) REFERENCES routes (id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            bus_id INTEGER,
            source TEXT,
            destination TEXT,
            date TEXT,
            seats INTEGER,
            amount INTEGER,
            booking_time TEXT,
            FOREIGN KEY (bus_id) REFERENCES buses (id)
        )`);

        // Check if stops table is empty to seed initial mock data
        db.get("SELECT COUNT(*) as count FROM stops", (err, row) => {
            if (row && row.count === 0) {
                console.log("Seeding initial data...");
                seedData();
            }
        });
    });
}

function seedData() {
    // Insert Stops
    const stops = [
        [1, "Akshaya Patra", "Chhatikara Road, Vrindavan"],
        [2, "ISKCON Temple", "Raman Reti, Vrindavan"],
        [3, "Prem Mandir", "Bhakti Dham, Vrindavan"],
        [4, "Banke Bihari Mandir", "Bihari Pura, Vrindavan"],
        [5, "Railway Station", "Station Road, Vrindavan"],
        [6, "Mathura Junction", "Mathura"]
    ];
    const stmtStops = db.prepare("INSERT INTO stops (id, name, address) VALUES (?, ?, ?)");
    stops.forEach(s => stmtStops.run(s));
    stmtStops.finalize();

    // Insert Routes
    const routes = [
        [1, "Vrindavan Parikrama Express", 10],
        [2, "Mathura Connect", 15]
    ];
    const stmtRoutes = db.prepare("INSERT INTO routes (id, name, fare_per_stop) VALUES (?, ?, ?)");
    routes.forEach(r => stmtRoutes.run(r));
    stmtRoutes.finalize();

    // Insert Route Stops
    const route1Stops = [1, 2, 3, 4, 5];
    const stmtRouteStops = db.prepare("INSERT INTO route_stops (route_id, stop_id, stop_order) VALUES (?, ?, ?)");
    route1Stops.forEach((stopId, idx) => stmtRouteStops.run([1, stopId, idx + 1]));
    
    const route2Stops = [3, 2, 5, 6];
    route2Stops.forEach((stopId, idx) => stmtRouteStops.run([2, stopId, idx + 1]));
    stmtRouteStops.finalize();

    // Insert Buses
    const buses = [
        [101, "UP-85-AT-1111", "Bihari Ji Express", 1, 40, 25],
        [102, "UP-85-AT-2222", "Mathura Shuttle", 2, 35, 30]
    ];
    const stmtBuses = db.prepare("INSERT INTO buses (id, number, name, route_id, capacity, booked_seats) VALUES (?, ?, ?, ?, ?, ?)");
    buses.forEach(b => stmtBuses.run(b));
    stmtBuses.finalize();

    console.log("Initial data seeded successfully.");
}

module.exports = db;
