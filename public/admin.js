/**
 * YAKSHITH NANDH TRAVELS - Admin Master Console Logic
 * Complete control over every section of the website
 */

let currentStatusFilter = 'All';
let currentSearchTerm = '';
let allServicesData = [];
let allFleetData = [];
let allDestinationsData = [];

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const refreshBtn = document.getElementById('refreshBtn');
  const searchInput = document.getElementById('searchInput');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const mainTabButtons = document.querySelectorAll('.admin-tab-btn');
  const viewPanels = document.querySelectorAll('.admin-view-panel');

  // Forms
  const statusForm = document.getElementById('statusForm');
  const assignForm = document.getElementById('assignForm');
  const newBookingForm = document.getElementById('newBookingForm');
  const serviceEditForm = document.getElementById('serviceEditForm');
  const vehicleForm = document.getElementById('vehicleForm');
  const settingsForm = document.getElementById('settingsForm');

  // Load All Sections Data
  loadAllData();

  // Switch tab function
  window.switchAdminTab = (viewId) => {
    mainTabButtons.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-view') === viewId);
    });
    viewPanels.forEach(p => {
      p.classList.toggle('active', p.getAttribute('id') === viewId);
    });
  };

  // Check URL hash on load (e.g. #services, #fleet, #destinations, #settings)
  const applyHashTab = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'services') switchAdminTab('services-view');
    else if (hash === 'fleet' || hash === 'vehicles') switchAdminTab('fleet-view');
    else if (hash === 'destinations') switchAdminTab('destinations-view');
    else if (hash === 'messages' || hash === 'contacts') switchAdminTab('messages-view');
    else if (hash === 'settings' || hash === 'brand') switchAdminTab('settings-view');
    else if (hash === 'bookings') switchAdminTab('bookings-view');
  };
  applyHashTab();
  window.addEventListener('hashchange', applyHashTab);

  // Tab Switching
  mainTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetViewId = btn.getAttribute('data-view');
      switchAdminTab(targetViewId);
      // update hash
      const hashMap = {
        'bookings-view': 'bookings',
        'services-view': 'services',
        'fleet-view': 'fleet',
        'destinations-view': 'destinations',
        'messages-view': 'messages',
        'settings-view': 'settings'
      };
      if (hashMap[targetViewId]) {
        window.location.hash = hashMap[targetViewId];
      }
    });
  });

  // Global Refresh
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadAllData();
    });
  }

  // Bookings Search Debounce
  let searchTimeout = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentSearchTerm = e.target.value;
        loadBookings();
      }, 300);
    });
  }

  // Status Filter Tabs in Bookings View
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentStatusFilter = tab.getAttribute('data-status');
      loadBookings();
    });
  });

  // Form: Status Update
  if (statusForm) {
    statusForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bookingId = document.getElementById('statusBookingId').value;
      const newStatus = document.getElementById('newStatusSelect').value;

      try {
        const res = await fetch(`/api/bookings/${bookingId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
          closeStatusModal();
          loadStats();
          loadBookings();
        } else {
          alert('Failed to update status.');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  // Form: Driver Assignment
  if (assignForm) {
    assignForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bookingId = document.getElementById('assignBookingId').value;
      const driverName = document.getElementById('assignDriverName').value;
      const driverPhone = document.getElementById('assignDriverPhone').value;
      const vehicleNumber = document.getElementById('assignVehicleNumber').value;
      const fare = document.getElementById('assignFare').value;

      try {
        const res = await fetch(`/api/bookings/${bookingId}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driver_name: driverName,
            driver_phone: driverPhone,
            vehicle_number: vehicleNumber,
            fare_estimate: fare
          })
        });
        if (res.ok) {
          closeAssignModal();
          loadStats();
          loadBookings();
        } else {
          alert('Failed to assign driver/vehicle.');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  // Form: New Manual Booking
  if (newBookingForm) {
    newBookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        customer_name: document.getElementById('nb_name').value.trim(),
        customer_phone: document.getElementById('nb_phone').value.trim(),
        service_type: document.getElementById('nb_service').value,
        preferred_vehicle: document.getElementById('nb_vehicle').value,
        pickup_location: document.getElementById('nb_pickup').value.trim(),
        destination: document.getElementById('nb_destination').value.trim(),
        travel_date: document.getElementById('nb_date').value,
        passenger_count: parseInt(document.getElementById('nb_passengers').value, 10),
        additional_notes: document.getElementById('nb_notes').value.trim()
      };

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          closeNewBookingModal();
          newBookingForm.reset();
          loadStats();
          loadBookings();
          alert('Booking created successfully!');
        } else {
          const err = await res.json();
          alert('Failed: ' + (err.error || 'Check fields'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  // Form: Add / Edit Service
  if (serviceEditForm) {
    serviceEditForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editServiceId').value;
      const payload = {
        name: document.getElementById('editServiceName').value.trim(),
        starting_price: document.getElementById('editServicePrice').value.trim(),
        description: document.getElementById('editServiceDesc').value.trim(),
        features: document.getElementById('editServiceFeatures').value.trim(),
        is_active: 1
      };

      try {
        const url = id ? `/api/services/${id}` : '/api/services';
        const method = id ? 'PATCH' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          closeServiceEditModal();
          loadServices();
          alert(id ? 'Service updated successfully!' : 'Service created successfully!');
        } else {
          alert('Failed to save service.');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  // Form: Destination Add / Edit
  const destinationForm = document.getElementById('destinationForm');
  if (destinationForm) {
    destinationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('destId').value;
      const payload = {
        name: document.getElementById('dest_name').value.trim(),
        subtitle: document.getElementById('dest_subtitle').value.trim(),
        distance: document.getElementById('dest_distance').value.trim(),
        duration: document.getElementById('dest_duration').value.trim(),
        description: document.getElementById('dest_desc').value.trim(),
        is_popular: 1
      };

      try {
        const url = id ? `/api/destinations/${id}` : '/api/destinations';
        const method = id ? 'PATCH' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          closeDestinationModal();
          loadDestinations();
          alert(id ? 'Destination updated successfully!' : 'Destination added successfully!');
        } else {
          alert('Failed to save destination.');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  // Form: Record Manual Callback / Inquiry
  const newCallbackForm = document.getElementById('newCallbackForm');
  if (newCallbackForm) {
    newCallbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('cb_name').value.trim(),
        phone: document.getElementById('cb_phone').value.trim(),
        email: document.getElementById('cb_email').value.trim(),
        message: document.getElementById('cb_message').value.trim()
      };

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          closeNewCallbackModal();
          newCallbackForm.reset();
          loadMessages();
          alert('Callback inquiry logged successfully!');
        } else {
          alert('Failed to save inquiry.');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  // Form: Message Status Update
  const messageStatusForm = document.getElementById('messageStatusForm');
  if (messageStatusForm) {
    messageStatusForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('msgStatusId').value;
      const status = document.getElementById('msgNewStatusSelect').value;

      try {
        const res = await fetch(`/api/contacts/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        if (res.ok) {
          closeMessageStatusModal();
          loadMessages();
        } else {
          alert('Failed to update status.');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  // Form: Vehicle Add / Edit
  if (vehicleForm) {
    vehicleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('vehicleId').value;
      const payload = {
        model_name: document.getElementById('veh_name').value.trim(),
        category: document.getElementById('veh_category').value.trim(),
        capacity: parseInt(document.getElementById('veh_capacity').value, 10),
        luggage_bags: parseInt(document.getElementById('veh_luggage').value, 10),
        rate_per_km: document.getElementById('veh_rate').value.trim(),
        description: document.getElementById('veh_desc').value.trim(),
        is_available: 1
      };

      try {
        const url = id ? `/api/fleet/${id}` : '/api/fleet';
        const method = id ? 'PATCH' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          closeVehicleModal();
          loadFleet();
          alert(id ? 'Vehicle updated successfully!' : 'Vehicle added to fleet!');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  // Form: Settings
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        company_name: document.getElementById('setting_company_name').value.trim(),
        slogan: document.getElementById('setting_slogan').value.trim(),
        primary_phone: document.getElementById('setting_primary_phone').value.trim(),
        secondary_phone: document.getElementById('setting_secondary_phone').value.trim(),
        email: document.getElementById('setting_email').value.trim(),
        location: document.getElementById('setting_location').value.trim(),
        announcement: document.getElementById('setting_announcement').value.trim()
      };

      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          alert('Brand settings saved successfully!');
        }
      } catch (err) {
        alert('Error saving settings: ' + err.message);
      }
    });
  }
});

// Load Everything
function loadAllData() {
  loadStats();
  loadBookings();
  loadServices();
  loadFleet();
  loadDestinations();
  loadMessages();
  loadSettings();
}

// 1. KPI Stats
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && data.stats) {
      document.getElementById('statTotal').textContent = data.stats.total;
      document.getElementById('statPending').textContent = data.stats.pending;
      document.getElementById('statConfirmed').textContent = data.stats.confirmed;
      document.getElementById('statToday').textContent = data.stats.today_scheduled;
    }
  } catch (err) {
    console.error('Stats load error:', err);
  }
}

// 2. Bookings Table
async function loadBookings() {
  const tbody = document.getElementById('bookingsTableBody');
  if (!tbody) return;

  let query = `/api/bookings?status=${encodeURIComponent(currentStatusFilter)}`;
  if (currentSearchTerm) {
    query += `&search=${encodeURIComponent(currentSearchTerm)}`;
  }

  try {
    const res = await fetch(query);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();

    if (!data.bookings || data.bookings.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:30px; color:var(--color-text-muted);">
            No bookings found matching current filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.bookings.map(b => {
      let badgeClass = 'badge-pending';
      if (b.status === 'Confirmed') badgeClass = 'badge-confirmed';
      if (b.status === 'Driver Assigned') badgeClass = 'badge-assigned';
      if (b.status === 'Completed') badgeClass = 'badge-completed';
      if (b.status === 'Cancelled') badgeClass = 'badge-cancelled';

      const customerWaText = encodeURIComponent(
        `Namaste ${b.customer_name}! This is Yakshith Nandh Travels, Tirupati regarding your ride reservation [${b.booking_ref}] for ${b.travel_date} (${b.preferred_vehicle} from ${b.pickup_location} to ${b.destination}). How can we assist you with your pilgrimage trip?`
      );
      const cleanPhone = b.customer_phone.replace(/\D/g, '');
      const waUrl = `https://api.whatsapp.com/send?phone=91${cleanPhone.slice(-10)}&text=${customerWaText}`;

      return `
        <tr>
          <td>
            <strong style="color:var(--color-primary);">${b.booking_ref}</strong><br>
            <span style="font-size:0.75rem; color:var(--color-text-muted);">${b.created_at || ''}</span>
          </td>
          <td>
            <strong>${escapeHTML(b.customer_name)}</strong><br>
            <a href="tel:${b.customer_phone}" style="color:var(--color-primary); font-size:0.85rem;">📞 ${b.customer_phone}</a>
          </td>
          <td>
            <span style="font-weight:600;">${escapeHTML(b.preferred_vehicle)}</span><br>
            <span style="font-size:0.8rem; color:var(--color-text-muted);">${escapeHTML(b.service_type)}</span>
          </td>
          <td>
            <div style="font-size:0.88rem;">
              <span style="color:var(--color-text-muted);">From:</span> ${escapeHTML(b.pickup_location)}<br>
              <span style="color:var(--color-primary); font-weight:600;">To:</span> ${escapeHTML(b.destination)}
            </div>
            ${b.additional_notes ? `<div style="font-size:0.75rem; color:#78685F; margin-top:4px; font-style:italic;">"${escapeHTML(b.additional_notes)}"</div>` : ''}
          </td>
          <td>
            <strong>${b.travel_date}</strong><br>
            <span style="font-size:0.8rem; color:var(--color-text-muted);">${b.passenger_count} Passenger(s)</span>
          </td>
          <td>
            <span class="badge-status ${badgeClass}">${b.status}</span>
          </td>
          <td>
            ${b.driver_name ? `
              <div style="font-size:0.85rem;">
                <strong>${escapeHTML(b.driver_name)}</strong> (${b.vehicle_number || 'No plate'})<br>
                <a href="tel:${b.driver_phone}" style="font-size:0.78rem; color:var(--color-text-muted);">📞 ${b.driver_phone}</a>
                ${b.fare_estimate ? `<span style="display:block; color:var(--color-accent-gold-dark); font-weight:bold;">${escapeHTML(b.fare_estimate)}</span>` : ''}
              </div>
            ` : `
              <span style="font-size:0.8rem; color:var(--color-text-muted); font-style:italic;">Unassigned</span>
            `}
          </td>
          <td>
            <div class="action-btn-group">
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="action-icon-btn whatsapp" title="Chat with Customer on WhatsApp">
                <svg viewBox="0 0 24 24"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>
              </a>
              <a href="tel:${b.customer_phone}" class="action-icon-btn" title="Call Customer">
                <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
              </a>
              <button type="button" class="action-icon-btn" title="Update Status" onclick="openStatusModal(${b.id}, '${b.status}')">
                <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </button>
              <button type="button" class="action-icon-btn" title="Assign Driver & Vehicle" onclick="openAssignModal(${b.id}, '${escapeQuote(b.driver_name || '')}', '${escapeQuote(b.driver_phone || '')}', '${escapeQuote(b.vehicle_number || '')}', '${escapeQuote(b.fare_estimate || '')}')">
                <svg viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/></svg>
              </button>
              <button type="button" class="action-icon-btn delete" title="Delete Booking" onclick="deleteBookingRecord(${b.id})">
                <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#d32f2f;">Failed to load bookings: ${err.message}</td></tr>`;
  }
}

// 3. Services Section Cards
async function loadServices() {
  const container = document.getElementById('servicesCardsContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/services');
    if (!res.ok) return;
    const data = await res.json();
    allServicesData = data.services || [];

    container.innerHTML = allServicesData.map(s => `
      <div class="admin-content-card">
        <span class="card-top-tag">${escapeHTML(s.category)}</span>
        <h3>${escapeHTML(s.name)}</h3>
        <p>${escapeHTML(s.description)}</p>
        <div style="font-size:0.85rem; margin-bottom:12px; color:var(--color-primary); font-weight:700;">
          Starting Tariff: ${escapeHTML(s.starting_price || 'Enquire')}
        </div>
        ${s.features ? `<div style="font-size:0.78rem; color:var(--color-text-muted); margin-bottom:14px; background:#FFF9F0; padding:6px 10px; border-radius:6px; border:1px solid var(--color-border);">${escapeHTML(s.features)}</div>` : ''}
        <div style="margin-top:auto; padding-top:10px; border-top:1px dashed var(--color-border); display:flex; justify-content:space-between; align-items:center;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="openEditServiceModal(${s.id})">Edit Service</button>
          <div class="action-btn-group">
            <a href="/#services" target="_blank" class="action-icon-btn" title="Preview on Live Site">↗</a>
            <button type="button" class="action-icon-btn delete" title="Delete Service" onclick="deleteServiceRecord(${s.id})">
              <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading services:', err);
  }
}

// 4. Fleet Section Cards
async function loadFleet() {
  const container = document.getElementById('fleetCardsContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/fleet');
    if (!res.ok) return;
    const data = await res.json();
    allFleetData = data.fleet || [];

    container.innerHTML = allFleetData.map(v => `
      <div class="admin-content-card">
        <span class="card-top-tag">${escapeHTML(v.category)}</span>
        <h3>${escapeHTML(v.model_name)}</h3>
        <p>${escapeHTML(v.description || 'Pristine vehicle equipped with AC and certified for Tirumala ghat roads.')}</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.82rem; margin-bottom:14px; background:#FFF9F0; padding:8px; border-radius:6px; border:1px solid var(--color-border);">
          <div><strong>Seats:</strong> ${v.capacity} Passengers</div>
          <div><strong>Bags:</strong> ${v.luggage_bags} Suitcases</div>
          <div style="grid-column:span 2; color:var(--color-primary); font-weight:700;"><strong>Tariff:</strong> ${escapeHTML(v.rate_per_km || 'Competitive')}</div>
        </div>
        <div style="margin-top:auto; padding-top:10px; border-top:1px dashed var(--color-border); display:flex; justify-content:space-between; align-items:center;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="openEditVehicleModal(${v.id})">Edit</button>
          <div class="action-btn-group">
            <a href="/#vehicles" target="_blank" class="action-icon-btn" title="Preview on Live Site">↗</a>
            <button type="button" class="action-icon-btn delete" title="Delete vehicle" onclick="deleteVehicleRecord(${v.id})">
              <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading fleet:', err);
  }
}

// 5. Destinations Cards
async function loadDestinations() {
  const container = document.getElementById('destinationsCardsContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/destinations');
    if (!res.ok) return;
    const data = await res.json();
    allDestinationsData = data.destinations || [];

    container.innerHTML = allDestinationsData.map(d => `
      <div class="admin-content-card">
        <span class="card-top-tag">Destination #${d.id}</span>
        <h3>${escapeHTML(d.name)}</h3>
        <div style="font-family:var(--font-subheading); font-size:0.95rem; color:var(--color-accent-gold-dark); font-weight:600; margin-bottom:6px;">
          ${escapeHTML(d.subtitle)}
        </div>
        <p>${escapeHTML(d.description)}</p>
        <div style="font-size:0.84rem; color:var(--color-primary); margin-bottom:12px;">
          📍 <strong>${escapeHTML(d.distance)}</strong> • ⏱️ ${escapeHTML(d.duration)}
        </div>
        <div style="margin-top:auto; padding-top:10px; border-top:1px dashed var(--color-border); display:flex; justify-content:space-between; align-items:center;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="openEditDestinationModal(${d.id})">Edit Destination</button>
          <div class="action-btn-group">
            <a href="/#destinations" target="_blank" class="action-icon-btn" title="Preview on Live Site">↗</a>
            <button type="button" class="action-icon-btn delete" title="Delete Destination" onclick="deleteDestinationRecord(${d.id})">
              <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading destinations:', err);
  }
}

// 6. Messages Table
async function loadMessages() {
  const tbody = document.getElementById('messagesTableBody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/contacts');
    if (!res.ok) return;
    const data = await res.json();
    const contacts = data.contacts || [];

    if (contacts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:25px; color:var(--color-text-muted);">No customer inquiries yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = contacts.map(c => `
      <tr>
        <td>
          <strong>#${c.id}</strong><br>
          <span style="font-size:0.75rem; color:var(--color-text-muted);">${c.created_at || ''}</span>
        </td>
        <td><strong>${escapeHTML(c.name)}</strong></td>
        <td>
          <a href="tel:${c.phone}" style="color:var(--color-primary); font-weight:600;">📞 ${c.phone}</a><br>
          <span style="font-size:0.8rem; color:var(--color-text-muted);">${c.email ? escapeHTML(c.email) : 'No email'}</span>
        </td>
        <td><div style="font-size:0.88rem; max-width:340px;">${escapeHTML(c.message)}</div></td>
        <td>
          <span class="badge-status ${c.status === 'New' ? 'badge-pending' : (c.status === 'Resolved' ? 'badge-completed' : 'badge-confirmed')}">${c.status}</span>
        </td>
        <td>
          <div class="action-btn-group">
            <a href="https://wa.me/91${c.phone.replace(/\D/g,'').slice(-10)}?text=${encodeURIComponent('Namaste ' + c.name + '! This is Yakshith Nandh Travels, Tirupati regarding your inquiry.')}" target="_blank" class="action-icon-btn whatsapp" title="Reply on WhatsApp">
              <svg viewBox="0 0 24 24"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>
            </a>
            <a href="tel:${c.phone}" class="action-icon-btn" title="Call Customer">
              <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            </a>
            <button type="button" class="action-icon-btn" title="Update Status" onclick="openMessageStatusModal(${c.id}, '${c.status}')">
              <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button type="button" class="action-icon-btn delete" title="Delete Inquiry" onclick="deleteMessageRecord(${c.id})">
              <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading messages:', err);
  }
}
            <a href="tel:${c.phone}" class="action-icon-btn" title="Call Customer">
              <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            </a>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading messages:', err);
  }
}

// 7. Site Settings
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const data = await res.json();
    const s = data.settings || {};

    if (document.getElementById('setting_company_name')) {
      document.getElementById('setting_company_name').value = s.company_name || 'Yakshith Nandh Travels';
      document.getElementById('setting_slogan').value = s.slogan || 'Your Safety, Our Priority.';
      document.getElementById('setting_primary_phone').value = s.primary_phone || '+91 88868 30755';
      document.getElementById('setting_secondary_phone').value = s.secondary_phone || '+91 97009 35888';
      document.getElementById('setting_email').value = s.email || 'yakshithnandhtravels.demo@gmail.com';
      document.getElementById('setting_location').value = s.location || 'Tirupati, Andhra Pradesh, India';
      document.getElementById('setting_announcement').value = s.announcement || '24/7 Available • Pilgrimage & Cab Service in Tirupati';
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

// Modal Triggers
window.openStatusModal = (id, currentStatus) => {
  document.getElementById('statusBookingId').value = id;
  document.getElementById('newStatusSelect').value = currentStatus || 'Pending';
  document.getElementById('statusModal').classList.add('open');
};
window.closeStatusModal = () => document.getElementById('statusModal').classList.remove('open');

window.openAssignModal = (id, driverName, driverPhone, vehicleNum, fare) => {
  document.getElementById('assignBookingId').value = id;
  document.getElementById('assignDriverName').value = driverName || '';
  document.getElementById('assignDriverPhone').value = driverPhone || '+91 88868 30755';
  document.getElementById('assignVehicleNumber').value = vehicleNum || '';
  document.getElementById('assignFare').value = fare || '';
  document.getElementById('assignModal').classList.add('open');
};
window.closeAssignModal = () => document.getElementById('assignModal').classList.remove('open');

window.openNewBookingModal = () => {
  const dateInput = document.getElementById('nb_date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  document.getElementById('newBookingModal').classList.add('open');
};
window.closeNewBookingModal = () => document.getElementById('newBookingModal').classList.remove('open');

window.openAddServiceModal = () => {
  document.getElementById('editServiceId').value = '';
  document.getElementById('serviceEditForm').reset();
  document.getElementById('serviceEditModal').classList.add('open');
};

window.openEditServiceModal = (id) => {
  const service = allServicesData.find(s => s.id === id);
  if (!service) return;
  document.getElementById('editServiceId').value = service.id;
  document.getElementById('editServiceName').value = service.name;
  document.getElementById('editServicePrice').value = service.starting_price || '';
  document.getElementById('editServiceDesc').value = service.description;
  document.getElementById('editServiceFeatures').value = service.features || '';
  document.getElementById('serviceEditModal').classList.add('open');
};
window.closeServiceEditModal = () => document.getElementById('serviceEditModal').classList.remove('open');

window.deleteServiceRecord = async (id) => {
  if (!confirm(`Delete service offering #${id}?`)) return;
  try {
    const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadServices();
      alert('Service deleted successfully!');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

window.openAddDestinationModal = () => {
  document.getElementById('destModalTitle').textContent = 'Add New Destination';
  document.getElementById('destId').value = '';
  document.getElementById('destinationForm').reset();
  document.getElementById('destinationModal').classList.add('open');
};

window.openEditDestinationModal = (id) => {
  const dest = allDestinationsData.find(d => d.id === id);
  if (!dest) return;
  document.getElementById('destModalTitle').textContent = 'Edit Destination';
  document.getElementById('destId').value = dest.id;
  document.getElementById('dest_name').value = dest.name;
  document.getElementById('dest_subtitle').value = dest.subtitle || '';
  document.getElementById('dest_distance').value = dest.distance;
  document.getElementById('dest_duration').value = dest.duration;
  document.getElementById('dest_desc').value = dest.description;
  document.getElementById('destinationModal').classList.add('open');
};
window.closeDestinationModal = () => document.getElementById('destinationModal').classList.remove('open');

window.deleteDestinationRecord = async (id) => {
  if (!confirm(`Delete destination #${id}?`)) return;
  try {
    const res = await fetch(`/api/destinations/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadDestinations();
      alert('Destination deleted successfully!');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

window.openNewCallbackModal = () => {
  document.getElementById('newCallbackForm').reset();
  document.getElementById('newCallbackModal').classList.add('open');
};
window.closeNewCallbackModal = () => document.getElementById('newCallbackModal').classList.remove('open');

window.openMessageStatusModal = (id, currentStatus) => {
  document.getElementById('msgStatusId').value = id;
  document.getElementById('msgNewStatusSelect').value = currentStatus || 'New';
  document.getElementById('messageStatusModal').classList.add('open');
};
window.closeMessageStatusModal = () => document.getElementById('messageStatusModal').classList.remove('open');

window.deleteMessageRecord = async (id) => {
  if (!confirm(`Delete inquiry message #${id}?`)) return;
  try {
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadMessages();
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

window.openAddVehicleModal = () => {
  document.getElementById('vehicleModalTitle').textContent = 'Add New Vehicle';
  document.getElementById('vehicleId').value = '';
  document.getElementById('vehicleForm').reset();
  document.getElementById('vehicleModal').classList.add('open');
};

window.openEditVehicleModal = (id) => {
  const veh = allFleetData.find(v => v.id === id);
  if (!veh) return;
  document.getElementById('vehicleModalTitle').textContent = 'Edit Vehicle';
  document.getElementById('vehicleId').value = veh.id;
  document.getElementById('veh_name').value = veh.model_name;
  document.getElementById('veh_category').value = veh.category;
  document.getElementById('veh_capacity').value = veh.capacity;
  document.getElementById('veh_luggage').value = veh.luggage_bags;
  document.getElementById('veh_rate').value = veh.rate_per_km || '';
  document.getElementById('veh_desc').value = veh.description || '';
  document.getElementById('vehicleModal').classList.add('open');
};
window.closeVehicleModal = () => document.getElementById('vehicleModal').classList.remove('open');

window.deleteBookingRecord = async (id) => {
  if (!confirm(`Delete booking record #${id}?`)) return;
  try {
    const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadStats();
      loadBookings();
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

window.deleteVehicleRecord = async (id) => {
  if (!confirm('Are you sure you want to remove this vehicle from fleet?')) return;
  try {
    const res = await fetch(`/api/fleet/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadFleet();
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function escapeQuote(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'");
}
