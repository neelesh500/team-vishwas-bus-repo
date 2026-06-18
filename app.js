const API_URL = 'http://localhost:3000/api';

// ==========================================
// APPLICATION INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    await fetchInitialData();
    populateSelects();
    renderRoutesPage();
    renderServicesPage();
    renderMyBookings();
});

let STOPS = [];
let ROUTES = [];
let BUSES = [];

async function fetchInitialData() {
    try {
        const stopsRes = await fetch(`${API_URL}/stops`);
        STOPS = await stopsRes.json();

        const routesRes = await fetch(`${API_URL}/routes`);
        ROUTES = await routesRes.json();

        const busesRes = await fetch(`${API_URL}/buses`);
        BUSES = await busesRes.json();
    } catch (e) {
        addNotification("Server Error", "Could not connect to the database server.", "danger");
    }
}

function populateSelects() {
    const sourceSelect = document.getElementById("source-stop");
    const destSelect = document.getElementById("dest-stop");

    if (sourceSelect && destSelect) {
        STOPS.forEach(stop => {
            sourceSelect.add(new Option(stop.name, stop.id));
            destSelect.add(new Option(stop.name, stop.id));
        });
        
        // set default destination to be different from source
        if(destSelect.options.length > 1) {
            destSelect.selectedIndex = 1;
        }
    }
}

// ==========================================
// SPA ROUTING
// ==========================================
const NAV_VIEW_MAP = {
    home: 'Home',
    routes: 'Routes',
    services: 'Bus Services',
    about: 'About Us',
    contact: 'Contact'
};

function syncNavigationState(viewId, element = null) {
    document.querySelectorAll('.nav-link').forEach(nav => {
        nav.classList.remove('active');
        if (NAV_VIEW_MAP[viewId] && nav.textContent.trim() === NAV_VIEW_MAP[viewId]) {
            nav.classList.add('active');
        }
    });

    document.querySelectorAll('.sidebar .nav-btn').forEach(btn => btn.classList.remove('active'));

    if (element && element.classList.contains('nav-btn')) {
        element.classList.add('active');
    } else if (viewId === 'home') {
        document.querySelector('.sidebar .nav-btn[title="Home"]')?.classList.add('active');
    } else if (viewId === 'routes') {
        document.querySelector('.sidebar .nav-btn[title="Routes"]')?.classList.add('active');
    } else if (viewId === 'bookings') {
        document.querySelector('.sidebar .nav-btn[title="Tickets"]')?.classList.add('active');
    }

    if (element && element.classList.contains('nav-link')) {
        document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
        element.classList.add('active');
    }
}

window.navigate = function(viewId, element = null) {
    document.querySelectorAll('.page-view').forEach(view => {
        view.classList.add('hidden');
        view.classList.remove('active');
    });

    const target = document.getElementById(`view-${viewId}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }

    syncNavigationState(viewId, element);

    if (viewId === 'routes') {
        renderRoutesPage();
    } else if (viewId === 'services') {
        renderServicesPage();
    } else if (viewId === 'bookings') {
        renderMyBookings();
    }
};

// ==========================================
// PAGE RENDERERS
// ==========================================
function getStopName(stopId) {
    return STOPS.find(s => s.id === stopId)?.name || 'Unknown';
}

function getRouteDescription(routeId) {
    if (routeId === 1) {
        return 'A complete circuit covering all major spiritual sites inside Vrindavan.';
    }
    if (routeId === 2) {
        return 'Seamless transport linking the twin holy cities for pilgrims.';
    }
    return 'Connecting key stops across the Braj region.';
}

function getRouteFrequency(routeId) {
    return routeId === 1 ? 'Every 15 mins' : 'Every 30 mins';
}

function renderRoutesPage() {
    const container = document.getElementById('routes-page-container');
    if (!container) return;

    if (ROUTES.length === 0) {
        container.innerHTML = `<div class="card" style="margin-top: 1.5rem; text-align: center; color: var(--text-muted); padding: 2rem;">Route information is currently unavailable.</div>`;
        return;
    }

    container.innerHTML = ROUTES.map(route => {
        const stopNames = route.stops.map(getStopName).join(' ➔ ');
        const activeBuses = BUSES.filter(bus => bus.route_id === route.id && bus.status === 'Active').length;

        return `
            <div class="card" style="margin-top: 1.5rem;">
                <h3 style="color: var(--primary); margin-bottom: 1rem;">${route.name}</h3>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">${getRouteDescription(route.id)}</p>
                <div class="route-list">
                    <div class="route-item">
                        <div><strong>Stops:</strong> ${stopNames}</div>
                        <div class="route-price">Frequency: ${getRouteFrequency(route.id)}<span>₹${route.fare_per_stop} per stop • ${activeBuses} active bus(es)</span></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderServicesPage() {
    const container = document.getElementById('services-fleet-container');
    if (!container) return;

    const activeBuses = BUSES.filter(bus => bus.status === 'Active');

    if (activeBuses.length === 0) {
        container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 1rem;">No active buses available at the moment.</p>`;
        return;
    }

    container.innerHTML = activeBuses.map(bus => {
        const route = ROUTES.find(r => r.id === bus.route_id);
        const availableSeats = bus.capacity - bus.booked_seats;

        return `
            <div class="bus-card" style="margin-bottom: 0.75rem;">
                <div class="bus-card-info">
                    <h4>${bus.name}</h4>
                    <p>${bus.number} • ${route ? route.name : 'Assigned Route'} • ${availableSeats} seats available</p>
                </div>
                <button class="btn-primary" style="padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.8rem;" onclick="navigate('home')">
                    Book Now
                </button>
            </div>
        `;
    }).join('');
}

window.submitContactForm = function() {
    const name = document.getElementById('contact-name')?.value.trim();
    const email = document.getElementById('contact-email')?.value.trim();
    const message = document.getElementById('contact-message')?.value.trim();

    if (!name || !email || !message) {
        addNotification('Missing Details', 'Please fill in all contact form fields.', 'danger');
        return;
    }

    addNotification('Message Sent', 'Thank you for reaching out. Our team will respond shortly.', 'success');
    document.getElementById('contact-name').value = '';
    document.getElementById('contact-email').value = '';
    document.getElementById('contact-message').value = '';
};

// ==========================================
// TOAST NOTIFICATION
// ==========================================
function addNotification(title, message, type = "warning") {
    const box = document.getElementById("notifications-box");
    if (!box) return;
    
    const toast = document.createElement("div");
    toast.className = `notification-toast ${type}`;
    toast.style.background = "#fff";
    toast.style.color = "#333";
    toast.style.padding = "1rem";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
    toast.style.marginBottom = "0.5rem";
    toast.style.borderLeft = type === "danger" ? "4px solid red" : "4px solid green";
    
    toast.innerHTML = `<strong>${title}</strong><br><span style="font-size:0.85rem">${message}</span>`;
    box.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// ==========================================
// PASSENGER ACTIONS (Search & Book)
// ==========================================
window.searchBuses = function(e) {
    e.preventDefault();
    const sourceId = parseInt(document.getElementById("source-stop").value);
    const destId = parseInt(document.getElementById("dest-stop").value);

    if (sourceId === destId) {
        addNotification("Invalid Search", "Source and Destination stops cannot be the same.", "danger");
        return;
    }

    const resultsContainer = document.getElementById("bus-list-results");
    resultsContainer.innerHTML = '';

    // Find routes containing both stops in the correct order
    const matchingRoutes = ROUTES.filter(route => {
        const sourceIndex = route.stops.indexOf(sourceId);
        const destIndex = route.stops.indexOf(destId);
        return sourceIndex !== -1 && destIndex !== -1 && sourceIndex < destIndex;
    });

    if (matchingRoutes.length === 0) {
        resultsContainer.innerHTML = `<div style="text-align:center; padding: 2rem;">No direct buses found for this route.</div>`;
        return;
    }

    matchingRoutes.forEach(route => {
        const matchingBuses = BUSES.filter(b => b.route_id === route.id && b.status === "Active");
        
        matchingBuses.forEach(bus => {
            const sourceIndex = route.stops.indexOf(sourceId);
            const destIndex = route.stops.indexOf(destId);
            const stopsCount = destIndex - sourceIndex;
            const fare = stopsCount * route.fare_per_stop;
            const etaMins = stopsCount * 5;

            const card = document.createElement("div");
            card.className = "bus-card";
            card.innerHTML = `
                <div class="bus-card-info">
                    <h4>${bus.name}</h4>
                    <p>${bus.number} • ETA: ${etaMins} mins • Fare: ₹${fare}</p>
                </div>
                <button class="btn-primary" style="padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.8rem;" onclick="openBookingModal(${bus.id}, ${sourceId}, ${destId}, ${fare})">
                    Book Ticket
                </button>
            `;
            resultsContainer.appendChild(card);
        });
    });
};

window.openBookingModal = function(busId, sourceId, destId, fare) {
    const bus = BUSES.find(b => b.id === busId);
    const source = STOPS.find(s => s.id === sourceId);
    const dest = STOPS.find(s => s.id === destId);
    const availableSeats = bus.capacity - bus.booked_seats;
    
    if (availableSeats <= 0) {
        addNotification("Fully Booked", "Sorry, this bus is currently fully booked.", "danger");
        return;
    }

    const travelDate = document.getElementById("travel-date").value;
    
    const modalBody = document.getElementById("booking-modal-body");
    modalBody.innerHTML = `
        <div class="bus-info">
            <p><strong>Bus Name:</strong> ${bus.name} (${bus.number})</p>
            <p><strong>Route:</strong> ${source.name} ➔ ${dest.name}</p>
            <p><strong>Date:</strong> ${travelDate}</p>
        </div>
        
        <div class="ticket-seats-display">
            <div><span>${bus.capacity}</span><label>Total</label></div>
            <div><span style="color: #d97706;">${bus.booked_seats}</span><label>Booked</label></div>
            <div><span style="color: #059669;">${availableSeats}</span><label>Available</label></div>
        </div>

        <div class="input-group">
            <label>Number of Seats (Max ${Math.min(5, availableSeats)})</label>
            <input type="number" id="seat-count" min="1" max="${Math.min(5, availableSeats)}" value="1" onchange="updateFareDisplay(${fare}, this.value, ${availableSeats})">
        </div>
        <div class="input-group">
            <label>Payment Method</label>
            <select id="payment-method">
                <option value="UPI">UPI / PhonePe</option>
                <option value="CARD">Debit / Credit Card</option>
            </select>
        </div>
        <p style="font-size: 1.1rem; margin-top: 1rem;">Total Amount: <strong style="color: var(--primary);">₹<span id="modal-total-fare">${fare}</span></strong></p>
        <button class="btn-success" onclick="processBooking(${busId}, '${source.name}', '${dest.name}', '${travelDate}', ${fare})">
            Pay & Book Ticket
        </button>
    `;

    document.getElementById("booking-modal").classList.add("active");
};

window.updateFareDisplay = function(unitFare, seatCount, availableSeats) {
    let count = parseInt(seatCount || 1);
    if(count > availableSeats) count = availableSeats;
    const total = unitFare * count;
    document.getElementById("modal-total-fare").textContent = total;
};

window.closeBookingModal = function() {
    document.getElementById("booking-modal").classList.remove("active");
};

window.processBooking = async function(busId, sourceName, destName, date, unitFare) {
    const seatCount = parseInt(document.getElementById("seat-count").value);
    const bus = BUSES.find(b => b.id === busId);
    
    if (bus.booked_seats + seatCount > bus.capacity) {
        addNotification("Error", "Not enough seats available!", "danger");
        return;
    }

    const finalAmount = unitFare * seatCount;
    
    try {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bus_id: busId,
                source: sourceName,
                destination: destName,
                date: date,
                seats: seatCount,
                amount: finalAmount
            })
        });

        const data = await response.json();
        if (!response.ok) {
            addNotification("Booking Failed", data.error || "An error occurred.", "danger");
            return;
        }

        // Update local state to reflect DB change
        bus.booked_seats += seatCount;
        
        // Success Screen
        const modalBody = document.getElementById("booking-modal-body");
        modalBody.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 3rem; color: #059669; margin-bottom: 1rem;"><i class="fa-solid fa-circle-check"></i></div>
                <h3>Ticket Booked Successfully!</h3>
                <div style="background: white; padding: 1rem; border-radius: 12px; margin: 1.5rem auto; display: inline-block; border: 1px solid var(--accent);">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${data.id}" alt="QR Ticket">
                </div>
                <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom: 1.5rem;">Ticket ID: ${data.id}<br>Show this QR code to the conductor.</p>
                <button class="btn-primary" style="width: 100%; justify-content: center;" onclick="closeBookingModal(); navigate('bookings');">View My Bookings</button>
            </div>
        `;
    } catch (e) {
        addNotification("Network Error", "Could not reach the server to complete booking.", "danger");
    }
};

// ==========================================
// RENDER MY BOOKINGS
// ==========================================
async function renderMyBookings() {
    const container = document.getElementById("my-bookings-container");
    if (!container) return;
    
    try {
        const res = await fetch(`${API_URL}/bookings`);
        const tickets = await res.json();
        
        if (tickets.length === 0) {
            container.innerHTML = `
                <div class="card" style="grid-column: span 2; text-align: center; padding: 3rem;">
                    <i class="fa-solid fa-ticket" style="font-size: 2.5rem; color: var(--primary); margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem; color: var(--primary);">No Bookings Yet</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">You have no active bookings. Search for a bus and book your first ticket.</p>
                    <button class="btn-primary" style="margin: 0 auto;" onclick="navigate('home')">
                        Search Buses <i class="fa-solid fa-magnifying-glass"></i>
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = tickets.map(t => `
            <div class="card" style="display: flex; gap: 1rem; align-items: center;">
                <div style="background: var(--secondary); padding: 0.5rem; border-radius: 8px;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${t.id}" style="display: block;">
                </div>
                <div style="flex: 1;">
                    <h4 style="color: var(--primary); margin-bottom: 0.25rem;">${t.busName || 'Vrindavan Express'}</h4>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">${t.source} ➔ ${t.destination}</p>
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600;">
                        <span><i class="fa-regular fa-calendar"></i> ${t.date}</span>
                        <span>${t.seats} Seat(s)</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch(e) {
        container.innerHTML = `<div style="grid-column: span 2; text-align: center; padding: 3rem; color: red;">Failed to load bookings from the database. Make sure the backend server is running.</div>`;
    }
}
