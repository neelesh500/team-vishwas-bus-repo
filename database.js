const sqlite3 = require('sqlite3').verbose();
const DB_PATH = process.env.DB_PATH || 'vrindavan.db';
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error('Failed to open DB', err);
    else console.log('Connected to SQLite DB:', DB_PATH);
});

// create routes table if missing (keep existing column names used elsewhere)
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_stop TEXT NOT NULL,
    to_stop TEXT NOT NULL,
    price INTEGER,
    frequency TEXT
  );`);

    db.run(`CREATE TABLE IF NOT EXISTS buses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    name TEXT,
    depart_time TEXT,
    total_seats INTEGER DEFAULT 40,
    available_seats INTEGER DEFAULT 40,
    price_per_seat INTEGER DEFAULT 30,
    FOREIGN KEY(route_id) REFERENCES routes(id)
  );`);

    db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bus_id INTEGER NOT NULL,
    route_id INTEGER NOT NULL,
    passenger_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    seats INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    status TEXT DEFAULT 'CONFIRMED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(bus_id) REFERENCES buses(id),
    FOREIGN KEY(route_id) REFERENCES routes(id)
  );`);

    // seed routes if empty
    db.get('SELECT COUNT(1) AS cnt FROM routes', (err, row) => {
        if (err) return console.error(err);
        if (!row || row.cnt === 0) {
            const r = db.prepare('INSERT INTO routes (from_stop,to_stop,price,frequency) VALUES (?,?,?,?)');
            r.run(['Vrindavan', 'Mathura', 30, 'Every 15 mins']);
            r.run(['Mathura', 'Goverdhan', 45, 'Every 30 mins']);
            r.run(['Vrindavan', 'Prem Mandir', 50, 'Several times a day']);
            r.run(['Mathura', 'Banke Bihari', 40, 'Every 30 mins']);
            r.finalize(() => console.log('Seeded routes'));
        }
    });

    // seed buses if empty
    db.get('SELECT COUNT(1) AS cnt FROM buses', (err, row) => {
        if (err) return console.error(err);
        if (!row || row.cnt === 0) {
            db.all('SELECT id, from_stop, to_stop FROM routes', (err2, rows) => {
                if (err2) return console.error(err2);
                const stmt = db.prepare('INSERT INTO buses (route_id, name, depart_time, total_seats, available_seats, price_per_seat) VALUES (?,?,?,?,?,?)');
                const times = ['06:00','08:00','10:00','12:30','15:00','17:30']; // 6 departures
                rows.forEach(route => {
                  times.forEach((t, i) => {
                    const name = `${route.from_stop} ${i === 0 ? 'Express' : i === 1 ? 'AC' : i === 2 ? 'Shuttle' : i === 3 ? 'Superfast' : i === 4 ? 'Intercity' : 'Local'}`;
                    const seats = i % 2 === 0 ? 40 : 30;
                    const price = Math.max(25, (route.from_stop === 'Vrindavan' ? 30 : 35) + i * 2);
                    stmt.run([route.id, name, t, seats, seats, price], (e) => { if (e) console.error('seed bus error', e); });
                  });
                });
                stmt.finalize(() => console.log('Seeded buses (6 per route)'));
            });
        }
    });

});
module.exports = db;