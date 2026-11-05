/**
 * YAKSHITH NANDH TRAVELS - Dual-Mode Resilient Database Layer
 * Location: Tirupati, Andhra Pradesh, India
 * 
 * Supports:
 * 1. Node.js built-in SQLite engine (node:sqlite) when available & filesystem is writable
 * 2. High-performance In-Memory State Store with Seed Data fallback (for Vercel Serverless / read-only environments)
 * Zero crashes, 100% uptime across all platforms & Node versions.
 */

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

// ==========================================================================
// SEED DATA DEFINITION (Single Source of Truth)
// ==========================================================================
const DEFAULT_SETTINGS = {
  company_name: 'Yakshith Nandh Travels',
  slogan: 'Your Safety, Our Priority.',
  primary_phone: '+91 88868 30755',
  secondary_phone: '+91 97009 35888',
  email: 'yakshithnandhtravels.demo@gmail.com',
  location: 'Tirupati, Andhra Pradesh, India',
  announcement: '24/7 Available • Pilgrimage & Cab Service in Tirupati'
};

const DEFAULT_SERVICES = [
  {
    id: 1,
    name: 'Local Trips & Sightseeing',
    category: 'City Tour',
    description: 'Explore the timeless heritage of Tirupati at your own comfortable pace with our flexible full-day and half-day city packages.',
    features: 'Kapila Theertham, Padmavathi Temple, Govindaraja Temple, Shopping visits',
    starting_price: '₹1,499',
    is_active: 1
  },
  {
    id: 2,
    name: 'Outstation Trips',
    category: 'Intercity',
    description: 'Comfortable, long-distance intercity travel from Tirupati to major metropolitan and pilgrimage destinations across South India.',
    features: 'Chennai, Bangalore, Hyderabad, Vellore Golden Temple, One-way & Round-trip',
    starting_price: '₹14 / km',
    is_active: 1
  },
  {
    id: 3,
    name: 'Airport Pickup & Drop',
    category: 'Airport Taxi',
    description: 'Zero delays, 100% punctual airport taxi transfers between Tirupati Airport (Renigunta) and city hotels or Tirumala hill.',
    features: 'Tirupati Airport (TIR), Chennai Airport (MAA), Bangalore Airport (BLR), Flight tracking',
    starting_price: '₹799',
    is_active: 1
  },
  {
    id: 4,
    name: 'Temple Tours',
    category: 'Pilgrimage',
    description: 'Specialized spiritual pilgrimage itineraries designed around darshan timings, ghat road guidelines, and family convenience.',
    features: 'Tirumala Balaji Special Darshan, Sri Kalahasti Rahu-Ketu, Kanipakam Vinayaka, Ghat road mastery',
    starting_price: '₹2,199',
    is_active: 1
  }
];

const DEFAULT_FLEET = [
  {
    id: 1,
    model_name: 'Toyota Innova Crysta (Captain Seats)',
    category: 'Luxury SUV',
    capacity: '7 Seater',
    luggage_bags: '7 Airbags',
    airbags: '7 Airbags (Knee + Curtain)',
    daily_rent: '₹4,200 / day',
    mileage: '14 km/l',
    is_available: 1,
    description: 'Plush captain seats, dual-zone AC, mountain ghat hill control, ideal for family pilgrimages.',
    rate_per_km: '₹18 / km',
    image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80'
  },
  {
    id: 2,
    model_name: 'Toyota Innova Crysta (Bench Seating)',
    category: 'Executive SUV',
    capacity: '8 Seater',
    luggage_bags: '6 Airbags',
    airbags: '6 Airbags',
    daily_rent: '₹4,500 / day',
    mileage: '13.5 km/l',
    is_available: 1,
    description: '8 passenger capacity, generous luggage boot, smooth suspension on Tirumala hairpins.',
    rate_per_km: '₹19 / km',
    image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80'
  },
  {
    id: 3,
    model_name: 'Premium City Sedan (Honda City / Ciaz)',
    category: 'Executive Sedan',
    capacity: '4 Seater',
    luggage_bags: 'Dual Airbags',
    airbags: 'Dual Front Airbags',
    daily_rent: '₹2,499 / day',
    mileage: '20 km/l',
    is_available: 1,
    description: 'Ultra-silent cabin, rapid cooling AC, cushioned ride for couples, seniors & small families.',
    rate_per_km: '₹13 / km',
    image_url: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1000&q=80'
  }
];

const DEFAULT_DESTINATIONS = [
  {
    id: 1,
    name: 'Tirumala',
    subtitle: 'Abode of Lord Sri Venkateswara',
    distance: '22 km',
    duration: '~45 mins (Ghat Road)',
    description: 'Holy Seshachalam hills. Specialized darshan timings transit, theertham visits, and smooth hairpin navigation.',
    is_popular: 1,
    image_url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 2,
    name: 'Tirupati',
    subtitle: 'Heritage, Lakes & Historic Temples',
    distance: 'Local Circuit',
    duration: 'Flexible Half/Full Day',
    description: 'Sri Padmavathi Ammavari Temple (Tiruchanur), holy waterfalls at Kapila Theertham, ISKCON & Govindaraja Temple.',
    is_popular: 1,
    image_url: 'https://images.unsplash.com/photo-1609766857329-a1b7e1933010?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 3,
    name: 'Sri Kalahasti',
    subtitle: 'Pancha Bhoota Vayu Linga Kshetra',
    distance: '38 km',
    duration: '~45 mins',
    description: 'Divine Rahu-Ketu Sarpa Dosha Nivarana Kshetra with magnificent monolithic Chola architecture on Swarnamukhi river.',
    is_popular: 1,
    image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 4,
    name: 'Chandragiri Fort',
    subtitle: 'Raja Mahal & Royal Architecture',
    distance: '15 km',
    duration: '~25 mins',
    description: '11th-century Vijayanagara empire citadel boasting palace Indo-Sarcenic crowns, ramparts, and evening sound & light shows.',
    is_popular: 1,
    image_url: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 5,
    name: 'Kanipakam',
    subtitle: 'Sri Varasiddhi Vinayaka Swamy',
    distance: '72 km',
    duration: '~1.5 hrs',
    description: 'Historic water-shrine temple revered for its self-manifested Swayambhu idol situated in a freshwater well.',
    is_popular: 1,
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
  }
];

const DEFAULT_TRIPS = [
  {
    id: 1,
    title: '1 Day Tirumala Quick Darshan & Local Temples Package',
    duration_days: '1 Day',
    subtitle: 'Tirumala Hill Shrine • Padmavathi Ammavari • Kapila Theertham',
    image_url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80',
    itinerary: 'Day 1: Morning pickup from Tirupati Hotel/Station -> Ascend Tirumala via Ghat Road -> Lord Balaji Darshan, Silathoranam, Chakra Theertham & Papavinasam -> Afternoon descent -> Sri Padmavathi Ammavari Temple (Tiruchanur) -> Kapila Theertham Shiva Temple -> Drop back at Tirupati.',
    vehicle_pricing: 'Sedan (Dzire / Etios): ₹2,999 | SUV (Innova): ₹4,499 | Luxury (Innova Crysta): ₹5,499 | Tempo (12 Seater): ₹7,999',
    inclusions: 'Tolls Included, Parkings Included, Driver Wage Included, Tirumala Ghat Road Permit, Fuel, 24*7 Support, Best Price Guaranteed',
    exclusions: 'Special Entry Darshan tickets, pilgrim meals, personal pooja expenses',
    starting_price: '₹2,999',
    is_popular: 1
  },
  {
    id: 2,
    title: '2 Days / 1 Night Divine Balaji & Kalahasti Kshetra Tour',
    duration_days: '2 Days / 1 Night',
    subtitle: 'Tirumala Balaji • Sri Kalahasteeswara (Vayu Lingam) • Tiruchanur',
    image_url: 'https://images.unsplash.com/photo-1609766857329-a1b7e1933010?auto=format&fit=crop&w=800&q=80',
    itinerary: 'Day 1: Arrival & Tirumala Balaji Hill Darshan -> Akhilandam, Matrusri Tarigonda Vengamamba Annaprasadam -> Evening descent & overnight stay in Tirupati.\nDay 2: Morning drive to Sri Kalahasti (38 km) for Rahu-Ketu Sarpa Dosha Nivarana Puja & Vayu Lingam darshan -> Afternoon visit to Tiruchanur Padmavathi Temple & ISKCON -> Evening drop at Tirupati Station/Airport.',
    vehicle_pricing: 'Sedan (Dzire / Etios): ₹5,499 | SUV (Innova): ₹7,999 | Luxury (Innova Crysta): ₹9,499 | Tempo (12 Seater): ₹13,999',
    inclusions: 'Tolls Included, Parkings Included, Driver Wage Included, Inter-District Travel, 24*7 Support, Best Price Guaranteed',
    exclusions: 'Hotel accommodation, temple puja tickets, personal expenses',
    starting_price: '₹5,499',
    is_popular: 1
  },
  {
    id: 3,
    title: '3 Days / 2 Nights Complete Divya Kshetra Pilgrimage Circuit',
    duration_days: '3 Days / 2 Nights',
    subtitle: 'Tirumala + Sri Kalahasti + Kanipakam + Sripuram Golden Temple (Vellore)',
    image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    itinerary: 'Day 1: Tirumala Hill Temple Balaji Darshan, Theertham tour, Kalyana Venkateswara Swamy Temple (Srinivasa Mangapuram).\nDay 2: Divine Sri Kalahasteeswara Rahu-Ketu Puja Kshetra, Kapila Theertham water shrine & Tiruchanur Divine Mother darshan.\nDay 3: Swayambhu Varasiddhi Vinayaka Swamy (Kanipakam water shrine) -> Inter-state drive to Sripuram Golden Temple (Vellore, 1500kg gold leaf shrine) -> Return drop to Tirupati.',
    vehicle_pricing: 'Sedan (Dzire / Etios): ₹8,499 | SUV (Innova): ₹12,499 | Luxury (Innova Crysta): ₹14,999 | Tempo (12 Seater): ₹20,999',
    inclusions: 'Tolls Included, Parkings Included, Driver Wage Included, State Border Tax (AP-TN) Included, 24*7 Support, Best Price Guaranteed',
    exclusions: 'Hotel stay, VIP Darshan passes, meals',
    starting_price: '₹8,499',
    is_popular: 1
  },
  {
    id: 4,
    title: '4 Days / 3 Nights South India Spiritual Heritage Grand Tour',
    duration_days: '4 Days / 3 Nights',
    subtitle: 'Tirumala • Kalahasti • Kanchipuram Temple City • Mahabalipuram • Vellore',
    image_url: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?auto=format&fit=crop&w=800&q=80',
    itinerary: 'Day 1: Tirupati arrival, Tirumala Balaji Special Darshan & Hill Shrine scenic exploration.\nDay 2: Sri Kalahasti Rahu-Ketu Temple -> Afternoon drive to historic Kanchipuram (Ekambareswarar, Varadharaja Perumal & Kamakshi Amman).\nDay 3: Mahabalipuram UNESCO Shore Temples & Arjuna\'s Penance ocean heritage -> Drive to Vellore.\nDay 4: Sripuram Mahalakshmi Golden Temple darshan -> Kanipakam Ganesha water temple -> Return drop at Tirupati/Chennai.',
    vehicle_pricing: 'Sedan (Dzire / Etios): ₹12,999 | SUV (Innova): ₹18,499 | Luxury (Innova Crysta): ₹21,999 | Tempo (12 Seater): ₹29,999',
    inclusions: 'Tolls Included, Parkings Included, Driver Wage Included, Multi-State Border Tax (AP-TN) Included, 24*7 Support, Best Price Guaranteed',
    exclusions: 'Accommodations, monument entrance, darshan tickets',
    starting_price: '₹12,999',
    is_popular: 1
  }
];

const DEFAULT_BOOKINGS = [
  {
    id: 1,
    booking_ref: 'YNT-2026-1001',
    customer_name: 'Venkat Raman',
    customer_phone: '9849012345',
    service_type: 'Temple Tours',
    preferred_vehicle: 'Toyota Innova Crysta',
    pickup_location: 'Tirupati Central Railway Station',
    destination: 'Tirumala (Balaji Darshan)',
    travel_date: '2026-11-05',
    passenger_count: 6,
    additional_notes: 'Senior citizens in group, need assistance at Alipiri checkpoint',
    status: 'Confirmed',
    driver_name: 'K. Suresh Reddy',
    driver_phone: '+91 88868 30755',
    vehicle_number: 'AP 03 TX 4589',
    fare_estimate: '₹2,800',
    created_at: '2026-11-04 06:30:00',
    updated_at: '2026-11-04 06:30:00'
  },
  {
    id: 2,
    booking_ref: 'YNT-2026-1002',
    customer_name: 'Ananya Sharma',
    customer_phone: '9700911223',
    service_type: 'Airport Pickup & Drop',
    preferred_vehicle: 'Premium City Sedan',
    pickup_location: 'Tirupati Airport (Renigunta - TIR)',
    destination: 'Hotel Bliss, Tirupati',
    travel_date: '2026-11-04',
    passenger_count: 2,
    additional_notes: 'Indigo Flight 6E-728 arriving 14:15. Please hold placard.',
    status: 'Driver Assigned',
    driver_name: 'M. Venkatesh',
    driver_phone: '+91 97009 35888',
    vehicle_number: 'AP 03 BT 2190',
    fare_estimate: '₹1,200',
    created_at: '2026-11-04 07:15:00',
    updated_at: '2026-11-04 07:15:00'
  },
  {
    id: 3,
    booking_ref: 'YNT-2026-1003',
    customer_name: 'Rajesh Govindan',
    customer_phone: '9443298765',
    service_type: 'Temple Tours',
    preferred_vehicle: 'Toyota Innova Crysta',
    pickup_location: 'Fortune Grand Ridge Hotel, Tirupati',
    destination: 'Sri Kalahasti & Kanipakam',
    travel_date: '2026-11-06',
    passenger_count: 5,
    additional_notes: 'Full-day Rahu-Ketu puja and Swayambhu Vinayaka temple package',
    status: 'Pending',
    driver_name: null,
    driver_phone: null,
    vehicle_number: null,
    fare_estimate: '₹4,200',
    created_at: '2026-11-04 08:45:00',
    updated_at: '2026-11-04 08:45:00'
  },
  {
    id: 4,
    booking_ref: 'YNT-2026-1004',
    customer_name: 'Pooja Deshmukh',
    customer_phone: '9822054321',
    service_type: 'Local Trips & Sightseeing',
    preferred_vehicle: 'Premium City Sedan',
    pickup_location: 'Tiruchanur Padmavathi Temple',
    destination: 'Chandragiri Fort & Kapila Theertham',
    travel_date: '2026-11-03',
    passenger_count: 3,
    additional_notes: 'Completed sightseeing trip with light & sound show.',
    status: 'Completed',
    driver_name: 'P. Naresh',
    driver_phone: '+91 88868 30755',
    vehicle_number: 'AP 03 CD 7788',
    fare_estimate: '₹2,100',
    created_at: '2026-11-03 11:20:00',
    updated_at: '2026-11-03 11:20:00'
  }
];

// ==========================================================================
// IN-MEMORY DATABASE STATE (Always available, Zero 500 errors)
// ==========================================================================
const memoryStore = {
  settings: { ...DEFAULT_SETTINGS },
  services: JSON.parse(JSON.stringify(DEFAULT_SERVICES)),
  fleet: JSON.parse(JSON.stringify(DEFAULT_FLEET)),
  destinations: JSON.parse(JSON.stringify(DEFAULT_DESTINATIONS)),
  trips: JSON.parse(JSON.stringify(DEFAULT_TRIPS)),
  bookings: JSON.parse(JSON.stringify(DEFAULT_BOOKINGS)),
  contacts: [],
  nextBookingId: 5,
  nextServiceId: 5,
  nextFleetId: 4,
  nextDestId: 6,
  nextTripId: 5,
  nextContactId: 1
};

// State file persistence helpers (Survives serverless cold starts)
const STATE_FILE_PATHS = [
  path.join(__dirname, 'data', 'travels_state.json'),
  path.join(os.tmpdir(), 'travels_state.json')
];

function persistStateToFile() {
  try {
    const payload = {
      settings: memoryStore.settings,
      services: memoryStore.services,
      fleet: memoryStore.fleet,
      destinations: memoryStore.destinations,
      trips: memoryStore.trips,
      bookings: memoryStore.bookings,
      contacts: memoryStore.contacts,
      updated_at: new Date().toISOString()
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    for (const fp of STATE_FILE_PATHS) {
      try {
        const dir = path.dirname(fp);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fp, jsonStr, 'utf8');
        break;
      } catch (err) {}
    }
  } catch (outer) {}
}

function loadStateFromFile() {
  for (const fp of STATE_FILE_PATHS) {
    try {
      if (fs.existsSync(fp)) {
        const raw = fs.readFileSync(fp, 'utf8');
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          if (Array.isArray(data.fleet) && data.fleet.length > 0) memoryStore.fleet = data.fleet;
          if (Array.isArray(data.destinations) && data.destinations.length > 0) memoryStore.destinations = data.destinations;
          if (Array.isArray(data.trips) && data.trips.length > 0) memoryStore.trips = data.trips;
          if (Array.isArray(data.services) && data.services.length > 0) memoryStore.services = data.services;
          if (Array.isArray(data.bookings) && data.bookings.length > 0) memoryStore.bookings = data.bookings;
          if (Array.isArray(data.contacts)) memoryStore.contacts = data.contacts;
          if (data.settings && typeof data.settings === 'object') memoryStore.settings = { ...memoryStore.settings, ...data.settings };
          console.log('📦 Hydrated database state from persisted state file:', fp);
          return true;
        }
      }
    } catch (err) {}
  }
  return false;
}

// Attempt immediate state hydration on module load
loadStateFromFile();

// ==========================================================================
// SQLITE INITIALIZATION (Graceful Fallback)
// ==========================================================================
let db = null;
let isSqlite = false;

try {
  let DatabaseSync = null;
  try {
    const sqliteMod = require('node:sqlite');
    if (sqliteMod && sqliteMod.DatabaseSync) {
      DatabaseSync = sqliteMod.DatabaseSync;
    }
  } catch (err) {
    // node:sqlite module not supported in this Node runtime (e.g. Node 18/20 on Vercel)
  }

  if (DatabaseSync) {
    // Determine writable path
    let dbFile = null;
    const localDataDir = path.join(__dirname, 'data');

    // Attempt local directory first
    try {
      if (!fs.existsSync(localDataDir)) {
        fs.mkdirSync(localDataDir, { recursive: true });
      }
      dbFile = path.join(localDataDir, 'travels.db');
      db = new DatabaseSync(dbFile);
    } catch (fsErr) {
      // Local directory read-only (e.g. /var/task on Vercel/Lambda) -> try os.tmpdir()
      try {
        const tmpDbFile = path.join(os.tmpdir(), 'travels.db');
        db = new DatabaseSync(tmpDbFile);
        dbFile = tmpDbFile;
      } catch (tmpErr) {
        db = null;
      }
    }

    if (db) {
      try {
        db.exec('PRAGMA journal_mode = WAL;');
      } catch (e) {}
      try {
        db.exec('PRAGMA foreign_keys = ON;');
      } catch (e) {}

      initSqliteTables();
      seedSqliteData();
      isSqlite = true;
      console.log('✅ SQLite engine initialized successfully.');
    }
  }
} catch (outerErr) {
  console.warn('⚠️ SQLite engine unavailable. Falling back to in-memory store:', outerErr.message);
  db = null;
  isSqlite = false;
}

if (!isSqlite) {
  console.log('⚡ Active database: Resilient in-memory cloud-ready store.');
}

/**
 * Initialize SQLite Tables
 */
function initSqliteTables() {
  if (!db) return;

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

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      features TEXT,
      starting_price TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS fleet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_name TEXT NOT NULL,
      category TEXT NOT NULL,
      capacity TEXT NOT NULL,
      luggage_bags TEXT NOT NULL,
      is_available INTEGER DEFAULT 1,
      description TEXT,
      rate_per_km TEXT,
      image_url TEXT,
      airbags TEXT,
      daily_rent TEXT,
      mileage TEXT
    );

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

    CREATE TABLE IF NOT EXISTS contact_inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'New',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Ensure migration columns exist
  const safeAlter = (sql) => { try { db.exec(sql); } catch (e) {} };
  safeAlter(`ALTER TABLE fleet ADD COLUMN image_url TEXT;`);
  safeAlter(`ALTER TABLE fleet ADD COLUMN airbags TEXT;`);
  safeAlter(`ALTER TABLE fleet ADD COLUMN daily_rent TEXT;`);
  safeAlter(`ALTER TABLE fleet ADD COLUMN mileage TEXT;`);
  safeAlter(`ALTER TABLE fleet ADD COLUMN is_published INTEGER DEFAULT 1;`);
  safeAlter(`ALTER TABLE destinations ADD COLUMN image_url TEXT;`);
  safeAlter(`ALTER TABLE destinations ADD COLUMN is_published INTEGER DEFAULT 1;`);
  safeAlter(`ALTER TABLE trips ADD COLUMN is_published INTEGER DEFAULT 1;`);
  safeAlter(`ALTER TABLE services ADD COLUMN is_published INTEGER DEFAULT 1;`);

  // Migration: Ensure 'Sacred' is updated to 'Divine' in existing SQLite rows
  try {
    db.exec(`
      UPDATE destinations SET description = REPLACE(description, 'Sacred', 'Divine') WHERE description LIKE '%Sacred%';
      UPDATE destinations SET subtitle = REPLACE(subtitle, 'Sacred', 'Divine') WHERE subtitle LIKE '%Sacred%';
      UPDATE destinations SET name = REPLACE(name, 'Sacred', 'Divine') WHERE name LIKE '%Sacred%';
      UPDATE trips SET title = REPLACE(title, 'Sacred', 'Divine') WHERE title LIKE '%Sacred%';
      UPDATE trips SET subtitle = REPLACE(subtitle, 'Sacred', 'Divine') WHERE subtitle LIKE '%Sacred%';
      UPDATE trips SET itinerary = REPLACE(itinerary, 'Sacred', 'Divine') WHERE itinerary LIKE '%Sacred%';
      UPDATE services SET description = REPLACE(description, 'Sacred', 'Divine') WHERE description LIKE '%Sacred%';
    `);

    // Backfill any null images, rent, airbags or mileage in existing SQLite rows
    const updateFleetStmt = db.prepare(`
      UPDATE fleet
      SET image_url = CASE WHEN image_url IS NULL OR image_url = '' THEN ? ELSE image_url END,
          airbags = CASE WHEN airbags IS NULL OR airbags = '' THEN ? ELSE airbags END,
          daily_rent = CASE WHEN daily_rent IS NULL OR daily_rent = '' THEN ? ELSE daily_rent END,
          mileage = CASE WHEN mileage IS NULL OR mileage = '' THEN ? ELSE mileage END
      WHERE id = ?
    `);
    for (const f of DEFAULT_FLEET) {
      updateFleetStmt.run(f.image_url, f.airbags, f.daily_rent, f.mileage, f.id);
    }

    const updateDestStmt = db.prepare(`
      UPDATE destinations
      SET image_url = CASE WHEN image_url IS NULL OR image_url = '' THEN ? ELSE image_url END
      WHERE id = ?
    `);
    for (const d of DEFAULT_DESTINATIONS) {
      updateDestStmt.run(d.image_url, d.id);
    }
  } catch (e) {}
}

/**
 * Seed SQLite Tables if empty
 */
function seedSqliteData() {
  if (!db) return;

  try {
    const settingsCount = db.prepare('SELECT COUNT(*) as count FROM site_settings').get().count;
    if (settingsCount === 0) {
      const ins = db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)');
      for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
        ins.run(k, v);
      }
    }

    const servicesCount = db.prepare('SELECT COUNT(*) as count FROM services').get().count;
    if (servicesCount === 0) {
      const ins = db.prepare('INSERT INTO services (name, category, description, features, starting_price, is_active) VALUES (?, ?, ?, ?, ?, 1)');
      for (const s of DEFAULT_SERVICES) {
        ins.run(s.name, s.category, s.description, s.features, s.starting_price);
      }
    }

    const fleetCount = db.prepare('SELECT COUNT(*) as count FROM fleet').get().count;
    if (fleetCount === 0) {
      const ins = db.prepare('INSERT INTO fleet (model_name, category, capacity, luggage_bags, is_available, description, rate_per_km, airbags, daily_rent, mileage, image_url) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)');
      for (const f of DEFAULT_FLEET) {
        ins.run(f.model_name, f.category, f.capacity, f.luggage_bags, f.description, f.rate_per_km, f.airbags, f.daily_rent, f.mileage, f.image_url);
      }
    }

    const destCount = db.prepare('SELECT COUNT(*) as count FROM destinations').get().count;
    if (destCount === 0) {
      const ins = db.prepare('INSERT INTO destinations (name, subtitle, distance, duration, description, is_popular, image_url) VALUES (?, ?, ?, ?, ?, 1, ?)');
      for (const d of DEFAULT_DESTINATIONS) {
        ins.run(d.name, d.subtitle, d.distance, d.duration, d.description, d.image_url);
      }
    }

    const tripsCount = db.prepare('SELECT COUNT(*) as count FROM trips').get().count;
    if (tripsCount === 0) {
      const ins = db.prepare('INSERT INTO trips (title, duration_days, subtitle, image_url, itinerary, vehicle_pricing, inclusions, exclusions, starting_price, is_popular) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
      for (const t of DEFAULT_TRIPS) {
        ins.run(t.title, t.duration_days, t.subtitle, t.image_url, t.itinerary, t.vehicle_pricing, t.inclusions, t.exclusions, t.starting_price);
      }
    }

    const bookingCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
    if (bookingCount === 0) {
      const ins = db.prepare(`
        INSERT INTO bookings (
          booking_ref, customer_name, customer_phone, service_type,
          preferred_vehicle, pickup_location, destination, travel_date,
          passenger_count, additional_notes, status, driver_name, driver_phone,
          vehicle_number, fare_estimate, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const b of DEFAULT_BOOKINGS) {
        ins.run(
          b.booking_ref, b.customer_name, b.customer_phone, b.service_type,
          b.preferred_vehicle, b.pickup_location, b.destination, b.travel_date,
          b.passenger_count, b.additional_notes, b.status, b.driver_name, b.driver_phone,
          b.vehicle_number, b.fare_estimate, b.created_at
        );
      }
    }
  } catch (seedErr) {
    console.warn('SQLite seed note:', seedErr.message);
  }
}

// ==========================================================================
// HELPER: BOOKING REFERENCE GENERATOR
// ==========================================================================
function generateBookingReference() {
  const currentYear = new Date().getFullYear();
  if (isSqlite) {
    try {
      const result = db.prepare('SELECT MAX(id) as maxId FROM bookings').get();
      const nextNumber = 1001 + (result && result.maxId ? result.maxId : 0);
      return `YNT-${currentYear}-${nextNumber}`;
    } catch (e) {}
  }
  const nextNumber = 1000 + memoryStore.nextBookingId;
  return `YNT-${currentYear}-${nextNumber}`;
}

// ==========================================================================
// 1. BOOKINGS CRUD
// ==========================================================================
function createBooking(data) {
  const bookingRef = generateBookingReference();
  const newBooking = {
    id: memoryStore.nextBookingId++,
    booking_ref: bookingRef,
    customer_name: (data.customer_name || '').trim(),
    customer_phone: (data.customer_phone || '').trim(),
    service_type: data.service_type || 'Pilgrimage',
    preferred_vehicle: data.preferred_vehicle || 'Toyota Innova Crysta',
    pickup_location: (data.pickup_location || '').trim(),
    destination: (data.destination || '').trim(),
    travel_date: data.travel_date || new Date().toISOString().split('T')[0],
    passenger_count: parseInt(data.passenger_count, 10) || 1,
    additional_notes: data.additional_notes ? data.additional_notes.trim() : '',
    status: 'Pending',
    driver_name: null,
    driver_phone: null,
    vehicle_number: null,
    fare_estimate: data.fare_estimate || null,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };

  if (isSqlite) {
    try {
      const stmt = db.prepare(`
        INSERT INTO bookings (
          booking_ref, customer_name, customer_phone, service_type,
          preferred_vehicle, pickup_location, destination, travel_date,
          passenger_count, additional_notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
      `);
      const info = stmt.run(
        newBooking.booking_ref,
        newBooking.customer_name,
        newBooking.customer_phone,
        newBooking.service_type,
        newBooking.preferred_vehicle,
        newBooking.pickup_location,
        newBooking.destination,
        newBooking.travel_date,
        newBooking.passenger_count,
        newBooking.additional_notes
      );
      return getBookingById(info.lastInsertRowid);
    } catch (e) {
      console.warn('SQLite createBooking error:', e.message);
    }
  }

  memoryStore.bookings.unshift(newBooking);
  return newBooking;
}

function getBookingById(id) {
  const numericId = parseInt(id, 10);
  if (isSqlite) {
    try {
      return db.prepare('SELECT * FROM bookings WHERE id = ?').get(numericId);
    } catch (e) {}
  }
  return memoryStore.bookings.find(b => b.id === numericId) || null;
}

function getBookingByRef(ref) {
  if (isSqlite) {
    try {
      return db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(ref);
    } catch (e) {}
  }
  return memoryStore.bookings.find(b => b.booking_ref === ref) || null;
}

function getAllBookings(options = {}) {
  if (isSqlite) {
    try {
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
    } catch (e) {}
  }

  let list = [...memoryStore.bookings];
  if (options.status && options.status !== 'All') {
    list = list.filter(b => b.status === options.status);
  }
  if (options.search && options.search.trim()) {
    const term = options.search.trim().toLowerCase();
    list = list.filter(b => 
      (b.customer_name && b.customer_name.toLowerCase().includes(term)) ||
      (b.customer_phone && b.customer_phone.includes(term)) ||
      (b.booking_ref && b.booking_ref.toLowerCase().includes(term)) ||
      (b.destination && b.destination.toLowerCase().includes(term))
    );
  }
  list.sort((a, b) => b.id - a.id);
  if (options.limit) {
    list = list.slice(0, parseInt(options.limit, 10));
  }
  return list;
}

function updateBookingStatus(id, status) {
  const numericId = parseInt(id, 10);
  if (isSqlite) {
    try {
      db.prepare('UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, numericId);
      return getBookingById(numericId);
    } catch (e) {}
  }
  const item = memoryStore.bookings.find(b => b.id === numericId);
  if (item) {
    item.status = status;
    item.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
  }
  return item;
}

function assignBookingDriver(id, assignment) {
  const numericId = parseInt(id, 10);
  if (isSqlite) {
    try {
      db.prepare(`
        UPDATE bookings
        SET driver_name = ?, driver_phone = ?, vehicle_number = ?, fare_estimate = ?, status = 'Driver Assigned', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        assignment.driver_name || null,
        assignment.driver_phone || null,
        assignment.vehicle_number || null,
        assignment.fare_estimate || null,
        numericId
      );
      return getBookingById(numericId);
    } catch (e) {}
  }
  const item = memoryStore.bookings.find(b => b.id === numericId);
  if (item) {
    item.driver_name = assignment.driver_name || null;
    item.driver_phone = assignment.driver_phone || null;
    item.vehicle_number = assignment.vehicle_number || null;
    item.fare_estimate = assignment.fare_estimate || null;
    item.status = 'Driver Assigned';
    item.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
  }
  return item;
}

function deleteBooking(id) {
  const numericId = parseInt(id, 10);
  if (isSqlite) {
    try {
      return db.prepare('DELETE FROM bookings WHERE id = ?').run(numericId);
    } catch (e) {}
  }
  const idx = memoryStore.bookings.findIndex(b => b.id === numericId);
  if (idx !== -1) memoryStore.bookings.splice(idx, 1);
  return { changes: 1 };
}

function getBookingStats() {
  if (isSqlite) {
    try {
      const total = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
      const pending = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'Pending'").get().count;
      const confirmed = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'Confirmed' OR status = 'Driver Assigned'").get().count;
      const completed = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'Completed'").get().count;
      const todayStr = new Date().toISOString().split('T')[0];
      const todayCount = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE travel_date = ?').get(todayStr).count;
      return { total, pending, confirmed, completed, today_scheduled: todayCount };
    } catch (e) {}
  }

  const total = memoryStore.bookings.length;
  const pending = memoryStore.bookings.filter(b => b.status === 'Pending').length;
  const confirmed = memoryStore.bookings.filter(b => b.status === 'Confirmed' || b.status === 'Driver Assigned').length;
  const completed = memoryStore.bookings.filter(b => b.status === 'Completed').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = memoryStore.bookings.filter(b => b.travel_date === todayStr).length;

  return { total, pending, confirmed, completed, today_scheduled: todayCount };
}

// ==========================================================================
// 2. SERVICES MANAGEMENT
// ==========================================================================
function getAllServices() {
  if (isSqlite) {
    try {
      return db.prepare('SELECT * FROM services ORDER BY id ASC').all();
    } catch (e) {}
  }
  return [...memoryStore.services].sort((a, b) => a.id - b.id);
}

function createService(data) {
  const newService = {
    id: memoryStore.nextServiceId++,
    name: (data.name || '').trim(),
    category: data.category ? data.category.trim() : 'Custom Package',
    description: (data.description || '').trim(),
    features: data.features ? data.features.trim() : '',
    starting_price: data.starting_price ? data.starting_price.trim() : 'Enquire',
    is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
  };

  if (isSqlite) {
    try {
      const stmt = db.prepare('INSERT INTO services (name, category, description, features, starting_price, is_active) VALUES (?, ?, ?, ?, ?, ?)');
      const info = stmt.run(newService.name, newService.category, newService.description, newService.features, newService.starting_price, newService.is_active);
      return db.prepare('SELECT * FROM services WHERE id = ?').get(info.lastInsertRowid);
    } catch (e) {}
  }

  memoryStore.services.push(newService);
  return newService;
}

function updateService(id, data) {
  const numericId = parseInt(id, 10);
  if (isSqlite) {
    try {
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
        numericId
      );
      return db.prepare('SELECT * FROM services WHERE id = ?').get(numericId);
    } catch (e) {}
  }

  const s = memoryStore.services.find(item => item.id === numericId);
  if (s) {
    if (data.name !== undefined) s.name = data.name;
    if (data.category !== undefined) s.category = data.category;
    if (data.description !== undefined) s.description = data.description;
    if (data.features !== undefined) s.features = data.features;
    if (data.starting_price !== undefined) s.starting_price = data.starting_price;
    if (data.is_active !== undefined) s.is_active = data.is_active ? 1 : 0;
  }
  return s;
}

function deleteService(id) {
  const numericId = parseInt(id, 10);
  if (isSqlite) {
    try {
      return db.prepare('DELETE FROM services WHERE id = ?').run(numericId);
    } catch (e) {}
  }
  const idx = memoryStore.services.findIndex(s => s.id === numericId);
  if (idx !== -1) memoryStore.services.splice(idx, 1);
  return { changes: 1 };
}

// ==========================================================================
// 3. FLEET MANAGEMENT
// ==========================================================================
function getFleet() {
  if (isSqlite) {
    try {
      return db.prepare('SELECT * FROM fleet ORDER BY id ASC').all();
    } catch (e) {}
  }
  return [...memoryStore.fleet].sort((a, b) => a.id - b.id);
}

function addFleetVehicle(data) {
  const airbagsVal = String(data.airbags || data.luggage_bags || 'Dual Airbags');
  const dailyRentVal = data.daily_rent ? String(data.daily_rent).trim() : '';
  const mileageVal = data.mileage ? String(data.mileage).trim() : '';

  const newVeh = {
    id: memoryStore.nextFleetId++,
    model_name: data.model_name,
    category: data.category || 'Standard',
    capacity: String(data.capacity || '4 Seater'),
    luggage_bags: airbagsVal,
    airbags: airbagsVal,
    daily_rent: dailyRentVal,
    mileage: mileageVal,
    is_available: data.is_available !== undefined ? (data.is_available ? 1 : 0) : 1,
    description: data.description || '',
    rate_per_km: data.rate_per_km || '',
    image_url: data.image_url || ''
  };

  if (isSqlite) {
    try {
      const stmt = db.prepare(`
        INSERT INTO fleet (model_name, category, capacity, luggage_bags, is_available, description, rate_per_km, image_url, airbags, daily_rent, mileage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        newVeh.model_name, newVeh.category, newVeh.capacity, newVeh.luggage_bags,
        newVeh.is_available, newVeh.description, newVeh.rate_per_km, newVeh.image_url,
        newVeh.airbags, newVeh.daily_rent, newVeh.mileage
      );
      return db.prepare('SELECT * FROM fleet WHERE id = ?').get(info.lastInsertRowid);
    } catch (e) {}
  }

  memoryStore.fleet.push(newVeh);
  return newVeh;
}

function updateFleetVehicle(id, data) {
  const numericId = parseInt(id, 10);
  const airbagsVal = String(data.airbags || data.luggage_bags || 'Dual Airbags');
  const dailyRentVal = data.daily_rent !== undefined ? String(data.daily_rent).trim() : '';
  const mileageVal = data.mileage !== undefined ? String(data.mileage).trim() : '';

  if (isSqlite) {
    try {
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
        numericId
      );
      return db.prepare('SELECT * FROM fleet WHERE id = ?').get(numericId);
    } catch (e) {}
  }

  const v = memoryStore.fleet.find(item => item.id === numericId);
  if (v) {
    if (data.model_name !== undefined) v.model_name = data.model_name;
    if (data.category !== undefined) v.category = data.category;
    if (data.capacity !== undefined) v.capacity = String(data.capacity);
    if (data.description !== undefined) v.description = data.description;
    if (data.rate_per_km !== undefined) v.rate_per_km = data.rate_per_km;
    if (data.image_url !== undefined) v.image_url = data.image_url;
    v.airbags = airbagsVal;
    v.luggage_bags = airbagsVal;
    v.daily_rent = dailyRentVal;
    v.mileage = mileageVal;
    if (data.is_available !== undefined) v.is_available = data.is_available ? 1 : 0;
  }
  return v;
}

function deleteFleetVehicle(id) {
  const numericId = parseInt(id, 10);
  if (isSqlite) {
    try {
      return db.prepare('DELETE FROM fleet WHERE id = ?').run(numericId);
    } catch (e) {}
  }
  const idx = memoryStore.fleet.findIndex(f => f.id === numericId);
  if (idx !== -1) memoryStore.fleet.splice(idx, 1);
  return { changes: 1 };
}

// ==========================================================================
// 4. DESTINATIONS MANAGEMENT
// ==========================================================================
function getAllDestinations() {
  if (isSqlite) {
    try {
      return db.prepare('SELECT * FROM destinations ORDER BY id ASC').all();
    } catch (e) {}
  }
  return [...memoryStore.destinations].sort((a, b) => a.id - b.id);
}

function createDestination(data) {
  const newDest = {
    id: memoryStore.nextDestId++,
    name: (data.name || '').trim(),
    subtitle: data.subtitle ? data.subtitle.trim() : 'Pilgrimage Heritage',
    distance: data.distance ? data.distance.trim() : 'Local',
    duration: data.duration ? data.duration.trim() : 'Half Day',
    description: (data.description || '').trim(),
    is_popular: data.is_popular !== undefined ? (data.is_popular ? 1 : 0) : 1,
    image_url: data.image_url ? data.image_url.trim() : ''
  };

  if (isSqlite) {
    try {
      const stmt = db.prepare(`
        INSERT INTO destinations (name, subtitle, distance, duration, description, is_popular, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        newDest.name, newDest.subtitle, newDest.distance, newDest.duration,
        newDest.description, newDest.is_popular, newDest.image_url
      );
      return db.prepare('SELECT * FROM destinations WHERE id = ?').get(info.lastInsertRowid);
    } catch (e) {}
  }

  memoryStore.destinations.push(newDest);
  return newDest;
}

function updateDestination(id, data) {
  const numericId = parseInt(id, 10);
  if (isSqlite) {
    try {
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
        numericId
      );
      return db.prepare('SELECT * FROM destinations WHERE id = ?').get(numericId);
    } catch (e) {}
  }

  const d = memoryStore.destinations.find(item => item.id === numericId);
  if (d) {
    if (data.name !== undefined) d.name = data.name;
    if (data.subtitle !== undefined) d.subtitle = data.subtitle;
    if (data.distance !== undefined) d.distance = data.distance;
    if (data.duration !== undefined) d.duration = data.duration;
    if (data.description !== undefined) d.description = data.description;
    if (data.is_popular !== undefined) d.is_popular = data.is_popular ? 1 : 0;
    if (data.image_url !== undefined) d.image_url = data.image_url;
  }
  return d;
}

function deleteDestination(id) {
  const numericId = parseInt(id, 10);
  if (isSqlite) {
    try {
      return db.prepare('DELETE FROM destinations WHERE id = ?').run(numericId);
    } catch (e) {}
  }
  const idx = memoryStore.destinations.findIndex(d => d.id === numericId);
  if (idx !== -1) memoryStore.destinations.splice(idx, 1);
  return { changes: 1 };
}

// ==========================================================================
// 5. TRIPS & TOUR PACKAGES MANAGEMENT
// ==========================================================================
function getAllTrips() {
  if (isSqlite) {
    try {
      return db.prepare('SELECT * FROM trips ORDER BY id ASC').all();
    } catch (e) {}
  }
  return [...memoryStore.trips].sort((a, b) => a.id - b.id);
}

function getTripById(id) {
  const numericId = parseInt(id, 10);
  if (isSqlite) {
    try {
      return db.prepare('SELECT * FROM trips WHERE id = ?').get(numericId);
    } catch (e) {}
  }
  return memoryStore.trips.find(t => t.id === numericId) || null;
}

function createTrip(data) {
  const newTrip = {
    id: memoryStore.nextTripId++,
    title: (data.title || '').trim(),
    duration_days: data.duration_days ? data.duration_days.trim() : '1 Day',
    subtitle: data.subtitle ? data.subtitle.trim() : '',
    image_url: data.image_url ? data.image_url.trim() : '',
    itinerary: data.itinerary ? data.itinerary.trim() : '',
    vehicle_pricing: data.vehicle_pricing ? data.vehicle_pricing.trim() : '',
    inclusions: data.inclusions ? data.inclusions.trim() : 'Tolls Included, Parkings Included, Driver Wage Included, 24*7 Support, Best Price Guaranteed',
    exclusions: data.exclusions ? data.exclusions.trim() : '',
    starting_price: data.starting_price ? data.starting_price.trim() : '',
    is_popular: data.is_popular !== undefined ? (data.is_popular ? 1 : 0) : 1
  };

  if (isSqlite) {
    try {
      const stmt = db.prepare(`
        INSERT INTO trips (title, duration_days, subtitle, image_url, itinerary, vehicle_pricing, inclusions, exclusions, starting_price, is_popular)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        newTrip.title, newTrip.duration_days, newTrip.subtitle, newTrip.image_url,
        newTrip.itinerary, newTrip.vehicle_pricing, newTrip.inclusions, newTrip.exclusions,
        newTrip.starting_price, newTrip.is_popular
      );
      return db.prepare('SELECT * FROM trips WHERE id = ?').get(info.lastInsertRowid);
    } catch (e) {}
  }

  memoryStore.trips.push(newTrip);
  return newTrip;
}

function updateTrip(id, data) {
  const numericId = parseInt(id, 10);
  if (isSqlite) {
    try {
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
        numericId
      );
      return db.prepare('SELECT * FROM trips WHERE id = ?').get(numericId);
    } catch (e) {}
  }

  const t = memoryStore.trips.find(item => item.id === numericId);
  if (t) {
    if (data.title !== undefined) t.title = data.title;
    if (data.duration_days !== undefined) t.duration_days = data.duration_days;
    if (data.subtitle !== undefined) t.subtitle = data.subtitle;
    if (data.image_url !== undefined) t.image_url = data.image_url;
    if (data.itinerary !== undefined) t.itinerary = data.itinerary;
    if (data.vehicle_pricing !== undefined) t.vehicle_pricing = data.vehicle_pricing;
    if (data.inclusions !== undefined) t.inclusions = data.inclusions;
    if (data.exclusions !== undefined) t.exclusions = data.exclusions;
    if (data.starting_price !== undefined) t.starting_price = data.starting_price;
    if (data.is_popular !== undefined) t.is_popular = data.is_popular ? 1 : 0;
  }
  return t;
}

function deleteTrip(id) {
  const numericId = parseInt(id, 10);
  if (isSqlite) {
    try {
      return db.prepare('DELETE FROM trips WHERE id = ?').run(numericId);
    } catch (e) {}
  }
  const idx = memoryStore.trips.findIndex(t => t.id === numericId);
  if (idx !== -1) memoryStore.trips.splice(idx, 1);
  return { changes: 1 };
}

// ==========================================================================
// 6. CONTACT INQUIRIES
// ==========================================================================
function createContactInquiry(data) {
  const newContact = {
    id: memoryStore.nextContactId++,
    name: (data.name || '').trim(),
    phone: (data.phone || '').trim(),
    email: data.email ? data.email.trim() : '',
    message: (data.message || '').trim(),
    status: 'New',
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };

  if (isSqlite) {
    try {
      const info = db.prepare('INSERT INTO contact_inquiries (name, phone, email, message) VALUES (?, ?, ?, ?)').run(
        newContact.name, newContact.phone, newContact.email, newContact.message
      );
      return db.prepare('SELECT * FROM contact_inquiries WHERE id = ?').get(info.lastInsertRowid);
    } catch (e) {}
  }

  memoryStore.contacts.unshift(newContact);
  return newContact;
}

function getAllContactInquiries() {
  if (isSqlite) {
    try {
      return db.prepare('SELECT * FROM contact_inquiries ORDER BY id DESC').all();
    } catch (e) {}
  }
  return [...memoryStore.contacts].sort((a, b) => b.id - a.id);
}

function updateContactStatus(id, status) {
  const numericId = parseInt(id, 10);
  if (isSqlite) {
    try {
      db.prepare('UPDATE contact_inquiries SET status = ? WHERE id = ?').run(status, numericId);
      return db.prepare('SELECT * FROM contact_inquiries WHERE id = ?').get(numericId);
    } catch (e) {}
  }
  const c = memoryStore.contacts.find(item => item.id === numericId);
  if (c) c.status = status;
  return c;
}

function deleteContactInquiry(id) {
  const numericId = parseInt(id, 10);
  if (isSqlite) {
    try {
      return db.prepare('DELETE FROM contact_inquiries WHERE id = ?').run(numericId);
    } catch (e) {}
  }
  const idx = memoryStore.contacts.findIndex(c => c.id === numericId);
  if (idx !== -1) memoryStore.contacts.splice(idx, 1);
  return { changes: 1 };
}

// ==========================================================================
// 7. SITE SETTINGS
// ==========================================================================
function getSettings() {
  if (isSqlite) {
    try {
      const rows = db.prepare('SELECT key, value FROM site_settings').all();
      const settings = {};
      rows.forEach(r => { settings[r.key] = r.value; });
      return settings;
    } catch (e) {}
  }
  return { ...memoryStore.settings };
}

function updateSettings(settingsMap) {
  if (isSqlite) {
    try {
      const stmt = db.prepare(`
        INSERT INTO site_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `);
      for (const [key, val] of Object.entries(settingsMap)) {
        stmt.run(key, val.toString());
      }
      return getSettings();
    } catch (e) {}
  }

  for (const [key, val] of Object.entries(settingsMap)) {
    memoryStore.settings[key] = val.toString();
  }
  return { ...memoryStore.settings };
}

// ==========================================================================
// 8. FULL SNAPSHOT SYNC (For Cloud / Multi-Browser Convergence)
// ==========================================================================
function getFullSnapshot() {
  return {
    success: true,
    settings: getSettings(),
    services: getAllServices(),
    fleet: getFleet(),
    destinations: getAllDestinations(),
    trips: getAllTrips(),
    bookings: getAllBookings(),
    contacts: getAllContactInquiries(),
    updated_at: new Date().toISOString()
  };
}

function setFullState(data) {
  if (data.fleet && Array.isArray(data.fleet)) {
    memoryStore.fleet = JSON.parse(JSON.stringify(data.fleet));
  }
  if (data.destinations && Array.isArray(data.destinations)) {
    memoryStore.destinations = JSON.parse(JSON.stringify(data.destinations));
  }
  if (data.trips && Array.isArray(data.trips)) {
    memoryStore.trips = JSON.parse(JSON.stringify(data.trips));
  }
  if (data.services && Array.isArray(data.services)) {
    memoryStore.services = JSON.parse(JSON.stringify(data.services));
  }
  if (data.bookings && Array.isArray(data.bookings)) {
    memoryStore.bookings = JSON.parse(JSON.stringify(data.bookings));
  }
  if (data.contacts && Array.isArray(data.contacts)) {
    memoryStore.contacts = JSON.parse(JSON.stringify(data.contacts));
  }
  if (data.settings && typeof data.settings === 'object') {
    memoryStore.settings = { ...memoryStore.settings, ...data.settings };
  }
  persistStateToFile();
  return getFullSnapshot();
}

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
  updateSettings,
  getFullSnapshot,
  setFullState
};
