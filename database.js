/**
 * YAKSHITH NANDH TRAVELS - Database Layer
 * Built with Node.js 22 built-in SQLite engine (node:sqlite)
 * Full control over every section of the website
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'travels.db');
const db = new DatabaseSync(dbPath);

// Performance optimizations
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Initialize Tables
 */
function initDatabase() {
  // 1. Bookings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_ref TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      service_type TEXT NOT NULL,
      preferred_vehicle TEXT NOT NULL,
      pickup_location TEXT NOT NULL,
      destination TEXT NOT NULL,
      travel_date TEXT NOT NULL,
      passenger_count INTEGER NOT NULL DEFAULT 1,
      additional_notes TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      driver_name TEXT,
      driver_phone TEXT,
      vehicle_number TEXT,
      fare_estimate TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Services Section Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      features TEXT,
      starting_price TEXT,
      is_active INTEGER DEFAULT 1
    );
  `);

  // 3. Vehicles Fleet Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS fleet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_name TEXT NOT NULL,
      category TEXT NOT NULL,
      capacity TEXT NOT NULL,
      luggage_bags TEXT NOT NULL,
      is_available INTEGER DEFAULT 1,
      description TEXT,
      rate_per_km TEXT,
      image_url TEXT
    );
  `);
  try {
    db.exec(`ALTER TABLE fleet ADD COLUMN image_url TEXT;`);
  } catch (e) {
    // column already exists
  }
  try {
    db.exec(`ALTER TABLE fleet ADD COLUMN airbags TEXT;`);
  } catch (e) {
    // column already exists
  }
  try {
    db.exec(`ALTER TABLE fleet ADD COLUMN daily_rent TEXT;`);
  } catch (e) {
    // column already exists
  }
  try {
    db.exec(`ALTER TABLE fleet ADD COLUMN mileage TEXT;`);
  } catch (e) {
    // column already exists
  }

  // 4. Destinations Section Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS destinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      distance TEXT NOT NULL,
      duration TEXT NOT NULL,
      description TEXT NOT NULL,
      is_popular INTEGER DEFAULT 1,
      image_url TEXT
    );
  `);
  try {
    db.exec(`ALTER TABLE destinations ADD COLUMN image_url TEXT;`);
  } catch (e) {
    // column already exists
  }

  // 5. Contact Inquiries Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'New',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Trips & Tour Packages Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      duration_days TEXT NOT NULL,
      subtitle TEXT,
      image_url TEXT,
      itinerary TEXT NOT NULL,
      vehicle_pricing TEXT NOT NULL,
      inclusions TEXT,
      exclusions TEXT,
      starting_price TEXT,
      is_popular INTEGER DEFAULT 1
    );
  `);

  // 6. Site Settings Table (Brand, Phone, Slogan, Announcement)
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  seedData();
}

/**
 * Seed Default Data for all website sections
 */
function seedData() {
  // Seed Settings
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM site_settings').get().count;
  if (settingsCount === 0) {
    const insertSetting = db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)');
    insertSetting.run('company_name', 'Yakshith Nandh Travels');
    insertSetting.run('slogan', 'Your Safety, Our Priority.');
    insertSetting.run('primary_phone', '+91 88868 30755');
    insertSetting.run('secondary_phone', '+91 97009 35888');
    insertSetting.run('email', 'yakshithnandhtravels.demo@gmail.com');
    insertSetting.run('location', 'Tirupati, Andhra Pradesh, India');
    insertSetting.run('announcement', '24/7 Available • Pilgrimage & Cab Service in Tirupati');
  }

  // Seed Services
  const servicesCount = db.prepare('SELECT COUNT(*) as count FROM services').get().count;
  if (servicesCount === 0) {
    const insertService = db.prepare(`
      INSERT INTO services (name, category, description, features, starting_price, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    insertService.run(
      'Local Trips & Sightseeing',
      'City Tour',
      'Explore the timeless heritage of Tirupati at your own comfortable pace with our flexible full-day and half-day city packages.',
      'Kapila Theertham, Padmavathi Temple, Govindaraja Temple, Shopping visits',
      '₹1,499'
    );
    insertService.run(
      'Outstation Trips',
      'Intercity',
      'Comfortable, long-distance intercity travel from Tirupati to major metropolitan and pilgrimage destinations across South India.',
      'Chennai, Bangalore, Hyderabad, Vellore Golden Temple, One-way & Round-trip',
      '₹14 / km'
    );
    insertService.run(
      'Airport Pickup & Drop',
      'Airport Taxi',
      'Zero delays, 100% punctual airport taxi transfers between Tirupati Airport (Renigunta) and city hotels or Tirumala hill.',
      'Tirupati Airport (TIR), Chennai Airport (MAA), Bangalore Airport (BLR), Flight tracking',
      '₹799'
    );
    insertService.run(
      'Temple Tours',
      'Pilgrimage',
      'Specialized spiritual pilgrimage itineraries designed around darshan timings, ghat road guidelines, and family convenience.',
      'Tirumala Balaji Special Darshan, Sri Kalahasti Rahu-Ketu, Kanipakam Vinayaka, Ghat road mastery',
      '₹2,199'
    );
  }

  // Seed Fleet
  const fleetCount = db.prepare('SELECT COUNT(*) as count FROM fleet').get().count;
  if (fleetCount === 0) {
    const insertFleet = db.prepare(`
      INSERT INTO fleet (model_name, category, capacity, luggage_bags, is_available, description, rate_per_km, airbags, daily_rent, mileage)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `);
    insertFleet.run(
      'Toyota Innova Crysta (Captain Seats)',
      'Luxury SUV',
      '7 Seater',
      '7 Airbags',
      'Plush captain seats, dual-zone AC, mountain ghat hill control, ideal for family pilgrimages.',
      '₹18 / km',
      '7 Airbags (Knee + Curtain)',
      '₹4,200 / day',
      '14 km/l'
    );
    insertFleet.run(
      'Toyota Innova Crysta (Bench Seating)',
      'Executive SUV',
      '8 Seater',
      '6 Airbags',
      '8 passenger capacity, generous luggage boot, smooth suspension on Tirumala hairpins.',
      '₹19 / km',
      '6 Airbags',
      '₹4,500 / day',
      '13.5 km/l'
    );
    insertFleet.run(
      'Premium City Sedan (Honda City / Ciaz)',
      'Executive Sedan',
      '4 Seater',
      'Dual Airbags',
      'Ultra-silent cabin, rapid cooling AC, cushioned ride for couples, seniors & small families.',
      '₹13 / km',
      'Dual Front Airbags',
      '₹2,499 / day',
      '20 km/l'
    );
  }

  // Seed Destinations
  const destCount = db.prepare('SELECT COUNT(*) as count FROM destinations').get().count;
  if (destCount === 0) {
    const insertDest = db.prepare(`
      INSERT INTO destinations (name, subtitle, distance, duration, description, is_popular)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    insertDest.run(
      'Tirumala',
      'Abode of Lord Sri Venkateswara',
      '22 km',
      '~45 mins (Ghat Road)',
      'Holy Seshachalam hills. Specialized darshan timings transit, theertham visits, and smooth hairpin navigation.'
    );
    insertDest.run(
      'Tirupati',
      'Heritage, Lakes & Historic Temples',
      'Local Circuit',
      'Flexible Half/Full Day',
      'Sri Padmavathi Ammavari Temple (Tiruchanur), holy waterfalls at Kapila Theertham, ISKCON & Govindaraja Temple.'
    );
    insertDest.run(
      'Sri Kalahasti',
      'Pancha Bhoota Vayu Linga Kshetra',
      '38 km',
      '~45 mins',
      'Sacred Rahu-Ketu Sarpa Dosha Nivarana Kshetra with magnificent monolithic Chola architecture on Swarnamukhi river.'
    );
    insertDest.run(
      'Chandragiri Fort',
      'Raja Mahal & Royal Architecture',
      '15 km',
      '~25 mins',
      '11th-century Vijayanagara empire citadel boasting palace Indo-Sarcenic crowns, ramparts, and evening sound & light shows.'
    );
    insertDest.run(
      'Kanipakam',
      'Sri Varasiddhi Vinayaka Swamy',
      '72 km',
      '~1.5 hrs',
      'Historic water-shrine temple revered for its self-manifested Swayambhu idol situated in a freshwater well.'
    );
  }

  // Seed Trips & Multi-Day Tour Packages
  const tripsCount = db.prepare('SELECT COUNT(*) as count FROM trips').get().count;
  if (tripsCount === 0) {
    const insertTrip = db.prepare(`
      INSERT INTO trips (title, duration_days, subtitle, image_url, itinerary, vehicle_pricing, inclusions, exclusions, starting_price, is_popular)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    insertTrip.run(
      '1 Day Tirumala Quick Darshan & Local Temples Package',
      '1 Day',
      'Tirumala Hill Shrine • Padmavathi Ammavari • Kapila Theertham',
      'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
      'Day 1: Morning pickup from Tirupati Hotel/Station -> Ascend Tirumala via Ghat Road -> Lord Balaji Darshan, Silathoranam, Chakra Theertham & Papavinasam -> Afternoon descent -> Sri Padmavathi Ammavari Temple (Tiruchanur) -> Kapila Theertham Shiva Temple -> Drop back at Tirupati.',
      'Sedan (Dzire / Etios): ₹2,999 | SUV (Innova): ₹4,499 | Luxury (Innova Crysta): ₹5,499 | Tempo (12 Seater): ₹7,999',
      'Tolls Included, Parkings Included, Driver Wage Included, Tirumala Ghat Road Permit, Fuel, 24*7 Support, Best Price Guaranteed',
      'Special Entry Darshan tickets, pilgrim meals, personal pooja expenses',
      '₹2,999'
    );

    insertTrip.run(
      '2 Days / 1 Night Divine Balaji & Kalahasti Kshetra Tour',
      '2 Days / 1 Night',
      'Tirumala Balaji • Sri Kalahasteeswara (Vayu Lingam) • Tiruchanur',
      'https://images.unsplash.com/photo-1609766857329-a1b7e1933010?auto=format&fit=crop&w=800&q=80',
      'Day 1: Arrival & Tirumala Balaji Hill Darshan -> Akhilandam, Matrusri Tarigonda Vengamamba Annaprasadam -> Evening descent & overnight stay in Tirupati.\nDay 2: Morning drive to Sri Kalahasti (38 km) for Rahu-Ketu Sarpa Dosha Nivarana Puja & Vayu Lingam darshan -> Afternoon visit to Tiruchanur Padmavathi Temple & ISKCON -> Evening drop at Tirupati Station/Airport.',
      'Sedan (Dzire / Etios): ₹5,499 | SUV (Innova): ₹7,999 | Luxury (Innova Crysta): ₹9,499 | Tempo (12 Seater): ₹13,999',
      'Tolls Included, Parkings Included, Driver Wage Included, Inter-District Travel, 24*7 Support, Best Price Guaranteed',
      'Hotel accommodation, temple puja tickets, personal expenses',
      '₹5,499'
    );

    insertTrip.run(
      '3 Days / 2 Nights Complete Divya Kshetra Pilgrimage Circuit',
      '3 Days / 2 Nights',
      'Tirumala + Sri Kalahasti + Kanipakam + Sripuram Golden Temple (Vellore)',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      'Day 1: Tirumala Hill Temple Balaji Darshan, Theertham tour, Kalyana Venkateswara Swamy Temple (Srinivasa Mangapuram).\nDay 2: Sacred Sri Kalahasteeswara Rahu-Ketu Puja Kshetra, Kapila Theertham water shrine & Tiruchanur Divine Mother darshan.\nDay 3: Swayambhu Varasiddhi Vinayaka Swamy (Kanipakam water shrine) -> Inter-state drive to Sripuram Golden Temple (Vellore, 1500kg gold leaf shrine) -> Return drop to Tirupati.',
      'Sedan (Dzire / Etios): ₹8,499 | SUV (Innova): ₹12,499 | Luxury (Innova Crysta): ₹14,999 | Tempo (12 Seater): ₹20,999',
      'Tolls Included, Parkings Included, Driver Wage Included, State Border Tax (AP-TN) Included, 24*7 Support, Best Price Guaranteed',
      'Hotel stay, VIP Darshan passes, meals',
      '₹8,499'
    );

    insertTrip.run(
      '4 Days / 3 Nights South India Spiritual Heritage Grand Tour',
      '4 Days / 3 Nights',
      'Tirumala • Kalahasti • Kanchipuram Temple City • Mahabalipuram • Vellore',
      'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?auto=format&fit=crop&w=800&q=80',
      'Day 1: Tirupati arrival, Tirumala Balaji Special Darshan & Hill Shrine scenic exploration.\nDay 2: Sri Kalahasti Rahu-Ketu Temple -> Afternoon drive to historic Kanchipuram (Ekambareswarar, Varadharaja Perumal & Kamakshi Amman).\nDay 3: Mahabalipuram UNESCO Shore Temples & Arjuna\'s Penance ocean heritage -> Drive to Vellore.\nDay 4: Sripuram Mahalakshmi Golden Temple darshan -> Kanipakam Ganesha water temple -> Return drop at Tirupati/Chennai.',
      'Sedan (Dzire / Etios): ₹12,999 | SUV (Innova): ₹18,499 | Luxury (Innova Crysta): ₹21,999 | Tempo (12 Seater): ₹29,999',
      'Tolls Included, Parkings Included, Driver Wage Included, Multi-State Border Tax (AP-TN) Included, 24*7 Support, Best Price Guaranteed',
      'Accommodations, monument entrance, darshan tickets',
      '₹12,999'
    );
  }

  // Seed Bookings
  const bookingCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
  if (bookingCount === 0) {
    const insertBooking = db.prepare(`
      INSERT INTO bookings (
        booking_ref, customer_name, customer_phone, service_type,
        preferred_vehicle, pickup_location, destination, travel_date,
        passenger_count, additional_notes, status, driver_name, driver_phone,
        vehicle_number, fare_estimate, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertBooking.run(
      'YNT-2026-1001',
      'Venkat Raman',
      '9849012345',
      'Temple Tours',
      'Toyota Innova Crysta',
      'Tirupati Central Railway Station',
      'Tirumala (Balaji Darshan)',
      '2026-11-05',
      6,
      'Senior citizens in group, need assistance at Alipiri checkpoint',
      'Confirmed',
      'K. Suresh Reddy',
      '+91 88868 30755',
      'AP 03 TX 4589',
      '₹2,800',
      '2026-11-04 06:30:00'
    );

    insertBooking.run(
      'YNT-2026-1002',
      'Ananya Sharma',
      '9700911223',
      'Airport Pickup & Drop',
      'Premium City Sedan',
      'Tirupati Airport (Renigunta - TIR)',
      'Hotel Bliss, Tirupati',
      '2026-11-04',
      2,
      'Indigo Flight 6E-728 arriving 14:15. Please hold placard.',
      'Driver Assigned',
      'M. Venkatesh',
      '+91 97009 35888',
      'AP 03 BT 2190',
      '₹1,200',
      '2026-11-04 07:15:00'
    );

    insertBooking.run(
      'YNT-2026-1003',
      'Rajesh Govindan',
      '9443298765',
      'Temple Tours',
      'Toyota Innova Crysta',
      'Fortune Grand Ridge Hotel, Tirupati',
      'Sri Kalahasti & Kanipakam',
      '2026-11-06',
      5,
      'Full-day Rahu-Ketu puja and Swayambhu Vinayaka temple package',
      'Pending',
      null,
      null,
      null,
      '₹4,200',
      '2026-11-04 08:45:00'
    );

    insertBooking.run(
      'YNT-2026-1004',
      'Pooja Deshmukh',
      '9822054321',
      'Local Trips & Sightseeing',
      'Premium City Sedan',
      'Tiruchanur Padmavathi Temple',
      'Chandragiri Fort & Kapila Theertham',
      '2026-11-03',
      3,
      'Completed sightseeing trip with light & sound show.',
      'Completed',
      'P. Naresh',
      '+91 88868 30755',
      'AP 03 CD 7788',
      '₹2,100',
      '2026-11-03 11:20:00'
    );
  }
}

/**
 * Helper: Generate Reference
 */
function generateBookingReference() {
  const currentYear = new Date().getFullYear();
  const maxQuery = db.prepare('SELECT MAX(id) as maxId FROM bookings');
  const result = maxQuery.get();
  const nextNumber = 1001 + (result && result.maxId ? result.maxId : 0);
  return `YNT-${currentYear}-${nextNumber}`;
}

// ==========================================================================
// BOOKINGS CRUD
// ==========================================================================
function createBooking(data) {
  const bookingRef = generateBookingReference();

  const stmt = db.prepare(`
    INSERT INTO bookings (
      booking_ref, customer_name, customer_phone, service_type,
      preferred_vehicle, pickup_location, destination, travel_date,
      passenger_count, additional_notes, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
  `);

  const info = stmt.run(
    bookingRef,
    data.customer_name.trim(),
    data.customer_phone.trim(),
    data.service_type,
    data.preferred_vehicle,
    data.pickup_location.trim(),
    data.destination.trim(),
    data.travel_date,
    parseInt(data.passenger_count, 10) || 1,
    data.additional_notes ? data.additional_notes.trim() : ''
  );

  return getBookingById(info.lastInsertRowid);
}

function getBookingById(id) {
  return db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
}

function getBookingByRef(ref) {
  return db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(ref);
}

function getAllBookings(options = {}) {
  let sql = 'SELECT * FROM bookings WHERE 1=1';
  const params = [];

  if (options.status && options.status !== 'All') {
    sql += ' AND status = ?';
    params.push(options.status);
  }

  if (options.search && options.search.trim()) {
    sql += ' AND (customer_name LIKE ? OR customer_phone LIKE ? OR booking_ref LIKE ? OR destination LIKE ?)';
    const term = `%${options.search.trim()}%`;
    params.push(term, term, term, term);
  }

  sql += ' ORDER BY id DESC';

  if (options.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(options.limit, 10));
  }

  return db.prepare(sql).all(...params);
}

function updateBookingStatus(id, status) {
  db.prepare(`
    UPDATE bookings
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, id);
  return getBookingById(id);
}

function assignBookingDriver(id, assignment) {
  db.prepare(`
    UPDATE bookings
    SET driver_name = ?,
        driver_phone = ?,
        vehicle_number = ?,
        fare_estimate = ?,
        status = 'Driver Assigned',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    assignment.driver_name || null,
    assignment.driver_phone || null,
    assignment.vehicle_number || null,
    assignment.fare_estimate || null,
    id
  );
  return getBookingById(id);
}

function deleteBooking(id) {
  return db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
}

function getBookingStats() {
  const total = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
  const pending = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'Pending'").get().count;
  const confirmed = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'Confirmed' OR status = 'Driver Assigned'").get().count;
  const completed = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'Completed'").get().count;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE travel_date = ?').get(todayStr).count;

  return {
    total,
    pending,
    confirmed,
    completed,
    today_scheduled: todayCount
  };
}

// ==========================================================================
// SERVICES MANAGEMENT
// ==========================================================================
function getAllServices() {
  return db.prepare('SELECT * FROM services ORDER BY id ASC').all();
}

function createService(data) {
  const stmt = db.prepare(`
    INSERT INTO services (name, category, description, features, starting_price, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    data.name.trim(),
    data.category ? data.category.trim() : 'Custom Package',
    data.description.trim(),
    data.features ? data.features.trim() : '',
    data.starting_price ? data.starting_price.trim() : 'Enquire',
    data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
  );
  return db.prepare('SELECT * FROM services WHERE id = ?').get(info.lastInsertRowid);
}

function updateService(id, data) {
  db.prepare(`
    UPDATE services
    SET name = ?, category = ?, description = ?, features = ?, starting_price = ?, is_active = ?
    WHERE id = ?
  `).run(
    data.name,
    data.category || 'Package',
    data.description,
    data.features || '',
    data.starting_price,
    data.is_active ? 1 : 0,
    id
  );
  return db.prepare('SELECT * FROM services WHERE id = ?').get(id);
}

function deleteService(id) {
  return db.prepare('DELETE FROM services WHERE id = ?').run(id);
}

// ==========================================================================
// FLEET MANAGEMENT
// ==========================================================================
function getFleet() {
  return db.prepare('SELECT * FROM fleet ORDER BY id ASC').all();
}

function addFleetVehicle(data) {
  const airbagsVal = String(data.airbags || data.luggage_bags || 'Dual Airbags');
  const dailyRentVal = data.daily_rent ? String(data.daily_rent).trim() : '';
  const mileageVal = data.mileage ? String(data.mileage).trim() : '';
  const info = db.prepare(`
    INSERT INTO fleet (model_name, category, capacity, luggage_bags, is_available, description, rate_per_km, image_url, airbags, daily_rent, mileage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.model_name,
    data.category || 'Standard',
    String(data.capacity || '4 Seater'),
    airbagsVal,
    data.is_available !== undefined ? (data.is_available ? 1 : 0) : 1,
    data.description || '',
    data.rate_per_km || '',
    data.image_url || '',
    airbagsVal,
    dailyRentVal,
    mileageVal
  );
  return db.prepare('SELECT * FROM fleet WHERE id = ?').get(info.lastInsertRowid);
}

function updateFleetVehicle(id, data) {
  const airbagsVal = String(data.airbags || data.luggage_bags || 'Dual Airbags');
  const dailyRentVal = data.daily_rent !== undefined ? String(data.daily_rent).trim() : '';
  const mileageVal = data.mileage !== undefined ? String(data.mileage).trim() : '';
  db.prepare(`
    UPDATE fleet
    SET model_name = ?, category = ?, capacity = ?, luggage_bags = ?, is_available = ?, description = ?, rate_per_km = ?, image_url = ?, airbags = ?, daily_rent = ?, mileage = ?
    WHERE id = ?
  `).run(
    data.model_name,
    data.category,
    String(data.capacity || '4 Seater'),
    airbagsVal,
    data.is_available ? 1 : 0,
    data.description,
    data.rate_per_km,
    data.image_url || '',
    airbagsVal,
    dailyRentVal,
    mileageVal,
    id
  );
  return db.prepare('SELECT * FROM fleet WHERE id = ?').get(id);
}

function deleteFleetVehicle(id) {
  return db.prepare('DELETE FROM fleet WHERE id = ?').run(id);
}

// ==========================================================================
// DESTINATIONS MANAGEMENT
// ==========================================================================
function getAllDestinations() {
  return db.prepare('SELECT * FROM destinations ORDER BY id ASC').all();
}

function createDestination(data) {
  const stmt = db.prepare(`
    INSERT INTO destinations (name, subtitle, distance, duration, description, is_popular, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    data.name.trim(),
    data.subtitle ? data.subtitle.trim() : 'Pilgrimage Heritage',
    data.distance ? data.distance.trim() : 'Local',
    data.duration ? data.duration.trim() : 'Half Day',
    data.description.trim(),
    data.is_popular !== undefined ? (data.is_popular ? 1 : 0) : 1,
    data.image_url ? data.image_url.trim() : ''
  );
  return db.prepare('SELECT * FROM destinations WHERE id = ?').get(info.lastInsertRowid);
}

function updateDestination(id, data) {
  db.prepare(`
    UPDATE destinations
    SET name = ?, subtitle = ?, distance = ?, duration = ?, description = ?, is_popular = ?, image_url = ?
    WHERE id = ?
  `).run(
    data.name,
    data.subtitle || '',
    data.distance,
    data.duration,
    data.description,
    data.is_popular ? 1 : 0,
    data.image_url || '',
    id
  );
  return db.prepare('SELECT * FROM destinations WHERE id = ?').get(id);
}

function deleteDestination(id) {
  return db.prepare('DELETE FROM destinations WHERE id = ?').run(id);
}

// ==========================================================================
// TRIPS & TOUR PACKAGES MANAGEMENT
// ==========================================================================
function getAllTrips() {
  return db.prepare('SELECT * FROM trips ORDER BY id ASC').all();
}

function getTripById(id) {
  return db.prepare('SELECT * FROM trips WHERE id = ?').get(id);
}

function createTrip(data) {
  const stmt = db.prepare(`
    INSERT INTO trips (title, duration_days, subtitle, image_url, itinerary, vehicle_pricing, inclusions, exclusions, starting_price, is_popular)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    data.title.trim(),
    data.duration_days ? data.duration_days.trim() : '1 Day',
    data.subtitle ? data.subtitle.trim() : '',
    data.image_url ? data.image_url.trim() : '',
    data.itinerary ? data.itinerary.trim() : '',
    data.vehicle_pricing ? data.vehicle_pricing.trim() : '',
    data.inclusions ? data.inclusions.trim() : 'Tolls Included, Parkings Included, Driver Wage Included, 24*7 Support, Best Price Guaranteed',
    data.exclusions ? data.exclusions.trim() : '',
    data.starting_price ? data.starting_price.trim() : '',
    data.is_popular !== undefined ? (data.is_popular ? 1 : 0) : 1
  );
  return db.prepare('SELECT * FROM trips WHERE id = ?').get(info.lastInsertRowid);
}

function updateTrip(id, data) {
  db.prepare(`
    UPDATE trips
    SET title = ?, duration_days = ?, subtitle = ?, image_url = ?, itinerary = ?, vehicle_pricing = ?, inclusions = ?, exclusions = ?, starting_price = ?, is_popular = ?
    WHERE id = ?
  `).run(
    data.title,
    data.duration_days || '1 Day',
    data.subtitle || '',
    data.image_url || '',
    data.itinerary || '',
    data.vehicle_pricing || '',
    data.inclusions || '',
    data.exclusions || '',
    data.starting_price || '',
    data.is_popular ? 1 : 0,
    id
  );
  return db.prepare('SELECT * FROM trips WHERE id = ?').get(id);
}

function deleteTrip(id) {
  return db.prepare('DELETE FROM trips WHERE id = ?').run(id);
}

// ==========================================================================
// CONTACT INQUIRIES
// ==========================================================================
function createContactInquiry(data) {
  const info = db.prepare(`
    INSERT INTO contact_inquiries (name, phone, email, message)
    VALUES (?, ?, ?, ?)
  `).run(
    data.name.trim(),
    data.phone.trim(),
    data.email ? data.email.trim() : '',
    data.message.trim()
  );
  return db.prepare('SELECT * FROM contact_inquiries WHERE id = ?').get(info.lastInsertRowid);
}

function getAllContactInquiries() {
  return db.prepare('SELECT * FROM contact_inquiries ORDER BY id DESC').all();
}

function updateContactStatus(id, status) {
  db.prepare('UPDATE contact_inquiries SET status = ? WHERE id = ?').run(status, id);
  return db.prepare('SELECT * FROM contact_inquiries WHERE id = ?').get(id);
}

function deleteContactInquiry(id) {
  return db.prepare('DELETE FROM contact_inquiries WHERE id = ?').run(id);
}

// ==========================================================================
// SITE SETTINGS
// ==========================================================================
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return settings;
}

function updateSettings(settingsMap) {
  const stmt = db.prepare(`
    INSERT INTO site_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  for (const [key, val] of Object.entries(settingsMap)) {
    stmt.run(key, val.toString());
  }
  return getSettings();
}

// Initialize on load
initDatabase();

module.exports = {
  createBooking,
  getBookingById,
  getBookingByRef,
  getAllBookings,
  updateBookingStatus,
  assignBookingDriver,
  deleteBooking,
  getBookingStats,
  getAllServices,
  createService,
  updateService,
  deleteService,
  getFleet,
  addFleetVehicle,
  updateFleetVehicle,
  deleteFleetVehicle,
  getAllDestinations,
  createDestination,
  updateDestination,
  deleteDestination,
  getAllTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  createContactInquiry,
  getAllContactInquiries,
  updateContactStatus,
  deleteContactInquiry,
  getSettings,
  updateSettings
};
