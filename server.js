const os = require('node:os');
/**
 * YAKSHITH NANDH TRAVELS - Full-Stack Application Server
 * Location: Tirupati, Andhra Pradesh, India
 * 24/7 Helpline: +91 88868 30755 / +91 97009 35888
 * 
 * Powered by Node.js built-in HTTP and SQLite engine
 * Cross-platform path handling for Windows & Linux
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const db = require('./database.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME Types Map
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/**
 * Helper to send JSON responses
 */
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Helper to parse JSON request body
 */
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', err => reject(err));
  });
}

/**
 * Validate Indian Phone Number
 */
function isValidPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) return true;
  if (cleaned.length === 12 && cleaned.startsWith('91') && /^[6-9]\d{9}$/.test(cleaned.substring(2))) return true;
  return false;
}

/**
 * Generate WhatsApp Message URL
 */
function generateWhatsAppBookingUrl(booking) {
  const notesText = booking.additional_notes ? booking.additional_notes : 'None';
  const text = 
`*YAKSHITH NANDH TRAVELS - BOOKING REGISTRATION*
🙏 *Namaste! Here is my confirmed booking:*
━━━━━━━━━━━━━━━━━━━━
🎫 *Booking Ref:* ${booking.booking_ref}
👤 *Passenger:* ${booking.customer_name}
📞 *Contact:* ${booking.customer_phone}
🧳 *Service:* ${booking.service_type}
🚗 *Vehicle:* ${booking.preferred_vehicle}
📍 *Pickup:* ${booking.pickup_location}
🎯 *Destination:* ${booking.destination}
📅 *Date:* ${booking.travel_date}
👥 *Passengers:* ${booking.passenger_count}
📝 *Notes:* ${notesText}
━━━━━━━━━━━━━━━━━━━━
📍 *Tirupati Dispatch Center:* +91 88868 30755
_Booking registered in Yakshith Nandh Travels Dispatch Queue_`;

  return `https://api.whatsapp.com/send?phone=918886830755&text=${encodeURIComponent(text)}`;
}

/**
 * Direct file serving helper
 */
function serveFileDirectly(res, targetPath) {
  fs.readFile(targetPath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>404 - Not Found | Yakshith Nandh Travels</title></head>
        <body style="font-family:sans-serif; text-align:center; padding:50px; background:#F5EBDD; color:#392B27;">
          <h1 style="color:#7B263A;">404 - File Not Found</h1>
          <p>The file could not be found: ${escape(path.basename(targetPath))}</p>
          <a href="/" style="color:#7B263A; font-weight:bold;">Return to Home</a>
        </body>
        </html>
      `);
      return;
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(content);
  });
}

/**
 * Cross-platform Static File Server
 */
function serveStaticFile(req, res, rawPathname) {
  // Normalize forward and backward slashes cleanly
  let clean = (rawPathname || '/').replace(/\\/g, '/');
  clean = clean.split('?')[0]; // remove query string if present
  
  // Specific alias routes
  if (clean === '/login' || clean === '/login/' || clean === '/login.html') {
    return serveFileDirectly(res, path.join(PUBLIC_DIR, 'login.html'));
  }

  if (clean === '/admin' || clean === '/admin/' || clean === '/admin.html') {
    return serveFileDirectly(res, path.join(PUBLIC_DIR, 'admin.html'));
  }

  if (clean === '/' || clean === '/index.html') {
    return serveFileDirectly(res, path.join(PUBLIC_DIR, 'index.html'));
  }

  // Remove leading slash for path.join
  clean = clean.replace(/^\/+/, '');
  
  let targetPath = path.join(PUBLIC_DIR, clean);

  // If no extension, try appending .html
  if (!path.extname(targetPath)) {
    if (fs.existsSync(targetPath + '.html')) {
      targetPath = targetPath + '.html';
    }
  }

  // Check existence
  if (!fs.existsSync(targetPath)) {
    // Try root folder fallback
    let rootFallback = path.join(__dirname, clean);
    if (fs.existsSync(rootFallback) && !fs.statSync(rootFallback).isDirectory()) {
      targetPath = rootFallback;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>404 - Not Found | Yakshith Nandh Travels</title></head>
        <body style="font-family:sans-serif; text-align:center; padding:50px; background:#F5EBDD; color:#392B27;">
          <h1 style="color:#7B263A;">404 - Page Not Found</h1>
          <p>The requested page does not exist on Yakshith Nandh Travels.</p>
          <div style="margin-top:20px;">
            <a href="/" style="color:#7B263A; font-weight:bold; margin-right:15px;">Return to Home</a>
            <a href="/admin" style="color:#7B263A; font-weight:bold;">Admin Console</a>
          </div>
        </body>
        </html>
      `);
    }
  }

  // Serve the verified file
  serveFileDirectly(res, targetPath);
}

/**
 * Main Request Handler (Used for both Node.js HTTP server & Vercel Serverless Function)
 */
async function handleRequest(req, res) {
  let rawUrl = req.url || '/';
  if (req.headers['x-forwarded-uri'] && req.headers['x-forwarded-uri'].startsWith('/api')) {
    rawUrl = req.headers['x-forwarded-uri'];
  } else if (req.headers['x-vercel-matched-path'] && req.headers['x-vercel-matched-path'].startsWith('/api')) {
    rawUrl = req.headers['x-vercel-matched-path'];
  }

  const parsedUrl = url.parse(rawUrl, true);
  let pathname = parsedUrl.pathname || '/';
  // Normalize slashes
  pathname = pathname.replace(/\\/g, '/');
  const method = req.method.toUpperCase();

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  // HEAD method handling
  if (method === 'HEAD') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/html; charset=utf-8'
    });
    return res.end();
  }

  // ==========================================================================
  // DIRECT PAGE ROUTES (Priority)
  // ==========================================================================
  if (method === 'GET') {
    if (pathname === '/login' || pathname === '/login/' || pathname === '/login.html') {
      return serveFileDirectly(res, path.join(PUBLIC_DIR, 'login.html'));
    }
    if (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin.html') {
      return serveFileDirectly(res, path.join(PUBLIC_DIR, 'admin.html'));
    }
    if (pathname === '/' || pathname === '/index.html') {
      return serveFileDirectly(res, path.join(PUBLIC_DIR, 'index.html'));
    }
  }

  // ==========================================================================
  // API ENDPOINTS
  // ==========================================================================

  
  // 0. Authentication Endpoints
  if (pathname === '/api/login' && method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';

      const validEmails = [
        'admin@yakshithnandhtravels.com',
        'admin@gmail.com',
        'admin'
      ];
      const validPasswords = ['admin', 'Yakshith@2026', 'admin123'];

      if (validEmails.includes(email) && validPasswords.includes(password)) {
        const token = 'ynt_auth_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Set-Cookie': 'ynt_session=' + token + '; Path=/; SameSite=Lax; Max-Age=86400'
        });
        return res.end(JSON.stringify({
          success: true,
          token: token,
          user: {
            name: 'Master Dispatcher',
            email: email,
            role: 'admin'
          }
        }));
      } else {
        return sendJSON(res, 401, {
          success: false,
          error: 'Invalid email or password. Default: admin@yakshithnandhtravels.com / admin'
        });
      }
    } catch (err) {
      return sendJSON(res, 400, { success: false, error: 'Malformed login request.' });
    }
  }

  if (pathname === '/api/logout' && method === 'POST') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Set-Cookie': 'ynt_session=; Path=/; Max-Age=0'
    });
    return res.end(JSON.stringify({ success: true, message: 'Logged out successfully.' }));
  }

  if (pathname === '/api/auth-status' && method === 'GET') {
    return sendJSON(res, 200, { success: true, authenticated: true });
  }

  // 1. Health Check
  if (pathname === '/health' || pathname === '/api/health') {
    return sendJSON(res, 200, {
      status: 'UP',
      service: 'Yakshith Nandh Travels API',
      city: 'Tirupati, Andhra Pradesh',
      helpline: '+91 88868 30755',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime())
    });
  }

  // 2. Stats: GET /api/stats
  if (pathname === '/api/stats' && method === 'GET') {
    try {
      const stats = db.getBookingStats();
      return sendJSON(res, 200, { success: true, stats });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  // 3. Site Settings: GET & POST /api/settings
  if (pathname === '/api/settings') {
    if (method === 'GET') {
      return sendJSON(res, 200, { success: true, settings: db.getSettings() });
    }
    if (method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const updated = db.updateSettings(body);
        return sendJSON(res, 200, { success: true, message: 'Settings saved', settings: updated });
      } catch (err) {
        return sendJSON(res, 500, { success: false, error: err.message });
      }
    }
  }

  // 4. Services Section: GET, POST, PATCH, DELETE /api/services
  if (pathname === '/api/services') {
    if (method === 'GET') {
      return sendJSON(res, 200, { success: true, services: db.getAllServices() });
    }
    if (method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        if (!body.name || !body.description) {
          return sendJSON(res, 400, { success: false, error: 'Name and description are required.' });
        }
        const service = db.createService(body);
        return sendJSON(res, 201, { success: true, message: 'Service created', service });
      } catch (err) {
        return sendJSON(res, 500, { success: false, error: err.message });
      }
    }
  }
  const serviceIdMatch = pathname.match(/^\/api\/services\/([0-9]+)$/);
  if (serviceIdMatch) {
    const id = parseInt(serviceIdMatch[1], 10);
    if (method === 'PATCH') {
      try {
        const body = await parseRequestBody(req);
        const updated = db.updateService(id, body);
        return sendJSON(res, 200, { success: true, message: 'Service updated', service: updated });
      } catch (err) {
        return sendJSON(res, 500, { success: false, error: err.message });
      }
    }
    if (method === 'DELETE') {
      db.deleteService(id);
      return sendJSON(res, 200, { success: true, message: 'Service deleted' });
    }
  }

  // 5. Vehicles Fleet: GET, POST, PATCH, DELETE /api/fleet
  if (pathname === '/api/fleet') {
    if (method === 'GET') {
      return sendJSON(res, 200, { success: true, fleet: db.getFleet() });
    }
    if (method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const vehicle = db.addFleetVehicle(body);
        return sendJSON(res, 201, { success: true, message: 'Vehicle added', vehicle });
      } catch (err) {
        return sendJSON(res, 500, { success: false, error: err.message });
      }
    }
  }
  const fleetIdMatch = pathname.match(/^\/api\/fleet\/([0-9]+)$/);
  if (fleetIdMatch) {
    const id = parseInt(fleetIdMatch[1], 10);
    if (method === 'PATCH') {
      try {
        const body = await parseRequestBody(req);
        const updated = db.updateFleetVehicle(id, body);
        return sendJSON(res, 200, { success: true, message: 'Vehicle updated', vehicle: updated });
      } catch (err) {
        return sendJSON(res, 500, { success: false, error: err.message });
      }
    }
    if (method === 'DELETE') {
      db.deleteFleetVehicle(id);
      return sendJSON(res, 200, { success: true, message: 'Vehicle deleted' });
    }
  }

  // 6. Destinations: GET, POST, PATCH, DELETE /api/destinations
  if (pathname === '/api/destinations') {
    if (method === 'GET') {
      return sendJSON(res, 200, { success: true, destinations: db.getAllDestinations() });
    }
    if (method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        if (!body.name || !body.description) {
          return sendJSON(res, 400, { success: false, error: 'Name and description are required.' });
        }
        const destination = db.createDestination(body);
        return sendJSON(res, 201, { success: true, message: 'Destination created', destination });
      } catch (err) {
        return sendJSON(res, 500, { success: false, error: err.message });
      }
    }
  }
  const destIdMatch = pathname.match(/^\/api\/destinations\/([0-9]+)$/);
  if (destIdMatch) {
    const id = parseInt(destIdMatch[1], 10);
    if (method === 'PATCH') {
      try {
        const body = await parseRequestBody(req);
        const updated = db.updateDestination(id, body);
        return sendJSON(res, 200, { success: true, message: 'Destination updated', destination: updated });
      } catch (err) {
        return sendJSON(res, 500, { success: false, error: err.message });
      }
    }
    if (method === 'DELETE') {
      db.deleteDestination(id);
      return sendJSON(res, 200, { success: true, message: 'Destination deleted' });
    }
  }

  // 6b. Trips & Tour Packages: GET, POST, PATCH, DELETE /api/trips
  if (pathname === '/api/trips') {
    if (method === 'GET') {
      return sendJSON(res, 200, { success: true, trips: db.getAllTrips() });
    }
    if (method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        if (!body.title) {
          return sendJSON(res, 400, { success: false, error: 'Trip title is required.' });
        }
        const trip = db.createTrip(body);
        return sendJSON(res, 201, { success: true, message: 'Trip package created', trip });
      } catch (err) {
        return sendJSON(res, 500, { success: false, error: err.message });
      }
    }
  }
  const tripIdMatch = pathname.match(/^\/api\/trips\/([0-9]+)$/);
  if (tripIdMatch) {
    const id = parseInt(tripIdMatch[1], 10);
    if (method === 'PATCH') {
      try {
        const body = await parseRequestBody(req);
        const updated = db.updateTrip(id, body);
        return sendJSON(res, 200, { success: true, message: 'Trip package updated', trip: updated });
      } catch (err) {
        return sendJSON(res, 500, { success: false, error: err.message });
      }
    }
    if (method === 'DELETE') {
      db.deleteTrip(id);
      return sendJSON(res, 200, { success: true, message: 'Trip package deleted' });
    }
  }

  // 7. Contact Inquiries: GET, POST, PATCH, DELETE /api/contacts
  if (pathname === '/api/contacts' && method === 'GET') {
    return sendJSON(res, 200, { success: true, contacts: db.getAllContactInquiries() });
  }
  const contactDelMatch = pathname.match(/^\/api\/contacts\/([0-9]+)$/);
  if (contactDelMatch && method === 'DELETE') {
    const id = parseInt(contactDelMatch[1], 10);
    db.deleteContactInquiry(id);
    return sendJSON(res, 200, { success: true, message: 'Contact inquiry deleted' });
  }
  if (pathname === '/api/contact' && method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      if (!body.name || !body.phone || !body.message) {
        return sendJSON(res, 400, { success: false, error: 'Name, phone, and message are required.' });
      }
      const inquiry = db.createContactInquiry(body);
      return sendJSON(res, 201, {
        success: true,
        message: 'Thank you! Your message has been received by our Tirupati dispatch team.',
        inquiry
      });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }
  const contactIdMatch = pathname.match(/^\/api\/contacts\/([0-9]+)\/status$/);
  if (contactIdMatch && method === 'PATCH') {
    try {
      const id = parseInt(contactIdMatch[1], 10);
      const body = await parseRequestBody(req);
      const updated = db.updateContactStatus(id, body.status);
      return sendJSON(res, 200, { success: true, contact: updated });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  // 8. Bookings CRUD
  if (pathname === '/api/bookings') {
    if (method === 'GET') {
      try {
        const { status, search, limit } = parsedUrl.query;
        const bookings = db.getAllBookings({ status, search, limit });
        return sendJSON(res, 200, { success: true, count: bookings.length, bookings });
      } catch (err) {
        return sendJSON(res, 500, { success: false, error: err.message });
      }
    }
    if (method === 'POST') {
      try {
        const data = await parseRequestBody(req);

        if (!data.customer_name || data.customer_name.trim().length < 2) {
          return sendJSON(res, 400, { success: false, error: 'Full customer name is required.' });
        }
        if (!isValidPhone(data.customer_phone)) {
          return sendJSON(res, 400, { success: false, error: 'A valid 10-digit Indian phone number is required.' });
        }
        if (!data.service_type) {
          return sendJSON(res, 400, { success: false, error: 'Please choose a service type.' });
        }
        if (!data.preferred_vehicle) {
          return sendJSON(res, 400, { success: false, error: 'Please select a preferred vehicle.' });
        }
        if (!data.pickup_location || !data.pickup_location.trim()) {
          return sendJSON(res, 400, { success: false, error: 'Pickup location is required.' });
        }
        if (!data.destination || !data.destination.trim()) {
          return sendJSON(res, 400, { success: false, error: 'Destination is required.' });
        }
        if (!data.travel_date) {
          return sendJSON(res, 400, { success: false, error: 'Travel date is required.' });
        }

        const newBooking = db.createBooking(data);
        const whatsappUrl = generateWhatsAppBookingUrl(newBooking);

        return sendJSON(res, 201, {
          success: true,
          message: 'Ride enquiry registered successfully in Tirupati dispatch queue.',
          booking: newBooking,
          whatsapp_url: whatsappUrl
        });
      } catch (err) {
        return sendJSON(res, 500, { success: false, error: 'Failed to create booking: ' + err.message });
      }
    }
  }

  // Single booking actions: /api/bookings/:id
  const bookingIdMatch = pathname.match(/^\/api\/bookings\/([0-9]+)$/);
  if (bookingIdMatch) {
    const bookingId = parseInt(bookingIdMatch[1], 10);
    if (method === 'GET') {
      const booking = db.getBookingById(bookingId);
      if (!booking) return sendJSON(res, 404, { success: false, error: 'Booking not found' });
      return sendJSON(res, 200, { success: true, booking });
    }
    if (method === 'DELETE') {
      db.deleteBooking(bookingId);
      return sendJSON(res, 200, { success: true, message: `Booking #${bookingId} deleted.` });
    }
  }

  // Update status: /api/bookings/:id/status
  const statusMatch = pathname.match(/^\/api\/bookings\/([0-9]+)\/status$/);
  if (statusMatch && method === 'PATCH') {
    try {
      const bookingId = parseInt(statusMatch[1], 10);
      const body = await parseRequestBody(req);
      const updated = db.updateBookingStatus(bookingId, body.status);
      return sendJSON(res, 200, { success: true, booking: updated });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  // Assign driver: /api/bookings/:id/assign
  const assignMatch = pathname.match(/^\/api\/bookings\/([0-9]+)\/assign$/);
  if (assignMatch && method === 'POST') {
    try {
      const bookingId = parseInt(assignMatch[1], 10);
      const body = await parseRequestBody(req);
      const updated = db.assignBookingDriver(bookingId, body);
      return sendJSON(res, 200, { success: true, booking: updated });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  // Snapshot endpoint for instant multi-browser state sync
  if (pathname === '/api/snapshot' && method === 'GET') {
    try {
      const snapshot = db.getFullSnapshot();
      return sendJSON(res, 200, { success: true, ...snapshot });
    } catch (err) {
      return sendJSON(res, 200, { success: false, error: err.message });
    }
  }

  // ==========================================================================
  // FALLTHROUGH: SERVE STATIC ASSETS (HTML, CSS, JS, IMAGES)
  // ==========================================================================
  if (method === 'GET') {
    return serveStaticFile(req, res, pathname);
  }

  // 405 Method Not Allowed
  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
}

const server = http.createServer(handleRequest);

// Start Server
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    const interfaces = os.networkInterfaces();
    let networkIp = 'localhost';
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          networkIp = iface.address;
          break;
        }
      }
    }
    console.log(`==================================================================`);
    console.log(`  YAKSHITH NANDH TRAVELS - FULL-STACK PLATFORM RUNNING`);
    console.log(`  Location: Tirupati, Andhra Pradesh, India`);
    console.log(`  Local Device (This PC):`);
    console.log(`    Customer: http://localhost:${PORT}`);
    console.log(`    Admin:    http://localhost:${PORT}/admin`);
    console.log(`  Other Devices (Same Wi-Fi):`);
    console.log(`    Customer: http://${networkIp}:${PORT}`);
    console.log(`    Admin:    http://${networkIp}:${PORT}/admin`);
    console.log(`  API Health: http://${networkIp}:${PORT}/health`);
    console.log(`  Helplines:  +91 88868 30755 / +91 97009 35888`);
    console.log(`==================================================================`);
  });
}

module.exports = server;
module.exports.handleRequest = handleRequest;
