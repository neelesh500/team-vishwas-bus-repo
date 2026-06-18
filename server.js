const express = require('express');
const path = require('path');
const app = express();
const db = require('./database');

app.use(express.json());
app.use(express.static(path.join(__dirname))); // serve html/css/js/assets

// GET buses for a route (query: from & to optional)
app.get('/api/buses', (req, res) => {
    const { from, to } = req.query;
    // Simple join: find route ids that match from/to then return buses
    let sql = `SELECT b.id, b.route_id, r.from_stop AS from, r.to_stop AS to, b.name, b.depart_time, b.total_seats, b.available_seats, b.price_per_seat
             FROM buses b JOIN routes r ON b.route_id = r.id`;
    const params = [];
    if (from && to) {
        sql += ' WHERE r.from_stop = ? AND r.to_stop = ?';
        params.push(from, to);
    } else if (from) {
        sql += ' WHERE r.from_stop = ?';
        params.push(from);
    } else if (to) {
        sql += ' WHERE r.to_stop = ?';
        params.push(to);
    }
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json(rows);
    });
});

// POST create booking - transactional: checks availability then inserts + updates seats
app.post('/api/bookings', (req, res) => {
    const { bus_id, route_id, passenger_name, email, phone, seats } = req.body || {};
    const seatsRequested = parseInt(seats, 10) || 0;
    if (!bus_id || !route_id || !passenger_name || seatsRequested <= 0) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.serialize(() => {
        db.get('SELECT available_seats, price_per_seat FROM buses WHERE id = ?', [bus_id], (err, bus) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            if (!bus) return res.status(404).json({ error: 'Bus not found' });
            if (bus.available_seats < seatsRequested) return res.status(400).json({ error: 'Not enough seats available' });

            const totalPrice = seatsRequested * (bus.price_per_seat || 0);

            db.run('BEGIN TRANSACTION', (errBegin) => {
                if (errBegin) return res.status(500).json({ error: 'Transaction error' });

                const insertSql = `INSERT INTO bookings (bus_id, route_id, passenger_name, email, phone, seats, total_price) VALUES (?,?,?,?,?,?,?)`;
                db.run(insertSql, [bus_id, route_id, passenger_name, email || '', phone || '', seatsRequested, totalPrice], function(errInsert) {
                    if (errInsert) {
                        db.run('ROLLBACK', () => {});
                        return res.status(500).json({ error: 'DB insert error' });
                    }

                    const bookingId = this.lastID;
                    db.run('UPDATE buses SET available_seats = available_seats - ? WHERE id = ?', [seatsRequested, bus_id], function(errUpdate) {
                        if (errUpdate) {
                            db.run('ROLLBACK', () => {});
                            return res.status(500).json({ error: 'Failed to update seats' });
                        }
                        db.run('COMMIT', (errCommit) => {
                            if (errCommit) {
                                db.run('ROLLBACK', () => {});
                                return res.status(500).json({ error: 'Commit failed' });
                            }
                            return res.json({ success: true, bookingId, totalPrice });
                        });
                    });
                });
            });
        });
    });
});

// GET booking by id
app.get('/api/bookings/:id', (req, res) => {
    db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!row) return res.status(404).json({ error: 'Booking not found' });
        res.json(row);
    });
});

// optional: list recent bookings (admin/debug)
app.get('/api/bookings', (req, res) => {
    db.all('SELECT * FROM bookings ORDER BY id DESC LIMIT 200', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json(rows);
    });
});

// start server (if not already present)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));