/**
 * YAKSHITH NANDH TRAVELS - Firebase Configuration & Services
 * Project: yakshithnandhtravels
 * Configured for Authentication, Cloud Firestore & Firebase Storage
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
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCVSV9cHimnG2PoACuwONHQlfJWx0iTpeQ",
  authDomain: "yakshithnandhtravels.firebaseapp.com",
  projectId: "yakshithnandhtravels",
  storageBucket: "yakshithnandhtravels.firebasestorage.app",
  messagingSenderId: "194071784196",
  appId: "1:194071784196:web:c3229a69053f269f0a3e51",
  measurementId: "G-DDBCQQG20Q"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Sign in Admin with Firebase Auth & retrieve profile from Firestore
 */
async function loginAdminWithFirebase(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  const token = await user.getIdToken();

  // Retrieve or initialize admin details in Firestore
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

/**
 * Register a new Admin in Firebase Authentication & Firestore
 */
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

/**
 * Upload an admin asset (e.g. vehicle image, receipt) to Firebase Storage
 */
async function uploadToFirebaseStorage(file, storagePath) {
  const fileRef = ref(storage, storagePath || `admin_uploads/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(fileRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

/**
 * Sign out from Firebase
 */
async function logoutFirebase() {
  await signOut(auth);
}

export {
  app,
  auth,
  db,
  storage,
  loginAdminWithFirebase,
  createAdminWithFirebase,
  uploadToFirebaseStorage,
  logoutFirebase,
  onAuthStateChanged
};
