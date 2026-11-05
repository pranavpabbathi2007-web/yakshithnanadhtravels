/**
 * YAKSHITH NANDH TRAVELS - Firebase SDK & Performance Configuration
 * Project: yakshithnandhtravels
 * Configured for Authentication, Cloud Firestore, Firebase Storage & Performance Monitoring
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getPerformance } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-performance.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
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
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize Performance Monitoring and get a reference to the service
let perf = null;
try {
  if (typeof window !== 'undefined') {
    perf = getPerformance(app);
    console.log('⚡ Firebase Performance Monitoring initialized.');
  }
} catch (perfErr) {
  console.warn('Firebase Performance Monitoring note:', perfErr.message);
}

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
    await setDoc(docRef, { ...vehicle, updated_at: new Date().toISOString() }, { merge: true });
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
    await setDoc(docRef, { ...destination, updated_at: new Date().toISOString() }, { merge: true });
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
    await setDoc(docRef, { ...trip, updated_at: new Date().toISOString() }, { merge: true });
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
    await setDoc(docRef, { ...service, updated_at: new Date().toISOString() }, { merge: true });
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
    await setDoc(docRef, { ...settings, updated_at: new Date().toISOString() }, { merge: true });
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
    await setDoc(docRef, { ...booking, updated_at: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore booking write note:', err.message);
    return false;
  }
}

/**
 * Record an updated image into Firestore admin_images collection
 */
async function recordAdminImageToFirestore(type, name, imageUrl) {
  if (!imageUrl) return;
  try {
    const cleanKey = String(name || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
    await setDoc(doc(db, 'admin_images', `${type}_${cleanKey}`), {
      category: type,
      title: name,
      image_url: imageUrl,
      updated_at: new Date().toISOString()
    }, { merge: true });
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

  // 1. Unified snapshot for instant public website 1-read hydration
  promises.push(
    setDoc(doc(db, 'site_content', 'data'), snapshot, { merge: true })
      .catch(e => console.warn('Snapshot write note:', e.message))
  );

  // 2. Admin profile collection document (admin/profile)
  promises.push(
    setDoc(doc(db, 'admin', 'profile'), {
      username: 'admin',
      email: 'admin@yakshithnandhtravels.com',
      role: 'Master Dispatcher & Administrator',
      company: 'Yakshith Nandh Travels',
      helpline: '+91 88868 30755 / +91 97009 35888',
      location: 'Tirupati, Andhra Pradesh, India',
      status: 'Active',
      updated_at: new Date().toISOString()
    }, { merge: true }).catch(e => console.warn('Admin profile note:', e.message))
  );

  // 3. Settings document
  if (snapshot.settings) {
    promises.push(
      setDoc(doc(db, 'settings', 'general'), snapshot.settings, { merge: true })
        .catch(e => console.warn('Settings write note:', e.message))
    );
  }

  // 4. Fleet collection documents
  if (Array.isArray(snapshot.fleet)) {
    for (const v of snapshot.fleet) {
      if (v && v.id) {
        promises.push(
          setDoc(doc(db, 'fleet', String(v.id)), v, { merge: true })
            .catch(e => console.warn('Fleet vehicle write note:', e.message))
        );
        if (v.image_url) {
          const cleanKey = String(v.model_name || v.id).replace(/[^a-zA-Z0-9_-]/g, '_');
          promises.push(
            setDoc(doc(db, 'admin_images', `vehicle_${cleanKey}`), {
              category: 'fleet',
              title: v.model_name,
              image_url: v.image_url,
              updated_at: new Date().toISOString()
            }, { merge: true }).catch(() => {})
          );
        }
      }
    }
  }

  // 5. Destinations collection documents
  if (Array.isArray(snapshot.destinations)) {
    for (const d of snapshot.destinations) {
      if (d && d.id) {
        promises.push(
          setDoc(doc(db, 'destinations', String(d.id)), d, { merge: true })
            .catch(e => console.warn('Destination write note:', e.message))
        );
        if (d.image_url) {
          const cleanKey = String(d.name || d.id).replace(/[^a-zA-Z0-9_-]/g, '_');
          promises.push(
            setDoc(doc(db, 'admin_images', `dest_${cleanKey}`), {
              category: 'destinations',
              title: d.name,
              image_url: d.image_url,
              updated_at: new Date().toISOString()
            }, { merge: true }).catch(() => {})
          );
        }
      }
    }
  }

  // 6. Trips collection documents
  if (Array.isArray(snapshot.trips)) {
    for (const t of snapshot.trips) {
      if (t && t.id) {
        promises.push(
          setDoc(doc(db, 'trips', String(t.id)), t, { merge: true })
            .catch(e => console.warn('Trip write note:', e.message))
        );
        if (t.image_url) {
          const cleanKey = String(t.title || t.id).replace(/[^a-zA-Z0-9_-]/g, '_');
          promises.push(
            setDoc(doc(db, 'admin_images', `trip_${cleanKey}`), {
              category: 'trips',
              title: t.title,
              image_url: t.image_url,
              updated_at: new Date().toISOString()
            }, { merge: true }).catch(() => {})
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
          setDoc(doc(db, 'services', String(s.id)), s, { merge: true })
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
  loginAdminWithFirebase,
  createAdminWithFirebase,
  logoutFirebase,
  onAuthStateChanged
};
