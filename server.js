const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Get all stops
app.get('/api/stops', (req, res) => {
    db.all("SELECT * FROM stops", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get routes with their stops attached
app.get('/api/routes', (req, res) => {
    db.all("SELECT * FROM routes", [], (err, routes) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let processed = 0;
        routes.forEach(route => {
            db.all("SELECT stop_id FROM route_stops WHERE route_id = ? ORDER BY stop_order", [route.id], (err, stops) => {
                route.stops = stops.map(s => s.stop_id);
                processed++;
                if (processed === routes.length) {
                    res.json(routes);
                }
            });
        });
    });
});

// Get active buses
app.get('/api/buses', (req, res) => {
    db.all("SELECT * FROM buses", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        rows.forEach(r => r.status = 'Active'); // Match frontend schema
        res.json(rows);
    });
});

// Get bookings
app.get('/api/bookings', (req, res) => {
    db.all("SELECT * FROM bookings ORDER BY booking_time DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create booking
app.post('/api/bookings', (req, res) => {
    const { bus_id, source, destination, date, seats, amount } = req.body;
    
    // Check capacity first
    db.get("SELECT capacity, booked_seats FROM buses WHERE id = ?", [bus_id], (err, bus) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!bus) return res.status(404).json({ error: "Bus not found" });
        
        if (bus.booked_seats + seats > bus.capacity) {
            return res.status(400).json({ error: "Not enough seats available" });
        }
        
        const newBookedSeats = bus.booked_seats + seats;
        const ticketId = 'TKT-' + Math.floor(Math.random() * 90000 + 10000);
        const bookingTime = new Date().toLocaleString();
        
        db.serialize(() => {
            db.run("UPDATE buses SET booked_seats = ? WHERE id = ?", [newBookedSeats, bus_id]);
            
            const stmt = db.prepare("INSERT INTO bookings (id, bus_id, source, destination, date, seats, amount, booking_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            stmt.run([ticketId, bus_id, source, destination, date, seats, amount, bookingTime], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                db.get("SELECT name, number FROM buses WHERE id = ?", [bus_id], (err, b) => {
                    res.status(201).json({
                        id: ticketId,
                        busName: b.name,
                        busNumber: b.number,
                        from: source,
                        to: destination,
                        date: date,
                        seats: seats,
                        amount: amount,
                        bookingTime: bookingTime
                    });
                });
            });
            stmt.finalize();
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
