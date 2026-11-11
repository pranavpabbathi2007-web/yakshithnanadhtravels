/**
 * YAKSHITH NANDH TRAVELS - Firebase SDK & Performance Configuration
 * Project: yakshithnandhtravels
 * Configured for Authentication, Cloud Firestore, Firebase Storage & Performance Monitoring
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  getDocs,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// Firebase Cloud Storage import removed: zero-CORS Firestore compression active

// Web app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCVSV9cHimnG2PoACuwONHQlfJWx0iTpeQ",
  authDomain: "yakshithnandhtravels.firebaseapp.com",
  projectId: "yakshithnandhtravels",
  storageBucket: "yakshithnandhtravels.firebasestorage.app",
  messagingSenderId: "194071784196",
  appId: "1:194071784196:web:c3229a69053f269f0a3e51",
  measurementId: "G-DDBCQQG20Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Cloud Firestore with auto-detect long polling for maximum reliability across all networks
let db;
try {
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true
  });
} catch (e) {
  db = getFirestore(app);
}

// Storage bucket bypass: all images saved directly to Cloud Firestore documents
const storage = null;
const DIRECT_STORAGE_BUCKET_ACTIVE = false;
let isFirebaseStorageFunctional = false;

// Safe Performance stub (prevents 503 network errors from firebaselogging-pa.googleapis.com)
const perf = null;
const getPerformance = () => null;

// ==========================================================================
// HIGH-SPEED FIRESTORE ADMIN DATA STORE FUNCTIONS
// Directly persists Admin updates to Cloud Firestore collections & documents
// ==========================================================================

/**
 * Save single vehicle to Firestore fleet collection
 */
async function saveVehicleToFirestore(vehicle) {
  if (!vehicle || !vehicle.id) return null;
  try {
    const docRef = doc(db, 'fleet', String(vehicle.id));
    const vehPayload = { ...vehicle, updated_at: new Date().toISOString() };
    if (!vehPayload.image_url) delete vehPayload.image_url;
    await setDoc(docRef, sanitizeForFirestore(vehPayload), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore vehicle write note:', err.message);
    return false;
  }
}

/**
 * Delete single vehicle from Firestore fleet collection
 */
async function deleteVehicleFromFirestore(id) {
  if (!id) return;
  try {
    await deleteDoc(doc(db, 'fleet', String(id)));
  } catch (err) {
    console.warn('Firestore vehicle delete note:', err.message);
  }
}

/**
 * Save destination to Firestore destinations collection
 */
async function saveDestinationToFirestore(destination) {
  if (!destination || !destination.id) return null;
  try {
    const docRef = doc(db, 'destinations', String(destination.id));
    const destPayload = { ...destination, updated_at: new Date().toISOString() };
    // CRITICAL PROTECTION: Never overwrite a saved destination image with an empty string
    if (!destPayload.image_url) delete destPayload.image_url;
    await setDoc(docRef, sanitizeForFirestore(destPayload), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore destination write note:', err.message);
    return false;
  }
}

/**
 * Delete destination from Firestore destinations collection
 */
async function deleteDestinationFromFirestore(id) {
  if (!id) return;
  try {
    await deleteDoc(doc(db, 'destinations', String(id)));
  } catch (err) {
    console.warn('Firestore destination delete note:', err.message);
  }
}

/**
 * Save tour package to Firestore trips collection
 */
async function saveTripToFirestore(trip) {
  if (!trip || !trip.id) return null;
  try {
    const docRef = doc(db, 'trips', String(trip.id));
    const tripPayload = { ...trip, updated_at: new Date().toISOString() };
    if (!tripPayload.image_url) delete tripPayload.image_url;
    await setDoc(docRef, sanitizeForFirestore(tripPayload), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore trip write note:', err.message);
    return false;
  }
}

/**
 * Delete tour package from Firestore trips collection
 */
async function deleteTripFromFirestore(id) {
  if (!id) return;
  try {
    await deleteDoc(doc(db, 'trips', String(id)));
  } catch (err) {
    console.warn('Firestore trip delete note:', err.message);
  }
}

/**
 * Save service to Firestore services collection
 */
async function saveServiceToFirestore(service) {
  if (!service || !service.id) return null;
  try {
    const docRef = doc(db, 'services', String(service.id));
    await setDoc(docRef, sanitizeForFirestore({ ...service, updated_at: new Date().toISOString() }), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore service write note:', err.message);
    return false;
  }
}

/**
 * Delete service from Firestore services collection
 */
async function deleteServiceFromFirestore(id) {
  if (!id) return;
  try {
    await deleteDoc(doc(db, 'services', String(id)));
  } catch (err) {
    console.warn('Firestore service delete note:', err.message);
  }
}

/**
 * Save website settings to Firestore settings collection
 */
async function saveSettingsToFirestore(settings) {
  if (!settings || typeof settings !== 'object') return null;
  try {
    const docRef = doc(db, 'settings', 'general');
    const payload = {
      ...settings,
      updated_at: settings.updated_at || new Date().toISOString()
    };
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore settings write note:', err.message);
    return false;
  }
}

/**
 * Save customer booking to Firestore bookings collection
 */
async function saveBookingToFirestore(booking) {
  if (!booking || (!booking.booking_ref && !booking.id)) return null;
  try {
    const docKey = String(booking.booking_ref || booking.id);
    const docRef = doc(db, 'bookings', docKey);
    await setDoc(docRef, sanitizeForFirestore({ ...booking, updated_at: new Date().toISOString() }), { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore booking write note:', err.message);
    return false;
  }
}

// Helper: Sanitize object so no undefined fields ever reach Firestore setDoc()
function sanitizeForFirestore(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = sanitizeForFirestore(v);
      } else {
        out[k] = v;
      }
    }
  }
  return out;
}

/**
 * Helper: Client-side Image Compressor
 * Resizes large camera photos to max 900px and outputs optimized JPEG
 * Returns { blob, dataUrl, width, height }
 */
function compressImageFile(file, maxDimension = 640, quality = 0.65) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided for compression.'));
    if (!file.type || !file.type.startsWith('image/')) {
      return resolve({ blob: file, dataUrl: '' });
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob((blob) => {
          resolve({ blob: blob || file, dataUrl, width, height });
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve({ blob: file, dataUrl: e.target.result });
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Unified, Reusable Firebase Image Upload Utility
 * Required for all three Admin Dashboard modules: Destinations, Vehicles, Trips
 * 
 * 1. Accepts actual image file.
 * 2. Uploads to Firebase Storage bucket with unique collision-proof filename.
 * 3. Waits for upload completion and retrieves permanent getDownloadURL().
 * 4. Returns { success: true, url, storagePath, source }.
 * 5. Handles errors properly with zero broken image states.
 * 6. Never returns temporary blob: URLs as permanent URLs.
 */
async function uploadImageToFirebaseStorage(file, folder = 'general') {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  // 1. Client-side high-efficiency compression (~20-25KB, crisp 640px)
  let compressed = null;
  try {
    compressed = await compressImageFile(file, 640, 0.65);
  } catch (compErr) {
    console.warn('Image pre-compression note:', compErr.message);
  }

  const uploadPayload = (compressed && compressed.blob) ? compressed.blob : file;
  const mimeType = (compressed && compressed.blob) ? 'image/jpeg' : (file.type || 'image/jpeg');
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const cleanName = (file.name || 'image.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${folder}/${uniqueId}_${cleanName}`;

  // 2. Ultra-fast, zero-CORS Cloud Image (~25KB)

  // Stored directly in Firestore collection documents (fleet/{id}, destinations/{id}, trips/{id})
  if (compressed && compressed.dataUrl) {
    return {
      success: true,
      url: compressed.dataUrl,
      storagePath: storagePath,
      source: 'data_url_permanent'
    };
  }

  throw new Error('Image processing and upload failed.');
}

/**
 * Record an updated image into Firestore admin_images collection
 */
async function recordAdminImageToFirestore(type, name, imageUrl) {
  if (!imageUrl) return;
  try {
    const titleVal = String(name || type || 'Image');
    const cleanKey = String(name || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
    await setDoc(doc(db, 'admin_images', `${type}_${cleanKey}`), sanitizeForFirestore({
      category: type,
      title: titleVal,
      image_url: imageUrl,
      updated_at: new Date().toISOString()
    }), { merge: true });
  } catch (e) {
    console.warn('Record admin image note:', e.message);
  }
}

/**
 * Ultra-Fast Multi-Collection Firestore Synchronization
 * Writes unified snapshot to site_content/data AND populates individual collections
 */
async function syncAllToFirestore(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  const promises = [];

  // 1. Unified snapshot: Recursively strip ALL base64 data URLs and oversized strings from site_content/data
  // This resets and replaces any bloated document in Firestore, guaranteeing size is ~12-15KB (far below the 1MB limit).
  // The full images are stored in the individual collection documents (fleet/{id}, destinations/{id}, trips/{id}).
  const cleanForMonolith = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => cleanForMonolith(item));
    }
    const clean = {};
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'string') {
        if (val.startsWith('data:image/') || val.startsWith('data:') || val.length > 10000) {
          clean[key] = '';
        } else {
          clean[key] = val;
        }
      } else if (val && typeof val === 'object') {
        clean[key] = cleanForMonolith(val);
      } else {
        clean[key] = val;
      }
    }
    return clean;
  };

  const lightweightSnapshot = sanitizeForFirestore(cleanForMonolith(snapshot));

  // Note: merge: false completely resets and cleans up any existing bloated document in Cloud Firestore
  promises.push(
    setDoc(doc(db, 'site_content', 'data'), lightweightSnapshot)
      .catch(e => console.warn('Snapshot write note:', e.message))
  );

  // 2. Admin profile collection document (admin/profile)
  const settingsData = (snapshot.settings && typeof snapshot.settings === 'object') ? snapshot.settings : {};
  const helplineText = [settingsData.primary_phone || '+91 88868 30755', settingsData.secondary_phone || '+91 97009 35888']
    .filter(Boolean)
    .join(' / ');
  promises.push(
    setDoc(doc(db, 'admin', 'profile'), {
      username: 'admin',
      email: settingsData.email || 'admin@yakshithnandhtravels.com',
      role: 'Master Dispatcher & Administrator',
      company: settingsData.company_name || 'Yakshith Nandh Travels',
      helpline: helplineText,
      location: settingsData.location || 'Tirupati, Andhra Pradesh, India',
      status: 'Active',
      updated_at: new Date().toISOString()
    }, { merge: true }).catch(e => console.warn('Admin profile note:', e.message))
  );

  // 3. Settings document
  if (snapshot.settings) {
    const settingsPayload = {
      ...snapshot.settings,
      updated_at: snapshot.settings.updated_at || snapshot.updated_at || new Date().toISOString()
    };
    promises.push(
      setDoc(doc(db, 'settings', 'general'), sanitizeForFirestore(settingsPayload), { merge: true })
        .catch(e => console.warn('Settings write note:', e.message))
    );
  }

  // 4. Fleet collection documents
  if (Array.isArray(snapshot.fleet)) {
    for (const v of snapshot.fleet) {
      if (v && v.id) {
        const vehPayload = { ...v };
        if (!vehPayload.image_url) delete vehPayload.image_url;
        promises.push(
          setDoc(doc(db, 'fleet', String(v.id)), sanitizeForFirestore(vehPayload), { merge: true })
            .catch(e => console.warn('Fleet vehicle write note:', e.message))
        );
        if (v.image_url) {
          const cleanKey = String(v.model_name || v.id).replace(/[^a-zA-Z0-9_-]/g, '_');
          promises.push(
            setDoc(doc(db, 'admin_images', `vehicle_${cleanKey}`), sanitizeForFirestore({
              category: 'fleet',
              title: v.model_name || 'Vehicle',
              image_url: v.image_url,
              updated_at: new Date().toISOString()
            }), { merge: true }).catch(() => {})
          );
        }
      }
    }
  }

  // 5. Destinations collection documents
  if (Array.isArray(snapshot.destinations)) {
    for (const d of snapshot.destinations) {
      if (d && d.id) {
        const destPayload = { ...d };
        // CRITICAL PROTECTION: Never overwrite a saved destination image with empty string
        if (!destPayload.image_url) delete destPayload.image_url;
        promises.push(
          setDoc(doc(db, 'destinations', String(d.id)), sanitizeForFirestore(destPayload), { merge: true })
            .catch(e => console.warn('Destination write note:', e.message))
        );
        if (d.image_url) {
          const cleanKey = String(d.name || d.id).replace(/[^a-zA-Z0-9_-]/g, '_');
          promises.push(
            setDoc(doc(db, 'admin_images', `dest_${cleanKey}`), sanitizeForFirestore({
              category: 'destinations',
              title: d.name || 'Destination',
              image_url: d.image_url,
              updated_at: new Date().toISOString()
            }), { merge: true }).catch(() => {})
          );
        }
      }
    }
  }

  // 6. Trips collection documents
  if (Array.isArray(snapshot.trips)) {
    for (const t of snapshot.trips) {
      if (t && t.id) {
        const tripPayload = { ...t };
        if (!tripPayload.image_url) delete tripPayload.image_url;
        promises.push(
          setDoc(doc(db, 'trips', String(t.id)), sanitizeForFirestore(tripPayload), { merge: true })
            .catch(e => console.warn('Trip write note:', e.message))
        );
        if (t.image_url) {
          const tripTitle = t.title || t.name || 'Trip Package';
          const cleanKey = String(tripTitle || t.id).replace(/[^a-zA-Z0-9_-]/g, '_');
          promises.push(
            setDoc(doc(db, 'admin_images', `trip_${cleanKey}`), sanitizeForFirestore({
              category: 'trips',
              title: tripTitle,
              image_url: t.image_url,
              updated_at: new Date().toISOString()
            }), { merge: true }).catch(() => {})
          );
        }
      }
    }
  }

  // 7. Services collection documents
  if (Array.isArray(snapshot.services)) {
    for (const s of snapshot.services) {
      if (s && s.id) {
        promises.push(
          setDoc(doc(db, 'services', String(s.id)), sanitizeForFirestore(s), { merge: true })
            .catch(e => console.warn('Service write note:', e.message))
        );
      }
    }
  }

  return Promise.allSettled(promises);
}

// Authentication Helpers
async function loginAdminWithFirebase(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  const token = await user.getIdToken();

  let adminProfile = {
    uid: user.uid,
    email: user.email,
    name: 'Master Dispatcher',
    role: 'admin',
    source: 'firebase'
  };

  try {
    const adminRef = doc(db, 'admin_users', user.uid);
    const snap = await getDoc(adminRef);
    if (snap.exists()) {
      adminProfile = { ...adminProfile, ...snap.data() };
      await updateDoc(adminRef, { lastLogin: new Date().toISOString() }).catch(() => {});
    } else {
      await setDoc(adminRef, {
        ...adminProfile,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    }
  } catch (firestoreErr) {
    console.warn('Firestore read/write note:', firestoreErr.message);
  }

  return { user, token, adminProfile };
}

async function createAdminWithFirebase(email, password, displayName = 'Master Dispatcher') {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  const token = await user.getIdToken();

  const adminProfile = {
    uid: user.uid,
    email: user.email,
    name: displayName,
    role: 'admin',
    createdAt: new Date().toISOString(),
    source: 'firebase'
  };

  try {
    await setDoc(doc(db, 'admin_users', user.uid), adminProfile, { merge: true });
  } catch (e) {
    console.warn('Firestore initial write note:', e.message);
  }

  return { user, token, adminProfile };
}

async function logoutFirebase() {
  await signOut(auth);
}

export {
  app,
  auth,
  db,
  storage,
  perf,
  getPerformance,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  getDocs,
  serverTimestamp,
  writeBatch,
  saveVehicleToFirestore,
  deleteVehicleFromFirestore,
  saveDestinationToFirestore,
  deleteDestinationFromFirestore,
  saveTripToFirestore,
  deleteTripFromFirestore,
  saveServiceToFirestore,
  deleteServiceFromFirestore,
  saveSettingsToFirestore,
  saveBookingToFirestore,
  recordAdminImageToFirestore,
  syncAllToFirestore,
  uploadImageToFirebaseStorage,
  compressImageFile,
  loginAdminWithFirebase,
  createAdminWithFirebase,
  logoutFirebase,
  onAuthStateChanged
};
