/**
 * YAKSHITH NANDH TRAVELS - Admin Master Console Logic
 * Complete control over every section of the website
 * Equipped with Cloud Firestore Real-time Sync & Firebase Cloud Storage
 */

import {
  db,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
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
  compressImageFile
} from './firebase-sdk.js?v=1794080000000';

function showAdminToast(msg) {
  let toast = document.getElementById('adminGlobalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminGlobalToast';
    toast.style.cssText = 'position:fixed; bottom:24px; right:24px; background:#7B263A; color:#FFF9F0; border:1.5px solid #C49A52; padding:12px 22px; border-radius:10px; font-size:0.92rem; font-weight:700; z-index:999999; box-shadow:0 8px 24px rgba(0,0,0,0.35); transition:all 0.3s cubic-bezier(0.16, 1, 0.3, 1); transform:translateY(100px); opacity:0; pointer-events:none; display:flex; align-items:center; gap:8px;';
    document.body.appendChild(toast);
  }
  toast.innerHTML = msg;
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
  }, 4000);
}

async function syncStateToFirebaseCloud() {
  const currentSettings = getStorage('settings', SEED_DATA.settings);
  const snapshot = {
    fleet: allFleetData || [],
    destinations: allDestinationsData || [],
    trips: allTripsData || [],
    services: allServicesData || [],
    settings: currentSettings,
    updated_at: new Date().toISOString()
  };

  // 1. Always keep local storage updated
  setStorage('fleet', snapshot.fleet);
  setStorage('destinations', snapshot.destinations);
  setStorage('trips', snapshot.trips);
  setStorage('services', snapshot.services);
  setStorage('settings', snapshot.settings);

  // 2. High-speed multi-collection Cloud Firestore sync (Populates site_content, fleet, destinations, trips, services, settings)
  try {
    await syncAllToFirestore(snapshot);
    console.log('☁️ Synced updated data and collections to Cloud Firestore.');
  } catch (firestoreErr) {
    console.warn('Firestore sync note:', firestoreErr.message);
  }

  // 3. Sync to API server memoryStore & persistent storage
  try {
    await fetch('/api/sync-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot)
    });
  } catch (apiErr) {
    console.warn('API sync-state note:', apiErr.message);
  }
}

let initAdminCloudPromise = null;
let liveSnapshotAttached = false;

async function initAdminCloudState() {
  if (initAdminCloudPromise) {
    return initAdminCloudPromise;
  }
  initAdminCloudPromise = _doInitAdminCloudState();
  return initAdminCloudPromise;
}

async function _doInitAdminCloudState() {
  console.log('⚡ [Cloud Init] Starting Cloud Firestore state initialization...');

  // 1. Immediately hydrate memory & storage from local cache so the UI is responsive with 0ms wait
  allFleetData = getStorage('fleet', SEED_DATA.fleet);
  allDestinationsData = getStorage('destinations', SEED_DATA.destinations);
  allTripsData = getStorage('trips', SEED_DATA.trips);
  allServicesData = getStorage('services', SEED_DATA.services);

  const docRef = doc(db, 'site_content', 'data');

  // 2. Attach real-time Firestore listeners immediately so updates stream live
  if (!liveSnapshotAttached) {
    liveSnapshotAttached = true;
    try {
      // Monolithic site_content listener ONLY synchronizes services and settings
      // Fleet, destinations, and trips have dedicated collection listeners below to prevent image overwrites
      onSnapshot(docRef, (liveSnap) => {
        if (liveSnap && liveSnap.exists && liveSnap.exists()) {
          const liveData = liveSnap.data();
          if (liveData && liveData.updated_at) {
            let changed = false;
            if (Array.isArray(liveData.services) && liveData.services.length > 0) {
              allServicesData = liveData.services;
              setStorage('services', allServicesData);
              changed = true;
            }
            if (liveData.settings && typeof liveData.settings === 'object') {
              setStorage('settings', liveData.settings);
              changed = true;
            }
            if (changed) {
              console.log('⚡ [Real-time Sync] Settings/services updated from Cloud Firestore monolith.');
              loadStats().catch(() => {});
              loadServices().catch(() => {});
              loadSettings().catch(() => {});
            }
          }
        }
      }, (err) => {
        console.debug('Admin onSnapshot status:', err.message);
      });

      // Dedicated collection listeners: authoritative source for fleet, destinations, and trips
      onSnapshot(collection(db, 'destinations'), (snap) => {
        if (!snap.empty) {
          const destList = [];
          snap.forEach(d => {
            const item = d.data();
            if (item) {
              const idVal = item.id !== undefined ? item.id : (isNaN(d.id) ? d.id : parseInt(d.id, 10));
              let imgUrl = item.image_url || item.imageUrl || item.image || item.photo || '';
              if (!imgUrl) {
                const cleanKey = String(item.name || idVal).replace(/[^a-zA-Z0-9_-]/g, '_');
                imgUrl = adminImageMap[`destination_${cleanKey}`] ||
                         adminImageMap[`dest_${cleanKey}`] ||
                         adminImageMap[cleanKey] || '';
              }
              destList.push({ ...item, id: idVal, image_url: imgUrl });
            }
          });
          if (destList.length > 0) {
            // Deduplicate and merge with current in-memory images to never wipe valid photo
            const currentDest = allDestinationsData || [];
            const merged = destList.map(incoming => {
              const existing = currentDest.find(e => String(e.id) === String(incoming.id));
              const chosenImg = incoming.image_url || (existing ? existing.image_url : '') || '';
              return { ...incoming, image_url: chosenImg };
            });

            // Clean deduplication by destination name
            const seen = new Map();
            for (const item of merged) {
              const norm = (item.name || '').trim().toLowerCase();
              if (!seen.has(norm)) {
                seen.set(norm, item);
              } else {
                const prev = seen.get(norm);
                if (!prev.image_url && item.image_url) {
                  prev.image_url = item.image_url;
                }
              }
            }
            allDestinationsData = Array.from(seen.values());
            allDestinationsData.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
            setStorage('destinations', allDestinationsData);
            console.log('📍 [Real-time Destinations] Live collection updated from Firestore. Count:', allDestinationsData.length);
            loadDestinations(false).catch(() => {});
          }
        }
      }, (err) => console.debug('Admin destinations collection listener:', err.message));

      onSnapshot(collection(db, 'fleet'), (snap) => {
        if (!snap.empty) {
          const fleetList = [];
          snap.forEach(d => {
            const item = d.data();
            if (item) {
              const idVal = item.id !== undefined ? item.id : (isNaN(d.id) ? d.id : parseInt(d.id, 10));
              let imgUrl = item.image_url || item.imageUrl || item.image || item.photo || '';
              if (!imgUrl) {
                const cleanKey = String(item.model_name || item.name || idVal).replace(/[^a-zA-Z0-9_-]/g, '_');
                imgUrl = adminImageMap[`vehicle_${cleanKey}`] ||
                         adminImageMap[`veh_${cleanKey}`] ||
                         adminImageMap[`fleet_${cleanKey}`] ||
                         adminImageMap[cleanKey] || '';
              }
              fleetList.push({ ...item, id: idVal, image_url: imgUrl });
            }
          });
          if (fleetList.length > 0) {
            fleetList.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
            allFleetData = fleetList;
            setStorage('fleet', allFleetData);
            console.log('🚗 [Real-time Fleet] Live collection updated from Firestore. Count:', fleetList.length);
            loadFleet(false).catch(() => {});
          }
        }
      }, (err) => console.debug('Admin fleet collection listener:', err.message));

      onSnapshot(collection(db, 'trips'), (snap) => {
        if (!snap.empty) {
          const tripList = [];
          snap.forEach(d => {
            const item = d.data();
            if (item) {
              const idVal = item.id !== undefined ? item.id : (isNaN(d.id) ? d.id : parseInt(d.id, 10));
              let imgUrl = item.image_url || item.imageUrl || item.image || item.photo || '';
              if (!imgUrl) {
                const tripTitle = item.title || item.name || idVal;
                const cleanKey = String(tripTitle).replace(/[^a-zA-Z0-9_-]/g, '_');
                imgUrl = adminImageMap[`trip_${cleanKey}`] ||
                         adminImageMap[cleanKey] || '';
              }
              tripList.push({ ...item, id: idVal, image_url: imgUrl });
            }
          });
          if (tripList.length > 0) {
            tripList.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
            allTripsData = tripList;
            setStorage('trips', allTripsData);
            console.log('🧳 [Real-time Trips] Live collection updated from Firestore. Count:', tripList.length);
            loadTrips(false).catch(() => {});
          }
        }
      }, (err) => console.debug('Admin trips collection listener:', err.message));
    } catch (e) {
      console.debug('Snapshot listener setup note:', e.message);
    }
  }

  // 3. Load initial documents directly from Firestore collections (guarantees latest images on refresh)
  try {
    console.log('🔄 [Admin Hydration] Querying Firestore collections directly...');
    const [destSnap, fleetSnap, tripSnap, docSnap, adminImgSnap] = await Promise.all([
      getDocs(collection(db, 'destinations')).catch(err => { console.warn('destSnap warn:', err.message); return null; }),
      getDocs(collection(db, 'fleet')).catch(err => { console.warn('fleetSnap warn:', err.message); return null; }),
      getDocs(collection(db, 'trips')).catch(err => { console.warn('tripSnap warn:', err.message); return null; }),
      getDoc(docRef).catch(err => { console.warn('docSnap warn:', err.message); return null; }),
      getDocs(collection(db, 'admin_images')).catch(err => { console.warn('adminImgSnap warn:', err.message); return null; })
    ]);

    adminImageMap = {};
    if (adminImgSnap && !adminImgSnap.empty) {
      adminImgSnap.forEach(aiDoc => {
        const aiData = aiDoc.data();
        if (aiData && aiData.image_url) {
          adminImageMap[aiDoc.id] = aiData.image_url;
        }
      });
    }

    if (destSnap && !destSnap.empty) {
      const destList = [];
      destSnap.forEach(d => {
        const item = d.data();
        if (item) {
          const idVal = item.id !== undefined ? item.id : (isNaN(d.id) ? d.id : parseInt(d.id, 10));
          let imgUrl = item.image_url || item.imageUrl || item.image || item.photo || '';
          if (!imgUrl) {
            const cleanKey = String(item.name || idVal).replace(/[^a-zA-Z0-9_-]/g, '_');
            imgUrl = adminImageMap[`destination_${cleanKey}`] ||
                     adminImageMap[`dest_${cleanKey}`] ||
                     adminImageMap[cleanKey] || '';
          }
          destList.push({ ...item, id: idVal, image_url: imgUrl });
        }
      });
      if (destList.length > 0) {
        // Merge with existing in-memory images to never lose an image
        const currentDest = allDestinationsData || [];
        const merged = destList.map(incoming => {
          const existing = currentDest.find(e => String(e.id) === String(incoming.id));
          const incImg = incoming.image_url || '';
          const existingImg = existing ? (existing.image_url || '') : '';
          const keepExisting = existingImg && (existingImg.startsWith('data:') || existingImg.includes('firebasestorage')) && (!incImg || incImg.includes('unsplash.com'));
          const chosenImg = keepExisting ? existingImg : (incImg || existingImg || '');
          return { ...incoming, image_url: chosenImg };
        });

        // Clean deduplication by destination name
        const seen = new Map();
        for (const item of merged) {
          const norm = (item.name || '').trim().toLowerCase();
          if (!seen.has(norm)) {
            seen.set(norm, item);
          } else {
            const prev = seen.get(norm);
            if (!prev.image_url && item.image_url) {
              prev.image_url = item.image_url;
            }
          }
        }
        allDestinationsData = Array.from(seen.values());
        allDestinationsData.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
        setStorage('destinations', allDestinationsData);
        console.log('📍 [Admin Hydration] Loaded destinations from Firestore collection:', allDestinationsData.map(d => ({ id: d.id, name: d.name, has_image: !!d.image_url })));
        // Self-heal: If any destination has an image in adminImageMap that was missing in collection doc, persist it directly to Firestore doc
        for (const destItem of allDestinationsData) {
          if (destItem.image_url) {
            saveDestinationToFirestore(destItem).catch(() => {});
          }
        }
        loadDestinations(false).catch(() => {});
      }
    } else if (destSnap && destSnap.empty) {
      console.log('📍 [Admin Hydration] No destinations in Firestore collection yet. Seeding default destinations...');
      for (const d of SEED_DATA.destinations) {
        saveDestinationToFirestore(d).catch(() => {});
      }
    }

    if (fleetSnap && !fleetSnap.empty) {
      const fleetList = [];
      fleetSnap.forEach(d => {
        const item = d.data();
        if (item) {
          const idVal = item.id !== undefined ? item.id : (isNaN(d.id) ? d.id : parseInt(d.id, 10));
          let imgUrl = item.image_url || item.imageUrl || item.image || item.photo || '';
          if (!imgUrl) {
            const cleanKey = String(item.model_name || item.name || idVal).replace(/[^a-zA-Z0-9_-]/g, '_');
            imgUrl = adminImageMap[`vehicle_${cleanKey}`] ||
                     adminImageMap[`veh_${cleanKey}`] ||
                     adminImageMap[`fleet_${cleanKey}`] ||
                     adminImageMap[cleanKey] || '';
          }
          fleetList.push({ ...item, id: idVal, image_url: imgUrl });
        }
      });
      if (fleetList.length > 0) {
        const currentFleet = allFleetData || [];
        const mergedFleet = fleetList.map(incoming => {
          const existing = currentFleet.find(e => String(e.id) === String(incoming.id));
          const incImg = incoming.image_url || '';
          const existingImg = existing ? (existing.image_url || '') : '';
          const keepExisting = existingImg && (existingImg.startsWith('data:') || existingImg.includes('firebasestorage')) && (!incImg || incImg.includes('unsplash.com'));
          const chosenImg = keepExisting ? existingImg : (incImg || existingImg || '');
          return { ...incoming, image_url: chosenImg };
        });
        mergedFleet.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
        allFleetData = mergedFleet;
        setStorage('fleet', allFleetData);
        console.log('🚗 [Admin Hydration] Loaded fleet from Firestore collection:', allFleetData.map(v => ({ id: v.id, name: v.model_name, has_image: !!v.image_url })));
        // Self-heal: Ensure fleet collection doc has the image
        for (const vehItem of allFleetData) {
          if (vehItem.image_url) {
            saveVehicleToFirestore(vehItem).catch(() => {});
          }
        }
        loadFleet(false).catch(() => {});
      }
    } else {
      console.log('🚗 [Admin Hydration] No fleet in Firestore collection yet. Seeding default fleet...');
      for (const v of SEED_DATA.fleet) {
        saveVehicleToFirestore(v).catch(() => {});
      }
    }

    if (tripSnap && !tripSnap.empty) {
      const tripList = [];
      tripSnap.forEach(d => {
        const item = d.data();
        if (item) {
          const idVal = item.id !== undefined ? item.id : (isNaN(d.id) ? d.id : parseInt(d.id, 10));
          let imgUrl = item.image_url || item.imageUrl || item.image || item.photo || '';
          if (!imgUrl) {
            const tripTitle = item.title || item.name || idVal;
            const cleanKey = String(tripTitle).replace(/[^a-zA-Z0-9_-]/g, '_');
            imgUrl = adminImageMap[`trip_${cleanKey}`] ||
                     adminImageMap[cleanKey] || '';
          }
          tripList.push({ ...item, id: idVal, image_url: imgUrl });
        }
      });
      if (tripList.length > 0) {
        const currentTrips = allTripsData || [];
        const mergedTrips = tripList.map(incoming => {
          const existing = currentTrips.find(e => String(e.id) === String(incoming.id));
          const incImg = incoming.image_url || '';
          const existingImg = existing ? (existing.image_url || '') : '';
          const keepExisting = existingImg && (existingImg.startsWith('data:') || existingImg.includes('firebasestorage')) && (!incImg || incImg.includes('unsplash.com'));
          const chosenImg = keepExisting ? existingImg : (incImg || existingImg || '');
          return { ...incoming, image_url: chosenImg };
        });
        mergedTrips.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
        allTripsData = mergedTrips;
        setStorage('trips', allTripsData);
        console.log('🧳 [Admin Hydration] Loaded trips from Firestore collection:', allTripsData.map(t => ({ id: t.id, title: t.title || t.name, has_image: !!t.image_url })));
        loadTrips(false).catch(() => {});
      }
    } else {
      console.log('🧳 [Admin Hydration] No trips in Firestore collection yet. Seeding default trips...');
      for (const t of SEED_DATA.trips) {
        saveTripToFirestore(t).catch(() => {});
      }
    }

    if (docSnap && docSnap.exists && docSnap.exists()) {
      const cData = docSnap.data();
      if (cData) {
        if (Array.isArray(cData.services) && cData.services.length > 0) {
          allServicesData = cData.services;
          setStorage('services', allServicesData);
        }
        if (cData.settings && typeof cData.settings === 'object') {
          setStorage('settings', cData.settings);
        }
      }
    } else if (docSnap && !docSnap.exists()) {
      console.log('⚡ [Admin Hydration] Baseline site_content document not found. Syncing...');
      syncStateToFirebaseCloud().catch(() => {});
    }
    console.log('✅ [Admin Hydration] Cloud state initialization complete!');
    return true;
  } catch (err) {
    console.error('❌ [Admin Hydration] Error loading cloud collections:', err);
  }

  // 4. Secondary fallback: check local API server snapshot if available
  try {
    const apiRes = await fetch('/api/snapshot');
    if (apiRes.ok) {
      const s = await apiRes.json();
      if (s && s.success) {
        if (!allFleetData || allFleetData.length === 0) {
          if (Array.isArray(s.fleet)) { allFleetData = s.fleet; setStorage('fleet', allFleetData); }
        }
        if (!allDestinationsData || allDestinationsData.length === 0) {
          if (Array.isArray(s.destinations)) { allDestinationsData = s.destinations; setStorage('destinations', allDestinationsData); }
        }
        if (!allTripsData || allTripsData.length === 0) {
          if (Array.isArray(s.trips)) { allTripsData = s.trips; setStorage('trips', allTripsData); }
        }
        if (!allServicesData || allServicesData.length === 0) {
          if (Array.isArray(s.services)) { allServicesData = s.services; setStorage('services', allServicesData); }
        }
      }
    }
  } catch (apiErr) {
    // Expected when running purely on Vercel static
  }

  return true;
}

// ==========================================================================
// RESILIENT DATA LAYER (Auto-detects Node.js API vs Local Storage Fallback)
// Ensures Admin Console works on Node Server, Vercel, GitHub Pages, or any device!
// ==========================================================================

const SEED_DATA = {
  stats: { total: 4, pending: 1, confirmed: 2, today_scheduled: 2 },
  bookings: [
    {
      id: 1,
      booking_ref: 'YNT-2026-1001',
      customer_name: 'Rajesh Sharma',
      customer_phone: '+91 98480 22334',
      service_type: 'Tirumala Special Darshan Package',
      preferred_vehicle: 'Innova Crysta',
      pickup_location: 'Tirupati Central Station',
      destination: 'Tirumala Temple Hills',
      travel_date: new Date().toISOString().split('T')[0],
      passenger_count: 5,
      status: 'Confirmed',
      driver_name: 'Govinda Raju',
      driver_phone: '+91 88868 30755',
      vehicle_number: 'AP 03 TX 1122',
      fare_estimate: '₹2,800',
      created_at: '2026-11-04 09:30 AM'
    },
    {
      id: 2,
      booking_ref: 'YNT-2026-1002',
      customer_name: 'Ananya Deshmukh',
      customer_phone: '+91 97009 35888',
      service_type: 'Airport Transfer',
      preferred_vehicle: 'Swift Dzire',
      pickup_location: 'Renigunta Airport (TIR)',
      destination: 'Hotel Fortune Grand, Tirupati',
      travel_date: new Date().toISOString().split('T')[0],
      passenger_count: 2,
      status: 'Pending',
      driver_name: '',
      driver_phone: '',
      vehicle_number: '',
      fare_estimate: '',
      created_at: '2026-11-04 10:15 AM'
    },
    {
      id: 3,
      booking_ref: 'YNT-2026-1003',
      customer_name: 'K. S. Murthy',
      customer_phone: '+91 94401 55667',
      service_type: 'Outstation Pilgrimage',
      preferred_vehicle: 'Toyota Innova',
      pickup_location: 'Alipiri Footpath Entry',
      destination: 'Sri Kalahasti Temple & Kanipakam',
      travel_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      passenger_count: 6,
      status: 'Driver Assigned',
      driver_name: 'Srinivasulu M.',
      driver_phone: '+91 99887 66554',
      vehicle_number: 'AP 03 AB 4545',
      fare_estimate: '₹3,500',
      created_at: '2026-11-03 04:00 PM'
    },
    {
      id: 4,
      booking_ref: 'YNT-2026-1004',
      customer_name: 'Venkatesh Rao',
      customer_phone: '+91 98490 12345',
      service_type: 'Local Trips & Sightseeing',
      preferred_vehicle: 'Swift Dzire',
      pickup_location: 'Tirupati Bus Station',
      destination: 'Padmavathi Temple & City Tour',
      travel_date: new Date().toISOString().split('T')[0],
      passenger_count: 3,
      status: 'Completed',
      driver_name: 'M. Ramesh',
      driver_phone: '+91 97009 35888',
      vehicle_number: 'AP 03 BR 9876',
      fare_estimate: '₹1,500',
      created_at: '2026-11-02 11:00 AM'
    }
  ],
  services: [
    { id: 1, name: 'Local Trips & Sightseeing', category: 'City Tour', starting_price: '₹1,499', description: 'Explore the timeless heritage of Tirupati at your own comfortable pace with our flexible full-day and half-day packages.', features: 'Kapila Theertham, Padmavathi Temple, Govindaraja Temple' },
    { id: 2, name: 'Outstation Trips', category: 'Intercity', starting_price: '₹13/km', description: 'Comfortable, long-distance intercity travel from Tirupati to major metropolitan and pilgrimage destinations across South India.', features: 'Chennai, Bangalore, Hyderabad, Vellore Golden Temple' },
    { id: 3, name: 'Airport & Railway Transfers', category: 'Transfers', starting_price: '₹799', description: 'Punctual, guaranteed pickups from Tirupati Airport (Renigunta) and Tirupati Central / West Railway stations.', features: 'Flight tracking, luggage assistance, zero waiting surcharge' },
    { id: 4, name: 'Tirumala Special Darshan Packages', category: 'Pilgrimage', starting_price: '₹2,499', description: 'Hassle-free Tirumala hilltop transportation with seasoned mountain drivers certified for both ghat roads.', features: 'Doorstep pickup, customized itinerary, guidance on reporting hall' }
  ],
  fleet: [
    {
      id: 1,
      model_name: 'Swift Dzire',
      category: 'Sedan',
      capacity: '4 Passengers',
      airbags: 'Dual Front Airbags',
      luggage_bags: 'Dual Front Airbags',
      rate_per_km: '₹12/km',
      daily_rent: '₹2,499 / day',
      mileage: '22 km/l',
      description: 'Clean, fuel-efficient sedan ideal for small families and airport transfers.',
      image_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
      is_available: 1
    },
    {
      id: 2,
      model_name: 'Toyota Innova',
      category: 'Premium SUV',
      capacity: '7-8 Seats',
      airbags: 'Dual Front Airbags',
      luggage_bags: 'Dual Front Airbags',
      rate_per_km: '₹18/km',
      daily_rent: '₹3,499 / day',
      mileage: '13 km/l',
      description: 'Spacious family MPV with captain seats and ample comfort on Tirupati hills.',
      image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
      is_available: 1
    },
    {
      id: 3,
      model_name: 'Innova Crysta',
      category: 'Luxury MPV',
      capacity: '7+1 Seater',
      airbags: '7 Airbags (Knee + Curtain)',
      luggage_bags: '7 Airbags (Knee + Curtain)',
      rate_per_km: '₹22/km',
      daily_rent: '₹4,200 / day',
      mileage: '14 km/l',
      description: 'Top-tier pilgrimage comfort with plush interiors and superior ride quality on Tirumala mountain roads.',
      image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
      is_available: 1
    }
  ],
  destinations: [
    {
      id: 1,
      name: 'Tirumala Sri Venkateswara Temple',
      subtitle: 'Divine Hill Shrine',
      distance: '22 km',
      duration: '45 mins',
      description: 'The revered abode of Lord Balaji atop the divine Seven Hills of Seshachalam.',
      image_url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 2,
      name: 'Sri Kalahasteeswara Temple',
      subtitle: 'Rahu-Ketu Kshetra & Vayu Lingam',
      distance: '38 km',
      duration: '50 mins',
      description: 'Ancient Shiva temple renowned worldwide for Rahu-Ketu Sarpa Dosha Nivarana pujas.',
      image_url: 'https://images.unsplash.com/photo-1609766857329-a1b7e1933010?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 3,
      name: 'Kanipakam Varasiddhi Vinayaka',
      subtitle: 'Self-Manifested Swayambhu Ganesha',
      distance: '72 km',
      duration: '1.5 hrs',
      description: 'A divine water shrine where the historic Ganesha idol is known to grow continuously in size.',
      image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 4,
      name: 'Sri Padmavathi Ammavari Temple',
      subtitle: 'Tiruchanoor Divine Mother',
      distance: '5 km',
      duration: '15 mins',
      description: 'The essential consort shrine where pilgrims seek blessings before or after Tirumala darshan.',
      image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 5,
      name: 'Sripuram Golden Temple (Vellore)',
      subtitle: 'Gilded Mahalakshmi Shrine',
      distance: '105 km',
      duration: '2.5 hrs',
      description: 'Magnificent temple layered with over 1,500 kilograms of pure gold leaf.',
      image_url: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?auto=format&fit=crop&w=800&q=80'
    }
  ],
  trips: [
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
  ],
  contacts: [
    { id: 1, name: 'Padmavathi Devi', phone: '+91 98480 33445', email: 'padma@example.com', message: 'Looking for 3-day round trip cab package for 6 elders visiting Tirumala and Kanipakam in December.', status: 'New', created_at: '2026-11-04 08:20 AM' }
  ],
  settings: {
    company_name: 'Yakshith Nandh Travels',
    slogan: 'Your Safety, Our Priority.',
    primary_phone: '+91 88868 30755',
    secondary_phone: '+91 97009 35888',
    email: 'yakshithnandhtravels.demo@gmail.com',
    location: 'Tirupati, Andhra Pradesh, India',
    announcement: '24/7 Available • Pilgrimage & Cab Service in Tirupati'
  }
};

function getStorage(key, defaultVal) {
  try {
    const raw = localStorage.getItem('ynt_' + key);
    if (!raw) {
      localStorage.setItem('ynt_' + key, JSON.stringify(defaultVal));
      return JSON.parse(JSON.stringify(defaultVal));
    }
    return JSON.parse(raw);
  } catch (e) {
    return defaultVal;
  }
}

function setStorage(key, val) {
  try {
    localStorage.setItem('ynt_' + key, JSON.stringify(val));
  } catch (e) {}
}

/**
 * High-performance client-side image compression
 * Converts camera or mobile photos into an optimized, fast-loading JPEG (~50-80KB)
 */
function compressVehicleImage(file) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      resolve({ blob: file, dataUrl: '' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = 900;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        canvas.toBlob((blob) => {
          resolve({ blob: blob || file, dataUrl });
        }, 'image/jpeg', 0.82);
      };
      img.onerror = () => resolve({ blob: file, dataUrl: e.target.result });
      img.src = e.target.result;
    };
    reader.onerror = () => resolve({ blob: file, dataUrl: '' });
    reader.readAsDataURL(file);
  });
}

/**
 * Unified Admin Image Uploader
 * Delegates to uploadImageToFirebaseStorage with automatic compression and fallback
 * Returns { success, url, storagePath, source }
 */
async function uploadImageToServer(file, folder = 'general') {
  if (!file) return null;
  try {
    return await uploadImageToFirebaseStorage(file, folder);
  } catch (err) {
    console.error(`Upload error for [${folder}]:`, err);
    return null;
  }
}

let currentStatusFilter = 'All';
let currentSearchTerm = '';
let allServicesData = [];
let allFleetData = [];
let allDestinationsData = [];
let allTripsData = [];
let adminImageMap = {}; // Global authoritative image cache

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
  const vehicleImageFile = document.getElementById('veh_image_file');
  const destinationForm = document.getElementById('destinationForm');
  const destinationImageFile = document.getElementById('dest_image_file');
  const tripForm = document.getElementById('tripForm');
  const tripImageFile = document.getElementById('trip_image_file');
  const settingsForm = document.getElementById('settingsForm');

  // Load All Sections Data
  loadAllData();

  // Switch tab function (Clean URLs, NO '#' symbol)
  window.switchAdminTab = (viewId) => {
    mainTabButtons.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-view') === viewId);
    });
    viewPanels.forEach(p => {
      p.classList.toggle('active', p.getAttribute('id') === viewId);
    });
    if (window.location.hash) {
      try {
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      } catch (e) {}
    }
  };

  // Tab Switching Buttons
  mainTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.getAttribute('data-view');
      window.switchAdminTab(viewId);
    });
  });

  // Check URL query view parameter (e.g. ?view=destinations)
  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get('view');
  if (viewParam) {
    if (viewParam === 'services') window.switchAdminTab('services-view');
    else if (viewParam === 'fleet' || viewParam === 'vehicles') window.switchAdminTab('fleet-view');
    else if (viewParam === 'destinations') window.switchAdminTab('destinations-view');
    else if (viewParam === 'trips' || viewParam === 'packages') window.switchAdminTab('trips-view');
    else if (viewParam === 'messages' || viewParam === 'contacts') window.switchAdminTab('messages-view');
    else if (viewParam === 'settings' || viewParam === 'brand') window.switchAdminTab('settings-view');
    else if (viewParam === 'bookings') window.switchAdminTab('bookings-view');
  }

  // Remove any legacy hash
  if (window.location.hash) {
    try {
      history.replaceState(null, document.title, window.location.pathname + window.location.search);
    } catch (e) {}
  }

  // Refresh All Button
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.textContent = 'Refreshing...';
      loadAllData().then(() => {
        refreshBtn.innerHTML = `
          <svg style="width:14px;height:14px;fill:currentColor" viewBox="0 0 24 24">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          Refresh All
        `;
      });
    });
  }

  // Search Input Handler
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentSearchTerm = e.target.value.trim();
        loadBookings();
      }, 250);
    });
  }

  // Filter Tabs Handler
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentStatusFilter = tab.getAttribute('data-status');
      loadBookings();
    });
  });

  // ==========================================================================
  // FORM SUBMISSION HANDLERS
  // ==========================================================================

  // Status Modal Submit
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
        if (!res.ok) throw new Error('API offline');
      } catch (err) {
        const bookings = getStorage('bookings', SEED_DATA.bookings);
        const idx = bookings.findIndex(b => String(b.id) === String(bookingId));
        if (idx !== -1) {
          bookings[idx].status = newStatus;
          setStorage('bookings', bookings);
        }
      }

      window.closeStatusModal();
      loadStats();
      loadBookings();
    });
  }

  // Assign Driver Modal Submit
  if (assignForm) {
    assignForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bookingId = document.getElementById('assignBookingId').value;
      const payload = {
        driver_name: document.getElementById('assignDriverName').value.trim(),
        driver_phone: document.getElementById('assignDriverPhone').value.trim(),
        vehicle_number: document.getElementById('assignVehicleNumber').value.trim(),
        fare_estimate: document.getElementById('assignFare').value.trim()
      };

      try {
        const res = await fetch(`/api/bookings/${bookingId}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('API offline');
      } catch (err) {
        const bookings = getStorage('bookings', SEED_DATA.bookings);
        const idx = bookings.findIndex(b => String(b.id) === String(bookingId));
        if (idx !== -1) {
          bookings[idx].driver_name = payload.driver_name;
          bookings[idx].driver_phone = payload.driver_phone;
          bookings[idx].vehicle_number = payload.vehicle_number;
          bookings[idx].fare_estimate = payload.fare_estimate;
          bookings[idx].status = 'Driver Assigned';
          setStorage('bookings', bookings);
        }
      }

      window.closeAssignModal();
      loadStats();
      loadBookings();
    });
  }

  // New Booking Modal Submit
  if (newBookingForm) {
    newBookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        customer_name: document.getElementById('nb_name').value.trim(),
        customer_phone: document.getElementById('nb_phone').value.trim(),
        service_type: document.getElementById('nb_service').value,
        preferred_vehicle: document.getElementById('nb_vehicle').value,
        pickup_location: document.getElementById('nb_pickup').value.trim(),
        destination: ((document.getElementById('nb_destination') || document.getElementById('nb_drop'))?.value || '').trim(),
        travel_date: document.getElementById('nb_date').value,
        passenger_count: parseInt(document.getElementById('nb_passengers').value, 10) || 1,
        additional_notes: document.getElementById('nb_notes').value.trim()
      };

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('API offline');
      } catch (err) {
        const bookings = getStorage('bookings', SEED_DATA.bookings);
        const newRef = 'YNT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
        const newBooking = {
          id: Date.now(),
          booking_ref: newRef,
          ...payload,
          status: 'Pending',
          driver_name: '',
          driver_phone: '',
          vehicle_number: '',
          fare_estimate: '',
          created_at: new Date().toLocaleString()
        };
        bookings.unshift(newBooking);
        setStorage('bookings', bookings);
      }

      window.closeNewBookingModal();
      loadStats();
      loadBookings();
      alert('Booking registered successfully!');
    });
  }

  // ==========================================================================
  // DUAL-MODE IMAGE MANAGEMENT: FILE UPLOAD & DIRECT WEB URL (UNSPLASH / CDN)
  // ==========================================================================

  const activeImageModes = { veh: 'file', dest: 'file', trip: 'file' };

  window.switchImageInputMode = function(prefix, mode) {
    activeImageModes[prefix] = mode;
    const fileContainer = document.getElementById(`${prefix}_file_container`);
    const urlContainer = document.getElementById(`${prefix}_url_container`);
    const fileBtn = document.getElementById(`${prefix}_mode_file_btn`);
    const urlBtn = document.getElementById(`${prefix}_mode_url_btn`);

    if (mode === 'file') {
      if (fileContainer) fileContainer.style.display = 'block';
      if (urlContainer) urlContainer.style.display = 'none';
      if (fileBtn) {
        fileBtn.style.background = '#8B2635';
        fileBtn.style.color = '#fff';
      }
      if (urlBtn) {
        urlBtn.style.background = 'transparent';
        urlBtn.style.color = '#555';
      }
    } else {
      if (fileContainer) fileContainer.style.display = 'none';
      if (urlContainer) urlContainer.style.display = 'block';
      if (urlBtn) {
        urlBtn.style.background = '#8B2635';
        urlBtn.style.color = '#fff';
      }
      if (fileBtn) {
        fileBtn.style.background = 'transparent';
        fileBtn.style.color = '#555';
      }
      const urlInput = document.getElementById(`${prefix}_image_url`);
      if (urlInput) {
        urlInput.focus();
        if (urlInput.value.trim()) {
          window.previewImageUrl(prefix);
        }
      }
    }
  };

  window.previewImageUrl = function(prefix) {
    const urlInput = document.getElementById(`${prefix}_image_url`);
    const previewBox = document.getElementById(`${prefix}_image_preview_box`);
    const previewImg = document.getElementById(`${prefix}_image_preview`);
    const statusText = document.getElementById(`${prefix}_upload_status`);
    const sourceText = document.getElementById(`${prefix}_upload_source`);
    const fileInput = document.getElementById(`${prefix}_image_file`);

    if (!urlInput) return;
    const rawUrl = urlInput.value.trim();

    if (!rawUrl) {
      if (previewBox) previewBox.style.display = 'none';
      return;
    }

    if (fileInput) fileInput.value = ''; // URL takes precedence
    if (previewBox) previewBox.style.display = 'flex';
    if (statusText) statusText.innerHTML = '⚡ Checking image link...';

    const testImg = new Image();
    testImg.onload = () => {
      if (previewImg) previewImg.src = rawUrl;
      if (statusText) statusText.innerHTML = '✅ Valid Image URL loaded';
      if (sourceText) sourceText.innerHTML = 'External Web URL (Unsplash / CDN)';
    };
    testImg.onerror = () => {
      if (previewImg) previewImg.src = rawUrl;
      if (statusText) statusText.innerHTML = '⚠️ Image URL ready to save';
      if (sourceText) sourceText.innerHTML = 'Will be verified and rendered directly';
    };
    testImg.src = rawUrl;
  };

  window.clearSelectedImage = function(prefix) {
    const fileInput = document.getElementById(`${prefix}_image_file`);
    const urlInput = document.getElementById(`${prefix}_image_url`);
    const previewBox = document.getElementById(`${prefix}_image_preview_box`);
    const previewImg = document.getElementById(`${prefix}_image_preview`);

    if (fileInput) fileInput.value = '';
    if (urlInput) urlInput.value = '';
    if (previewImg) previewImg.src = '';
    if (previewBox) previewBox.style.display = 'none';
  };

  // Wire up instant typing and paste listeners for all URL input boxes
  ['veh', 'dest', 'trip'].forEach(prefix => {
    const urlInput = document.getElementById(`${prefix}_image_url`);
    if (urlInput) {
      urlInput.addEventListener('input', () => window.previewImageUrl(prefix));
      urlInput.addEventListener('paste', () => setTimeout(() => window.previewImageUrl(prefix), 40));
    }
  });

  // ==========================================================================
  // VEHICLE IMAGE UPLOAD & VEHICLE FORM HANDLER
  // ==========================================================================

  if (vehicleImageFile) {
    vehicleImageFile.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const previewBox = document.getElementById('veh_image_preview_box');
      const previewImg = document.getElementById('veh_image_preview');
      const statusText = document.getElementById('veh_upload_status');
      const sourceText = document.getElementById('veh_upload_source');
      const urlInput = document.getElementById('veh_image_url');

      if (previewBox) previewBox.style.display = 'flex';
      if (statusText) statusText.innerHTML = '⚡ Processing photo...';

      try {
        const uploaded = await uploadImageToFirebaseStorage(file, 'vehicles');
        if (uploaded && uploaded.url) {
          if (previewImg) previewImg.src = uploaded.url;
          if (urlInput) urlInput.value = uploaded.url;
          if (statusText) statusText.innerHTML = '✅ Photo optimized & ready to save';
          if (sourceText) sourceText.innerHTML = 'Saved directly to Cloud Firestore collection';
        }
      } catch (uploadErr) {
        console.warn('Vehicle photo upload warning:', uploadErr.message);
        if (statusText) statusText.innerHTML = '⚠️ Image processing fallback active';
      }
    });
  }

  if (vehicleForm) {
    vehicleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('vehicleId').value;
      const saveBtn = document.getElementById('saveVehicleSubmitBtn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving Vehicle...';
      }

      console.log(`🚗 [Vehicle Save] Form submitted for ID: ${id || '(new vehicle)'}`);

      const activeMode = activeImageModes['veh'] || 'file';
      const pickedFile = vehicleImageFile && vehicleImageFile.files && vehicleImageFile.files[0];
      let imageUrl = document.getElementById('veh_image_url').value.trim();

      // If in file mode and file chosen, upload it
      if (activeMode === 'file' && pickedFile) {
        console.log(`🚗 [Vehicle Save] Uploading photo: ${pickedFile.name} (${pickedFile.size} bytes)`);
        if (saveBtn) saveBtn.textContent = 'Uploading Vehicle Image...';
        try {
          const uploaded = await uploadImageToFirebaseStorage(pickedFile, 'vehicles');
          if (uploaded && uploaded.url) {
            imageUrl = uploaded.url;
            document.getElementById('veh_image_url').value = imageUrl;
            console.log(`🚗 [Vehicle Save] Image upload success! Source: ${uploaded.source}, URL: ${imageUrl.startsWith('data:') ? 'Base64 data URL (' + imageUrl.length + ' chars)' : imageUrl}`);
          }
        } catch (err) {
          console.warn('Vehicle image upload error on submit:', err.message);
        }
      }

      // If no new file and no input URL, preserve existing vehicle image URL
      if (!imageUrl && id) {
        const existing = allFleetData.find(v => String(v.id) === String(id));
        if (existing && existing.image_url) {
          imageUrl = existing.image_url;
          console.log(`🚗 [Vehicle Save] Preserving existing vehicle image URL: ${imageUrl.startsWith('data:') ? 'Base64 data URL' : imageUrl}`);
        }
      }

      const airbagsInput = document.getElementById('veh_airbags') || document.getElementById('veh_luggage');
      const airbagsVal = airbagsInput ? airbagsInput.value.trim() : 'Dual Airbags';

      const vehStatusEl = document.getElementById('veh_status');
      const isAvailableVal = vehStatusEl ? parseInt(vehStatusEl.value, 10) : 1;

      const payload = {
        model_name: document.getElementById('veh_name').value.trim(),
        category: document.getElementById('veh_category').value.trim(),
        capacity: document.getElementById('veh_capacity').value.trim() || '4 Seater',
        airbags: airbagsVal || 'Dual Airbags',
        luggage_bags: airbagsVal || 'Dual Airbags',
        rate_per_km: document.getElementById('veh_rate').value.trim(),
        daily_rent: document.getElementById('veh_daily_rent') ? document.getElementById('veh_daily_rent').value.trim() : '',
        mileage: document.getElementById('veh_mileage') ? document.getElementById('veh_mileage').value.trim() : '',
        description: document.getElementById('veh_desc').value.trim(),
        image_url: imageUrl,
        is_available: isAvailableVal,
        is_published: isAvailableVal
      };

      // 1. Immediately update allFleetData & localStorage
      if (!allFleetData || allFleetData.length === 0) {
        allFleetData = getStorage('fleet', SEED_DATA.fleet);
      }
      if (id) {
        payload.id = parseInt(id, 10);
        const idx = allFleetData.findIndex(v => String(v.id) === String(id));
        if (idx !== -1) {
          allFleetData[idx] = { ...allFleetData[idx], ...payload };
        } else {
          allFleetData.push(payload);
        }
      } else {
        payload.id = Date.now();
        allFleetData.push(payload);
      }
      setStorage('fleet', allFleetData);

      console.log(`🚗 [Vehicle Save] Saving to Firestore "fleet" collection doc ID: ${payload.id}...`, {
        model_name: payload.model_name,
        category: payload.category,
        rate_per_km: payload.rate_per_km,
        has_image: !!payload.image_url
      });

      // Save directly to Firestore fleet collection & admin_images
      const savedToFirestore = await saveVehicleToFirestore(payload);
      console.log(`🚗 [Vehicle Save] Firestore write: ${savedToFirestore ? '✅ SUCCESS' : '❌ ERROR'}`);

      if (payload.image_url) {
        await recordAdminImageToFirestore('vehicle', payload.model_name, payload.image_url);
      }

      // 2. Call API
      try {
        const url = id ? `/api/fleet/${id}` : '/api/fleet';
        const method = id ? 'PATCH' : 'POST';
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {}

      // 3. Immediately sync to Firebase Cloud Storage and server memoryStore
      await syncStateToFirebaseCloud();
      console.log(`🚗 [Vehicle Save] Complete! Total fleet vehicles now: ${allFleetData.length}`);

      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Vehicle';
      }

      window.closeVehicleModal();
      await loadFleet(false);
      showAdminToast(`✅ Vehicle <strong>${payload.model_name}</strong> saved & synced!`);
    });
  }

  // ==========================================================================
  // DESTINATION IMAGE UPLOAD & DESTINATION FORM HANDLER
  // ==========================================================================

  if (destinationImageFile) {
    destinationImageFile.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const previewBox = document.getElementById('dest_image_preview_box');
      const previewImg = document.getElementById('dest_image_preview');
      const statusText = document.getElementById('dest_upload_status');
      const urlInput = document.getElementById('dest_image_url');

      if (previewBox) previewBox.style.display = 'flex';
      if (statusText) statusText.innerHTML = '⚡ Processing and uploading photo...';

      try {
        const uploaded = await uploadImageToFirebaseStorage(file, 'destinations');
        if (uploaded && uploaded.url) {
          if (previewImg) previewImg.src = uploaded.url;
          if (urlInput) urlInput.value = uploaded.url;
          if (statusText) {
            statusText.innerHTML = uploaded.source === 'firebase_storage'
              ? '✅ Uploaded to Firebase Storage'
              : '✅ Photo optimized & ready to save';
          }
        }
      } catch (uploadErr) {
        console.warn('Destination photo upload warning:', uploadErr.message);
        if (statusText) statusText.innerHTML = '⚠️ Image processing fallback active';
      }
    });
  }

  if (destinationForm) {
    destinationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('destId').value;
      const saveBtn = document.getElementById('saveDestinationSubmitBtn') || destinationForm.querySelector('button[type="submit"]');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving Destination...';
      }

      console.log(`📍 [Destination Save] Form submitted for ID: ${id || '(new destination)'}`);

      const activeMode = (typeof activeImageModes !== 'undefined' && activeImageModes['dest']) || 'file';
      const destFile = (activeMode === 'file') ? (destinationImageFile && destinationImageFile.files && destinationImageFile.files[0]) : null;
      let imageUrl = (document.getElementById('dest_image_url')?.value || '').trim();

      // If a new file is chosen in file mode, upload it
      if (activeMode === 'file' && destFile) {
        console.log(`📍 [Destination Save] Uploading photo: ${destFile.name} (${destFile.size} bytes)`);
        if (saveBtn) saveBtn.textContent = 'Uploading Destination Image...';
        try {
          const uploaded = await uploadImageToFirebaseStorage(destFile, 'destinations');
          if (uploaded && uploaded.url) {
            imageUrl = uploaded.url;
            const destUrlEl = document.getElementById('dest_image_url');
            if (destUrlEl) destUrlEl.value = imageUrl;
            console.log(`📍 [Destination Save] Image upload success! Source: ${uploaded.source}, URL: ${imageUrl.startsWith('data:') ? 'Base64 data URL (' + imageUrl.length + ' chars)' : imageUrl}`);
          }
        } catch (err) {
          console.warn('Destination image upload error on submit:', err.message);
        }
      }

      // Check live preview element if imageUrl is still empty
      if (!imageUrl) {
        const previewImg = document.getElementById('dest_image_preview');
        if (previewImg && previewImg.src && !previewImg.src.endsWith('/admin') && !previewImg.src.includes('placeholder')) {
          imageUrl = previewImg.src;
        }
      }

      // If no new file and no input URL, preserve existing destination image URL by ID
      if (!imageUrl && id) {
        const existing = allDestinationsData.find(d => String(d.id) === String(id));
        if (existing && existing.image_url) {
          imageUrl = existing.image_url;
          console.log(`📍 [Destination Save] Preserving existing destination image URL: ${imageUrl.startsWith('data:') ? 'Base64 data URL' : imageUrl}`);
        }
      }

      // If still empty, check by destination name
      if (!imageUrl) {
        const destNameInput = (document.getElementById('dest_name')?.value || '').trim().toLowerCase();
        if (destNameInput) {
          const existingByName = allDestinationsData.find(d => (d.name || '').trim().toLowerCase() === destNameInput);
          if (existingByName && existingByName.image_url) {
            imageUrl = existingByName.image_url;
            console.log(`📍 [Destination Save] Preserved image URL by matching destination name "${destNameInput}"`);
          }
        }
      }

      const destStatusEl = document.getElementById('dest_status');
      const isPopVal = destStatusEl ? parseInt(destStatusEl.value, 10) : 1;

      const payload = {
        name: document.getElementById('dest_name').value.trim(),
        subtitle: document.getElementById('dest_subtitle').value.trim(),
        distance: document.getElementById('dest_distance').value.trim(),
        duration: document.getElementById('dest_duration').value.trim(),
        description: document.getElementById('dest_desc').value.trim(),
        image_url: imageUrl,
        is_popular: isPopVal,
        is_published: isPopVal
      };

      if (!allDestinationsData || allDestinationsData.length === 0) {
        allDestinationsData = getStorage('destinations', SEED_DATA.destinations);
      }
      if (id) {
        payload.id = parseInt(id, 10);
        const idx = allDestinationsData.findIndex(d => String(d.id) === String(id));
        if (idx !== -1) {
          allDestinationsData[idx] = { ...allDestinationsData[idx], ...payload };
        } else {
          allDestinationsData.push(payload);
        }
      } else {
        payload.id = Date.now();
        allDestinationsData.push(payload);
      }
      setStorage('destinations', allDestinationsData);

      console.log(`📍 [Destination Save] Saving to Firestore "destinations" collection doc ID: ${payload.id}...`, {
        name: payload.name,
        distance: payload.distance,
        duration: payload.duration,
        has_image: !!payload.image_url
      });

      // Save directly to Firestore destinations collection & admin_images
      const savedToFirestore = await saveDestinationToFirestore(payload);
      console.log(`📍 [Destination Save] Firestore write: ${savedToFirestore ? '✅ SUCCESS' : '❌ ERROR'}`);

      if (payload.image_url) {
        await recordAdminImageToFirestore('destination', payload.name, payload.image_url);
      }

      try {
        const url = id ? `/api/destinations/${id}` : '/api/destinations';
        const method = id ? 'PATCH' : 'POST';
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {}

      await syncStateToFirebaseCloud();
      console.log(`📍 [Destination Save] Complete! Total destinations now: ${allDestinationsData.length}`);

      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Destination';
      }

      window.closeDestinationModal();
      await loadDestinations(false);
      showAdminToast(`✅ Destination <strong>${payload.name}</strong> saved & synced!`);
    });
  }

  // ==========================================================================
  // TRIP IMAGE UPLOAD & TRIP FORM HANDLER
  // ==========================================================================

  if (tripImageFile) {
    tripImageFile.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const previewBox = document.getElementById('trip_image_preview_box');
      const previewImg = document.getElementById('trip_image_preview');
      const statusText = document.getElementById('trip_upload_status');
      const urlInput = document.getElementById('trip_image_url');

      if (previewBox) previewBox.style.display = 'flex';
      if (statusText) statusText.innerHTML = '⚡ Processing and uploading photo...';

      try {
        const uploaded = await uploadImageToFirebaseStorage(file, 'trips');
        if (uploaded && uploaded.url) {
          if (previewImg) previewImg.src = uploaded.url;
          if (urlInput) urlInput.value = uploaded.url;
          if (statusText) {
            statusText.innerHTML = uploaded.source === 'firebase_storage'
              ? '✅ Uploaded to Firebase Storage'
              : '✅ Photo optimized & ready to save';
          }
        }
      } catch (uploadErr) {
        console.warn('Trip photo upload warning:', uploadErr.message);
        if (statusText) statusText.innerHTML = '⚠️ Image processing fallback active';
      }
    });
  }

  if (tripForm) {
    tripForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('tripId').value;
      const saveBtn = document.getElementById('saveTripSubmitBtn') || tripForm.querySelector('button[type="submit"]');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving Package...';
      }

      const activeMode = (typeof activeImageModes !== 'undefined' && activeImageModes['trip']) || 'file';
      const pickedFile = (activeMode === 'file') ? (tripImageFile && tripImageFile.files && tripImageFile.files[0]) : null;
      let imageUrl = document.getElementById('trip_image_url').value.trim();

      // If a new file is chosen in file mode, upload it
      if (activeMode === 'file' && pickedFile) {
        if (saveBtn) saveBtn.textContent = 'Uploading Trip Package Image...';
        try {
          const uploaded = await uploadImageToFirebaseStorage(pickedFile, 'trips');
          if (uploaded && uploaded.url) {
            imageUrl = uploaded.url;
            document.getElementById('trip_image_url').value = imageUrl;
          }
        } catch (err) {
          console.warn('Trip image upload error on submit:', err.message);
        }
      }

      // If no new file and no input URL, preserve existing trip image URL
      if (!imageUrl && id) {
        const existing = allTripsData.find(t => String(t.id) === String(id));
        if (existing && existing.image_url) {
          imageUrl = existing.image_url;
        }
      }

      const tripStatusEl = document.getElementById('trip_status');
      const isPopVal = tripStatusEl ? parseInt(tripStatusEl.value, 10) : 1;
      const tripTitle = document.getElementById('trip_title').value.trim();

      const payload = {
        title: tripTitle,
        name: tripTitle,
        duration_days: document.getElementById('trip_duration').value.trim(),
        subtitle: document.getElementById('trip_subtitle').value.trim(),
        starting_price: document.getElementById('trip_price').value.trim(),
        itinerary: document.getElementById('trip_itinerary').value.trim(),
        vehicle_pricing: document.getElementById('trip_vehicle_pricing').value.trim(),
        inclusions: document.getElementById('trip_inclusions').value.trim(),
        exclusions: document.getElementById('trip_exclusions').value.trim(),
        image_url: imageUrl,
        is_popular: isPopVal,
        is_active: isPopVal,
        is_published: isPopVal
      };

      if (!allTripsData || allTripsData.length === 0) {
        allTripsData = getStorage('trips', SEED_DATA.trips);
      }
      if (id) {
        payload.id = parseInt(id, 10);
        const idx = allTripsData.findIndex(t => String(t.id) === String(id));
        if (idx !== -1) {
          allTripsData[idx] = { ...allTripsData[idx], ...payload };
        } else {
          allTripsData.push(payload);
        }
      } else {
        payload.id = Date.now();
        allTripsData.push(payload);
      }
      setStorage('trips', allTripsData);

      // Save directly to Firestore trips collection & admin_images
      await saveTripToFirestore(payload);
      if (payload.image_url) {
        await recordAdminImageToFirestore('trip', payload.title, payload.image_url);
      }

      try {
        const url = id ? `/api/trips/${id}` : '/api/trips';
        const method = id ? 'PATCH' : 'POST';
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {}

      await syncStateToFirebaseCloud();

      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Trip Package';
      }

      window.closeTripModal();
      await loadTrips(false);
      showAdminToast(`✅ Package <strong>${payload.title}</strong> saved & synced!`);
    });
  }

  // Service Form Submit
  if (serviceEditForm) {
    serviceEditForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editServiceId').value;
      const svcStatusEl = document.getElementById('editServiceStatus');
      const isActVal = svcStatusEl ? parseInt(svcStatusEl.value, 10) : 1;

      const payload = {
        name: document.getElementById('editServiceName').value.trim(),
        starting_price: document.getElementById('editServicePrice').value.trim(),
        description: document.getElementById('editServiceDesc').value.trim(),
        features: document.getElementById('editServiceFeatures').value.trim(),
        is_active: isActVal,
        is_published: isActVal
      };

      if (!allServicesData || allServicesData.length === 0) {
        allServicesData = getStorage('services', SEED_DATA.services);
      }
      if (id) {
        payload.id = parseInt(id, 10);
        const idx = allServicesData.findIndex(s => String(s.id) === String(id));
        if (idx !== -1) {
          allServicesData[idx] = { ...allServicesData[idx], ...payload };
        } else {
          allServicesData.push(payload);
        }
      } else {
        payload.id = Date.now();
        allServicesData.push(payload);
      }
      setStorage('services', allServicesData);
      saveServiceToFirestore(payload).catch(() => {});

      try {
        const url = id ? `/api/services/${id}` : '/api/services';
        const method = id ? 'PATCH' : 'POST';
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {}

      await syncStateToFirebaseCloud();
      window.closeServiceEditModal();
      await loadServices(false);
      alert(id ? 'Service updated!' : 'Service created!');
    });
  }

  // Settings Form Submit
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const getVal = (id1, id2, def = '') => {
        const el = document.getElementById(id1) || document.getElementById(id2);
        return el ? el.value.trim() : def;
      };

      const payload = {
        company_name: getVal('setting_company_name', 'set_company_name', 'Yakshith Nandh Travels'),
        slogan: getVal('setting_slogan', 'set_slogan', 'Your Safety, Our Priority.'),
        primary_phone: getVal('setting_primary_phone', 'set_primary_phone', '+91 88868 30755'),
        secondary_phone: getVal('setting_secondary_phone', 'set_secondary_phone', '+91 97009 35888'),
        email: getVal('setting_email', 'set_email', 'yakshithnandhtravels.demo@gmail.com'),
        location: getVal('setting_location', 'set_location', 'Tirupati, Andhra Pradesh, India'),
        announcement: getVal('setting_announcement', 'set_announcement', '24/7 Available • Pilgrimage & Cab Service in Tirupati')
      };

      setStorage('settings', payload);
      saveSettingsToFirestore(payload).catch(() => {});
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {}

      await syncStateToFirebaseCloud();
      showAdminToast('✅ Brand and helpline settings updated live across all devices!');
    });
  }

  // Message Status Modal Form
  const messageStatusForm = document.getElementById('messageStatusForm');
  if (messageStatusForm) {
    messageStatusForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('msgStatusId').value;
      const status = document.getElementById('msgNewStatusSelect').value;
      try {
        await fetch(`/api/contacts/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
      } catch (err) {}
      window.closeMessageStatusModal();
      loadMessages();
      showAdminToast(`Inquiry #${id} marked as ${status}`);
    });
  }

  // New Callback / Phone Inquiry Modal Form
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
        await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {}
      window.closeNewCallbackModal();
      newCallbackForm.reset();
      loadMessages();
      showAdminToast('Customer inquiry recorded successfully!');
    });
  }
});

// ==========================================================================
// DATA RETRIEVAL & RENDERING FUNCTIONS
// ==========================================================================

async function loadAllData() {
  await initAdminCloudState();
  await Promise.allSettled([
    loadStats(),
    loadBookings(),
    loadServices(),
    loadFleet(),
    loadDestinations(),
    loadTrips(),
    loadMessages(),
    loadSettings()
  ]);
}

// 1. KPI Stats (Resilient)
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.stats) {
        document.getElementById('statTotal').textContent = data.stats.total;
        document.getElementById('statPending').textContent = data.stats.pending;
        document.getElementById('statConfirmed').textContent = data.stats.confirmed;
        document.getElementById('statToday').textContent = data.stats.today_scheduled;
        return;
      }
    }
  } catch (err) {}

  const allBookings = getStorage('bookings', SEED_DATA.bookings);
  const todayStr = new Date().toISOString().split('T')[0];
  const total = allBookings.length;
  const pending = allBookings.filter(b => b.status === 'Pending').length;
  const confirmed = allBookings.filter(b => b.status === 'Confirmed' || b.status === 'Driver Assigned').length;
  const today_scheduled = allBookings.filter(b => b.travel_date === todayStr).length;

  const elTotal = document.getElementById('statTotal');
  const elPending = document.getElementById('statPending');
  const elConfirmed = document.getElementById('statConfirmed');
  const elToday = document.getElementById('statToday');

  if (elTotal) elTotal.textContent = total;
  if (elPending) elPending.textContent = pending;
  if (elConfirmed) elConfirmed.textContent = confirmed;
  if (elToday) elToday.textContent = today_scheduled;
}

// 2. Bookings Table (Resilient, never displays "API error")
async function loadBookings() {
  const tbody = document.getElementById('bookingsTableBody');
  if (!tbody) return;

  let bookingsList = [];
  let query = `/api/bookings?status=${encodeURIComponent(currentStatusFilter)}`;
  if (currentSearchTerm) {
    query += `&search=${encodeURIComponent(currentSearchTerm)}`;
  }

  try {
    const res = await fetch(query);
    if (res.ok) {
      const data = await res.json();
      if (data && data.bookings) {
        bookingsList = data.bookings;
        setStorage('bookings', bookingsList);
      }
    } else {
      throw new Error('API offline');
    }
  } catch (err) {
    const all = getStorage('bookings', SEED_DATA.bookings);
    bookingsList = all.filter(b => {
      const matchStatus = currentStatusFilter === 'All' || b.status === currentStatusFilter;
      const term = currentSearchTerm.toLowerCase();
      const matchSearch = !term ||
        (b.customer_name && b.customer_name.toLowerCase().includes(term)) ||
        (b.customer_phone && b.customer_phone.includes(term)) ||
        (b.booking_ref && b.booking_ref.toLowerCase().includes(term)) ||
        (b.pickup_location && b.pickup_location.toLowerCase().includes(term)) ||
        (b.destination && b.destination.toLowerCase().includes(term));
      return matchStatus && matchSearch;
    });
  }

  if (!bookingsList || bookingsList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:30px; color:var(--color-text-muted);">
          No bookings found matching current filters.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = bookingsList.map(b => {
    let badgeClass = 'badge-pending';
    if (b.status === 'Confirmed') badgeClass = 'badge-confirmed';
    if (b.status === 'Driver Assigned') badgeClass = 'badge-assigned';
    if (b.status === 'Completed') badgeClass = 'badge-completed';
    if (b.status === 'Cancelled') badgeClass = 'badge-cancelled';

    const customerWaText = encodeURIComponent(
      `Namaste ${b.customer_name}! This is Yakshith Nandh Travels, Tirupati regarding your ride reservation [${b.booking_ref}] for ${b.travel_date} (${b.preferred_vehicle} from ${b.pickup_location} to ${b.destination}). How can we assist you with your pilgrimage trip?`
    );
    const cleanPhone = (b.customer_phone || '').replace(/\D/g, '');
    const waUrl = `https://api.whatsapp.com/send?phone=91${cleanPhone.slice(-10)}&text=${customerWaText}`;

    return `
      <tr>
        <td>
          <strong style="color:var(--color-primary);">${escapeHTML(b.booking_ref || '')}</strong><br>
          <span style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHTML(b.created_at || '')}</span>
        </td>
        <td>
          <strong>${escapeHTML(b.customer_name || '')}</strong><br>
          <a href="tel:${escapeHTML(b.customer_phone || '')}" style="color:var(--color-primary); font-size:0.85rem;">📞 ${escapeHTML(b.customer_phone || '')}</a>
        </td>
        <td>
          <span style="font-weight:600;">${escapeHTML(b.preferred_vehicle || '')}</span><br>
          <span style="font-size:0.8rem; color:var(--color-text-muted);">${escapeHTML(b.service_type || '')}</span>
        </td>
        <td>
          <div style="font-size:0.88rem;">
            <span style="color:var(--color-text-muted);">From:</span> ${escapeHTML(b.pickup_location || '')}<br>
            <span style="color:var(--color-primary); font-weight:600;">To:</span> ${escapeHTML(b.destination || '')}
          </div>
          ${b.additional_notes ? `<div style="font-size:0.75rem; color:#78685F; margin-top:4px; font-style:italic;">"${escapeHTML(b.additional_notes)}"</div>` : ''}
        </td>
        <td>
          <strong>${escapeHTML(b.travel_date || '')}</strong><br>
          <span style="font-size:0.8rem; color:var(--color-text-muted);">${escapeHTML(String(b.passenger_count || 1))} Passenger(s)</span>
        </td>
        <td>
          <span class="badge ${badgeClass}">${escapeHTML(b.status || 'Pending')}</span>
        </td>
        <td>
          ${b.driver_name ? `
            <div style="font-size:0.85rem;">
              <strong>👨‍✈️ ${escapeHTML(b.driver_name)}</strong><br>
              <span style="font-size:0.78rem; color:var(--color-text-muted);">${escapeHTML(b.driver_phone || '')}</span><br>
              <span class="vehicle-plate">${escapeHTML(b.vehicle_number || '')}</span>
              ${b.fare_estimate ? `<br><strong style="color:var(--color-primary); font-size:0.85rem;">${escapeHTML(b.fare_estimate)}</strong>` : ''}
            </div>
          ` : `
            <span style="color:var(--color-text-muted); font-size:0.82rem; font-style:italic;">Not Assigned</span>
          `}
        </td>
        <td>
          <div class="action-btn-group">
            <button type="button" class="action-icon-btn" title="Update Booking Status" onclick="openStatusModal(${b.id}, '${escapeHTML(b.status || 'Pending')}')">
              <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button type="button" class="action-icon-btn" title="Assign Driver & Vehicle" onclick="openAssignModal(${b.id}, '${escapeHTML(b.driver_name || '')}', '${escapeHTML(b.driver_phone || '')}', '${escapeHTML(b.vehicle_number || '')}', '${escapeHTML(b.fare_estimate || '')}')">
              <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </button>
            <a href="${waUrl}" target="_blank" class="action-icon-btn wa" title="WhatsApp Passenger">
              <svg viewBox="0 0 24 24"><path d="M16.75 13.96c.25.13.41.2.46.3.06.11.04.61-.21 1.18-.2.56-1.24 1.1-1.7 1.12-.46.02-.47.36-2.96-.73-2.49-1.09-3.99-3.75-4.11-3.92-.12-.17-.99-1.38-.99-2.63s.66-1.87.9-2.12c.23-.25.5-.32.67-.32.17 0 .34 0 .49.01.16.01.37-.06.57.44.22.52.74 1.87.8 2.01.07.13.1.3.02.47-.08.17-.12.28-.25.43-.12.15-.26.33-.37.45-.12.12-.24.25-.1.5.14.24.62 1.05 1.34 1.71.93.85 1.71 1.11 1.95 1.24.24.12.38.11.53-.06.15-.17.63-.74.8-1 .17-.25.35-.21.58-.11zM12 2a10 10 0 0 0-10 10c0 1.77.46 3.45 1.28 4.93L2 22l5.23-1.25A9.97 9.97 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>
            </a>
            <button type="button" class="action-icon-btn delete" title="Delete Booking" onclick="deleteBookingRecord(${b.id})">
              <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// 3. Services Cards
async function loadServices(forceFetch = false) {
  const container = document.getElementById('servicesCardsContainer');
  if (!container) return;

  if (forceFetch || !allServicesData || allServicesData.length === 0) {
    try {
      const res = await fetch('/api/services');
      if (res.ok) {
        const data = await res.json();
        allServicesData = data.services || [];
        setStorage('services', allServicesData);
      } else {
        throw new Error('API offline');
      }
    } catch (err) {
      if (!allServicesData || allServicesData.length === 0) {
        allServicesData = getStorage('services', SEED_DATA.services);
      }
    }
  }

  if (!allServicesData || allServicesData.length === 0) {
    allServicesData = getStorage('services', SEED_DATA.services);
  }

  container.innerHTML = allServicesData.map(s => {
    const isPub = (s.is_published !== 0 && s.is_active !== 0);
    return `
    <div class="admin-content-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span class="card-top-tag" style="margin:0;">${escapeHTML(s.category || 'Service')}</span>
        <button type="button" class="${isPub ? 'btn-status-published' : 'btn-status-draft'}" onclick="toggleServicePublish(${s.id})" title="Click to toggle publish status">
          ${isPub ? '🟢 Published' : '🟡 Draft'}
        </button>
      </div>
      <h3>${escapeHTML(s.name)}</h3>
      <p>${escapeHTML(s.description)}</p>
      <div style="font-size:0.85rem; margin-bottom:12px; color:var(--color-primary); font-weight:700;">
        Starting Tariff: ${escapeHTML(s.starting_price || 'Enquire')}
      </div>
      ${s.features ? `<div style="font-size:0.78rem; color:var(--color-text-muted); margin-bottom:14px; background:#FFF9F0; padding:6px 10px; border-radius:6px; border:1px solid var(--color-border);">${escapeHTML(s.features)}</div>` : ''}
      <div style="margin-top:auto; padding-top:10px; border-top:1px dashed var(--color-border); display:flex; justify-content:space-between; align-items:center;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="openEditServiceModal(${s.id})">Edit Service</button>
        <div class="action-btn-group">
          <button type="button" class="action-icon-btn delete" title="Delete Service" onclick="deleteServiceRecord(${s.id})">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

// 4. Fleet Section Cards (Shows every vehicle data, car photo, Airbags option, text seats)
async function loadFleet(forceFetch = false) {
  const container = document.getElementById('fleetCardsContainer');
  if (!container) return;

  // 1. If memory has not been hydrated from Firestore yet, ensure cloud init has completed
  if (!allFleetData || allFleetData.length === 0) {
    try {
      await initAdminCloudState();
    } catch (e) {}
  }

  // 2. Prioritize existing memory or localStorage before falling back to API
  if (!allFleetData || allFleetData.length === 0) {
    allFleetData = getStorage('fleet', null);
  }

  if (forceFetch || !allFleetData || allFleetData.length === 0) {
    try {
      const res = await fetch('/api/fleet');
      if (res.ok) {
        const data = await res.json();
        if (!allFleetData || allFleetData.length === 0) {
          allFleetData = data.fleet || [];
          setStorage('fleet', allFleetData);
        }
      }
    } catch (err) {}
  }

  const countBadge = document.getElementById('tabFleetCount');
  if (countBadge) countBadge.textContent = (allFleetData || []).length;

  const placeholderVehicleImg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><rect width="800" height="400" fill="#f0ece4"/><text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle" fill="#7B263A" font-family="sans-serif" font-size="22" font-weight="bold">No Vehicle Photo</text><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="#888888" font-family="sans-serif" font-size="14">Click Edit Vehicle to add photo</text></svg>');

  container.innerHTML = (allFleetData || []).map(v => {
    const rawImg = v.image_url || v.imageUrl || v.image || v.photo || '';
    const hasValidImg = Boolean(rawImg && typeof rawImg === 'string' && rawImg.trim().length > 5);
    const displayImg = hasValidImg ? rawImg.trim() : placeholderVehicleImg;
    const isFirebase = hasValidImg && (rawImg.includes('firebasestorage.app') || rawImg.startsWith('data:'));
    const airbagsDisplay = v.airbags || v.luggage_bags || 'Dual Airbags';
    const isPub = (v.is_published !== 0 && v.is_available !== 0);

    return `
      <div class="admin-content-card">
        <div style="width:100%; height:150px; background:#f0ece4; border-radius:8px; overflow:hidden; margin-bottom:12px; position:relative; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <img src="${escapeHTML(displayImg)}" alt="${escapeHTML(v.model_name)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='${placeholderVehicleImg}';">
          <span class="card-top-tag" style="position:absolute; top:8px; left:8px; margin:0; background:rgba(123,38,58,0.9); color:#FFF9F0;">${escapeHTML(v.category || 'Fleet')}</span>
          <button type="button" class="${isPub ? 'btn-status-published' : 'btn-status-draft'}" style="position:absolute; top:8px; right:8px;" onclick="toggleVehiclePublish(${v.id})" title="Click to toggle publish status">
            ${isPub ? '🟢 Published' : '🟡 Draft'}
          </button>
        </div>

        <h3 style="margin-top:0; margin-bottom:6px;">${escapeHTML(v.model_name)}</h3>
        <p style="margin-bottom:12px; font-size:0.85rem;">${escapeHTML(v.description || 'Pristine vehicle equipped with AC and certified for Tirumala ghat roads.')}</p>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.82rem; margin-bottom:14px; background:#FFF9F0; padding:8px 10px; border-radius:6px; border:1px solid var(--color-border);">
          <div><strong>Seats:</strong> ${escapeHTML(String(v.capacity || '4 Passengers'))}</div>
          <div><strong>Airbags:</strong> ${escapeHTML(String(airbagsDisplay))}</div>
          <div><strong>Rate (km):</strong> ${escapeHTML(v.rate_per_km || '₹18/km')}</div>
          <div><strong>Daily Rent:</strong> <span style="color:var(--color-primary); font-weight:700;">${escapeHTML(v.daily_rent || '₹3,500/day')}</span></div>
          <div style="grid-column:span 2;"><strong>Mileage:</strong> ${escapeHTML(v.mileage || '14-16 km/l')}</div>
          ${isFirebase ? `
            <div style="grid-column:span 2; font-size:0.72rem; color:#D86300; font-weight:600; display:flex; align-items:center; gap:4px;">
              <span>🔥 Stored in Firebase Cloud</span>
            </div>
          ` : ''}
        </div>

        <div style="margin-top:auto; padding-top:10px; border-top:1px dashed var(--color-border); display:flex; justify-content:space-between; align-items:center;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="openEditVehicleModal(${v.id})">Edit Vehicle</button>
          <div class="action-btn-group">
            <button type="button" class="action-icon-btn delete" title="Delete vehicle" onclick="deleteVehicleRecord(${v.id})">
              <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 5. Destinations Cards (Shows destination photo banner, distance & details)
async function loadDestinations(forceFetch = false) {
  const container = document.getElementById('destinationsCardsContainer');
  if (!container) return;

  // 1. If memory has not been hydrated from Firestore yet, ensure cloud init has completed
  if (!allDestinationsData || allDestinationsData.length === 0) {
    try {
      await initAdminCloudState();
    } catch (e) {}
  }

  // 2. Prioritize existing memory or localStorage before falling back to API
  if (!allDestinationsData || allDestinationsData.length === 0) {
    allDestinationsData = getStorage('destinations', null);
  }

  if (forceFetch || !allDestinationsData || allDestinationsData.length === 0) {
    try {
      const res = await fetch('/api/destinations');
      if (res.ok) {
        const data = await res.json();
        if (!allDestinationsData || allDestinationsData.length === 0) {
          allDestinationsData = data.destinations || [];
          setStorage('destinations', allDestinationsData);
        }
      }
    } catch (err) {}
  }

  // Safe, URL-encoded SVG placeholder (immune to HTML attribute quote breaking)
  const placeholderImg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><rect width="800" height="400" fill="#f0ece4"/><text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle" fill="#7B263A" font-family="sans-serif" font-size="22" font-weight="bold">No Photo Uploaded</text><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="#888888" font-family="sans-serif" font-size="14">Click Edit Destination to add image</text></svg>');

  container.innerHTML = (allDestinationsData || []).map(d => {
    // 1. Exact same image field resolution as the working public website
    const rawImg = d.image_url || d.imageUrl || d.image || d.photo || '';
    const hasValidImg = Boolean(rawImg && typeof rawImg === 'string' && rawImg.trim().length > 5);
    const displayImg = hasValidImg ? rawImg.trim() : placeholderImg;
    const isPub = (d.is_published !== 0 && d.is_popular !== 0);

    // Development logging as requested in Step 4
    console.log('📍 [Admin Destination Card Render]', {
      docId: d.id,
      name: d.name,
      imageUrl: hasValidImg ? (rawImg.startsWith('data:') ? `[Data URL: ${rawImg.slice(0, 30)}... (${rawImg.length} chars)]` : rawImg) : '(empty)',
      isValid: hasValidImg,
      receivedByImg: true
    });

    return `
      <div class="admin-content-card">
        <div style="width:100%; height:150px; background:#f0ece4; border-radius:8px; overflow:hidden; margin-bottom:12px; position:relative; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <img src="${escapeHTML(displayImg)}" alt="${escapeHTML(d.name)}" style="width:100%; height:100%; object-fit:cover;" onerror="console.warn('⚠️ [Admin Destination] Image failed to load for:', '${escapeHTML(d.name)}', this.src ? this.src.slice(0, 50) : ''); this.onerror=null; this.src='${placeholderImg}';">
          <span class="card-top-tag" style="position:absolute; top:8px; left:8px; margin:0; background:rgba(123,38,58,0.9); color:#FFF9F0;">Destination #${d.id}</span>
          <button type="button" class="${isPub ? 'btn-status-published' : 'btn-status-draft'}" style="position:absolute; top:8px; right:8px;" onclick="toggleDestinationPublish(${d.id})" title="Click to toggle publish status">
            ${isPub ? '🟢 Published' : '🟡 Draft'}
          </button>
        </div>

        <h3 style="margin-top:0; margin-bottom:6px;">${escapeHTML(d.name)}</h3>
        <div style="font-family:var(--font-subheading); font-size:0.95rem; color:var(--color-accent-gold-dark); font-weight:600; margin-bottom:8px;">
          ${escapeHTML(d.subtitle || '')}
        </div>
        <p style="margin-bottom:12px; font-size:0.85rem;">${escapeHTML(d.description || '')}</p>

        <div style="font-size:0.84rem; color:var(--color-primary); margin-bottom:12px; background:#FFF9F0; padding:6px 10px; border-radius:6px; border:1px solid var(--color-border);">
          📍 <strong>${escapeHTML(d.distance || 'Local')}</strong> • ⏱️ ${escapeHTML(d.duration || 'Half Day')}
        </div>

        <div style="margin-top:auto; padding-top:10px; border-top:1px dashed var(--color-border); display:flex; justify-content:space-between; align-items:center;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="openEditDestinationModal(${d.id})">Edit Destination</button>
          <div class="action-btn-group">
            <button type="button" class="action-icon-btn delete" title="Delete Destination" onclick="deleteDestinationRecord(${d.id})">
              <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 5b. Trips & Multi-Day Tour Packages
async function loadTrips(forceFetch = false) {
  const container = document.getElementById('tripsCardsContainer') || document.getElementById('tripCardsContainer');
  if (!container) return;

  // 1. If memory has not been hydrated from Firestore yet, ensure cloud init has completed
  if (!allTripsData || allTripsData.length === 0) {
    try {
      await initAdminCloudState();
    } catch (e) {}
  }

  // 2. Prioritize existing memory or localStorage before falling back to API
  if (!allTripsData || allTripsData.length === 0) {
    allTripsData = getStorage('trips', null);
  }

  if (forceFetch || !allTripsData || allTripsData.length === 0) {
    try {
      const res = await fetch('/api/trips');
      if (res.ok) {
        const data = await res.json();
        if (!allTripsData || allTripsData.length === 0) {
          allTripsData = data.trips || [];
          setStorage('trips', allTripsData);
        }
      }
    } catch (err) {}
  }

  const countBadge = document.getElementById('tabTripsCount');
  if (countBadge) countBadge.textContent = (allTripsData || []).length;

  const placeholderTripImg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><rect width="800" height="400" fill="#f0ece4"/><text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle" fill="#7B263A" font-family="sans-serif" font-size="22" font-weight="bold">No Package Photo</text><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="#888888" font-family="sans-serif" font-size="14">Click Edit Package to add photo</text></svg>');

  container.innerHTML = (allTripsData || []).map(t => {
    const rawImg = t.image_url || t.imageUrl || t.image || t.photo || '';
    const hasValidImg = Boolean(rawImg && typeof rawImg === 'string' && rawImg.trim().length > 5);
    const displayImg = hasValidImg ? rawImg.trim() : placeholderTripImg;
    const isFirebase = hasValidImg && (rawImg.includes('firebasestorage.app') || rawImg.startsWith('data:'));
    const isPub = (t.is_published !== 0 && t.is_popular !== 0 && t.is_active !== 0);

    const itineraryLines = (t.itinerary || '').split('\n').filter(l => l.trim().length > 0);
    const itineraryPreview = itineraryLines.slice(0, 3).map(line => {
      return `<div style="font-size:0.8rem; margin-bottom:4px; color:var(--color-text-main); line-height:1.4;">• ${escapeHTML(line)}</div>`;
    }).join('');

    return `
      <div class="admin-content-card">
        <div style="width:100%; height:160px; background:#f0ece4; border-radius:8px; overflow:hidden; margin-bottom:12px; position:relative; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <img src="${escapeHTML(displayImg)}" alt="${escapeHTML(t.title)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='${placeholderTripImg}';">
          <span class="card-top-tag" style="position:absolute; top:8px; left:8px; margin:0; background:rgba(123,38,58,0.92); color:#FFF9F0; font-weight:700;">${escapeHTML(t.duration_days || 'Tour Package')}</span>
          <button type="button" class="${isPub ? 'btn-status-published' : 'btn-status-draft'}" style="position:absolute; top:8px; right:8px;" onclick="toggleTripPublish(${t.id})" title="Click to toggle publish status">
            ${isPub ? '🟢 Published' : '🟡 Draft'}
          </button>
        </div>

        <h3 style="margin-top:0; margin-bottom:4px; font-size:1.05rem; line-height:1.3;">${escapeHTML(t.title)}</h3>
        <div style="font-family:var(--font-heading); color:var(--color-primary); font-size:0.88rem; font-weight:700; margin-bottom:8px;">
          Starting: ${escapeHTML(t.starting_price || 'Enquire')}
        </div>

        ${t.subtitle ? `<div style="font-size:0.78rem; color:var(--color-text-muted); margin-bottom:10px;">${escapeHTML(t.subtitle)}</div>` : ''}

        <div style="background:#FFF9F0; border:1px solid var(--color-border); border-radius:6px; padding:8px 10px; margin-bottom:12px;">
          <div style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--color-primary); margin-bottom:4px;">Itinerary Highlights</div>
          ${itineraryPreview || '<div style="font-size:0.8rem; color:var(--color-text-muted);">Customizable itinerary available on request.</div>'}
        </div>

        ${isFirebase ? `
          <div style="font-size:0.72rem; color:#D86300; font-weight:600; margin-bottom:10px; display:flex; align-items:center; gap:4px;">
            <span>🔥 Stored in Firebase Cloud</span>
          </div>
        ` : ''}

        <div style="margin-top:auto; padding-top:10px; border-top:1px dashed var(--color-border); display:flex; justify-content:space-between; align-items:center;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="openEditTripModal(${t.id})">Edit Package</button>
          <div class="action-btn-group">
            <button type="button" class="action-icon-btn delete" title="Delete trip package" onclick="deleteTripRecord(${t.id})">
              <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 6. Messages Table
async function loadMessages() {
  const tbody = document.getElementById('messagesTableBody');
  if (!tbody) return;

  let contacts = [];
  try {
    const res = await fetch('/api/contacts');
    if (res.ok) {
      const data = await res.json();
      contacts = data.contacts || [];
      setStorage('contacts', contacts);
    } else {
      throw new Error('API offline');
    }
  } catch (err) {
    contacts = getStorage('contacts', SEED_DATA.contacts);
  }

  if (contacts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:25px; color:var(--color-text-muted);">No customer inquiries yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = contacts.map(c => `
    <tr>
      <td>#${c.id}<br><span style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHTML(c.created_at || '')}</span></td>
      <td><strong>${escapeHTML(c.name)}</strong></td>
      <td>
        <a href="tel:${escapeHTML(c.phone)}" style="color:var(--color-primary); font-size:0.85rem;">📞 ${escapeHTML(c.phone)}</a>
        ${c.email ? `<br><span style="font-size:0.78rem; color:var(--color-text-muted);">${escapeHTML(c.email)}</span>` : ''}
      </td>
      <td style="max-width:300px;"><div style="font-size:0.86rem; line-height:1.4;">${escapeHTML(c.message)}</div></td>
      <td><span class="badge ${c.status === 'Resolved' ? 'badge-completed' : (c.status === 'Contacted' ? 'badge-assigned' : 'badge-pending')}">${escapeHTML(c.status || 'New')}</span></td>
      <td>
        <div class="action-btn-group">
          <button type="button" class="action-icon-btn edit" title="Update Inquiry Status" onclick="openMessageStatusModal(${c.id}, '${escapeHTML(c.status || 'New')}')">
            <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <button type="button" class="action-icon-btn delete" title="Delete Inquiry" onclick="deleteContactRecord(${c.id})">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// 7. Settings Form Values
async function loadSettings() {
  let settings = SEED_DATA.settings;
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        settings = data.settings;
        setStorage('settings', settings);
      }
    } else {
      throw new Error('API offline');
    }
  } catch (err) {
    settings = getStorage('settings', SEED_DATA.settings);
  }

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  };

  setVal('setting_company_name', settings.company_name);
  setVal('setting_slogan', settings.slogan);
  setVal('setting_primary_phone', settings.primary_phone);
  setVal('setting_secondary_phone', settings.secondary_phone);
  setVal('setting_email', settings.email);
  setVal('setting_location', settings.location);
  setVal('setting_announcement', settings.announcement);

  setVal('set_company_name', settings.company_name);
  setVal('set_slogan', settings.slogan);
  setVal('set_primary_phone', settings.primary_phone);
  setVal('set_secondary_phone', settings.secondary_phone);
  setVal('set_email', settings.email);
  setVal('set_location', settings.location);
  setVal('set_announcement', settings.announcement);
}

// ==========================================================================
// MODAL CONTROLS & ACTIONS (Exposed to window for inline onclicks)
// ==========================================================================

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
  const statusEl = document.getElementById('editServiceStatus');
  if (statusEl) statusEl.value = (service.is_published !== 0 && service.is_active !== 0) ? '1' : '0';
  document.getElementById('serviceEditModal').classList.add('open');
};
window.closeServiceEditModal = () => document.getElementById('serviceEditModal').classList.remove('open');

window.openAddVehicleModal = () => {
  document.getElementById('vehicleModalTitle').textContent = 'Add New Vehicle';
  document.getElementById('vehicleId').value = '';
  document.getElementById('vehicleForm').reset();

  const airbagsEl = document.getElementById('veh_airbags') || document.getElementById('veh_luggage');
  if (airbagsEl) airbagsEl.value = 'Dual Airbags';

  if (document.getElementById('veh_daily_rent')) document.getElementById('veh_daily_rent').value = '';
  if (document.getElementById('veh_mileage')) document.getElementById('veh_mileage').value = '';

  const previewBox = document.getElementById('veh_image_preview_box');
  if (previewBox) previewBox.style.display = 'none';
  const urlInput = document.getElementById('veh_image_url');
  if (urlInput) urlInput.value = '';
  if (window.switchImageInputMode) window.switchImageInputMode('veh', 'file');
  document.getElementById('vehicleModal').classList.add('open');
};

window.openEditVehicleModal = (id) => {
  const veh = allFleetData.find(v => String(v.id) === String(id));
  if (!veh) {
    console.warn(`🚗 [Admin] Edit vehicle not found for ID: ${id}`);
    return;
  }
  console.log(`🚗 [Admin] Opening Edit Vehicle modal for: ${veh.model_name} (ID: ${veh.id})`, {
    model_name: veh.model_name,
    category: veh.category,
    has_image: !!veh.image_url,
    image_type: veh.image_url ? (veh.image_url.startsWith('data:') ? 'Base64' : 'URL') : 'None'
  });

  document.getElementById('vehicleModalTitle').textContent = 'Edit Vehicle';
  document.getElementById('vehicleId').value = veh.id;
  document.getElementById('veh_name').value = veh.model_name || '';
  document.getElementById('veh_category').value = veh.category || '';
  document.getElementById('veh_capacity').value = veh.capacity || '';

  const airbagsEl = document.getElementById('veh_airbags') || document.getElementById('veh_luggage');
  if (airbagsEl) airbagsEl.value = veh.airbags || veh.luggage_bags || 'Dual Airbags';

  document.getElementById('veh_rate').value = veh.rate_per_km || '';
  if (document.getElementById('veh_daily_rent')) {
    document.getElementById('veh_daily_rent').value = veh.daily_rent || '';
  }
  if (document.getElementById('veh_mileage')) {
    document.getElementById('veh_mileage').value = veh.mileage || '';
  }
  document.getElementById('veh_desc').value = veh.description || '';

  const statusEl = document.getElementById('veh_status');
  if (statusEl) statusEl.value = (veh.is_published !== 0 && veh.is_available !== 0) ? '1' : '0';

  // Clear previous file input so stale files are never re-submitted
  const fileInput = document.getElementById('veh_image_file');
  if (fileInput) fileInput.value = '';

  const curImg = veh.image_url || '';
  const urlInput = document.getElementById('veh_image_url');
  const previewBox = document.getElementById('veh_image_preview_box');
  const previewImg = document.getElementById('veh_image_preview');
  const statusText = document.getElementById('veh_upload_status');

  if (urlInput) urlInput.value = curImg;
  if (curImg) {
    if (previewBox) previewBox.style.display = 'flex';
    if (previewImg) previewImg.src = curImg;
    if (statusText) {
      statusText.textContent = curImg.includes('firebasestorage')
        ? 'Stored in Firebase Cloud'
        : (curImg.startsWith('data:') ? 'Stored in Cloud Firestore' : 'Current Vehicle Photo');
    }
  } else {
    if (previewBox) previewBox.style.display = 'none';
  }

  if (curImg && (curImg.startsWith('http://') || curImg.startsWith('https://')) && !curImg.includes('firebasestorage')) {
    if (window.switchImageInputMode) window.switchImageInputMode('veh', 'url');
  } else {
    if (window.switchImageInputMode) window.switchImageInputMode('veh', 'file');
  }

  document.getElementById('vehicleModal').classList.add('open');
};
window.closeVehicleModal = () => {
  const p = document.getElementById('veh_image_preview'); if (p) p.src = '';
  document.getElementById('vehicleModal').classList.remove('open');
};

window.openAddDestinationModal = () => {
  document.getElementById('destModalTitle').textContent = 'Add New Destination';
  document.getElementById('destId').value = '';
  document.getElementById('destinationForm').reset();
  const previewBox = document.getElementById('dest_image_preview_box');
  if (previewBox) previewBox.style.display = 'none';
  const urlInput = document.getElementById('dest_image_url');
  if (urlInput) urlInput.value = '';
  if (window.switchImageInputMode) window.switchImageInputMode('dest', 'file');
  document.getElementById('destinationModal').classList.add('open');
};

window.openEditDestinationModal = (id) => {
  const dest = allDestinationsData.find(d => String(d.id) === String(id));
  if (!dest) {
    console.warn(`📍 [Admin] Edit destination not found for ID: ${id}`);
    return;
  }
  console.log(`📍 [Admin] Opening Edit Destination modal for: ${dest.name} (ID: ${dest.id})`, {
    name: dest.name,
    distance: dest.distance,
    duration: dest.duration,
    has_image: !!dest.image_url,
    image_type: dest.image_url ? (dest.image_url.startsWith('data:') ? 'Base64' : 'URL') : 'None'
  });

  document.getElementById('destModalTitle').textContent = 'Edit Destination';
  document.getElementById('destId').value = dest.id;
  document.getElementById('dest_name').value = dest.name || '';
  document.getElementById('dest_subtitle').value = dest.subtitle || '';
  document.getElementById('dest_distance').value = dest.distance || '';
  document.getElementById('dest_duration').value = dest.duration || '';
  document.getElementById('dest_desc').value = dest.description || '';

  const statusEl = document.getElementById('dest_status');
  if (statusEl) statusEl.value = (dest.is_published !== 0 && dest.is_popular !== 0) ? '1' : '0';

  // Clear previous file input so stale files are never re-submitted
  const fileInput = document.getElementById('dest_image_file');
  if (fileInput) fileInput.value = '';

  const curImg = dest.image_url || dest.imageUrl || dest.image || dest.photo || '';
  const urlInput = document.getElementById('dest_image_url');
  const previewBox = document.getElementById('dest_image_preview_box');
  const previewImg = document.getElementById('dest_image_preview');
  const statusText = document.getElementById('dest_upload_status');

  if (urlInput) urlInput.value = curImg;
  if (curImg) {
    if (previewBox) previewBox.style.display = 'flex';
    if (previewImg) previewImg.src = curImg;
    if (statusText) {
      statusText.textContent = curImg.includes('firebasestorage')
        ? 'Stored in Firebase Cloud'
        : (curImg.startsWith('data:') ? 'Stored in Cloud Firestore' : 'Current Destination Photo');
    }
  } else {
    if (previewBox) previewBox.style.display = 'none';
  }

  if (curImg && (curImg.startsWith('http://') || curImg.startsWith('https://')) && !curImg.includes('firebasestorage')) {
    if (window.switchImageInputMode) window.switchImageInputMode('dest', 'url');
  } else {
    if (window.switchImageInputMode) window.switchImageInputMode('dest', 'file');
  }

  document.getElementById('destinationModal').classList.add('open');
};
window.closeDestinationModal = () => {
  const p = document.getElementById('dest_image_preview'); if (p) p.src = '';
  document.getElementById('destinationModal').classList.remove('open');
};

window.openAddTripModal = () => {
  document.getElementById('tripModalTitle').textContent = 'Add New Trip Package';
  document.getElementById('tripId').value = '';
  document.getElementById('tripForm').reset();
  const previewBox = document.getElementById('trip_image_preview_box');
  if (previewBox) previewBox.style.display = 'none';
  const urlInput = document.getElementById('trip_image_url');
  if (urlInput) urlInput.value = '';
  document.getElementById('trip_inclusions').value = 'Tolls Included, Parkings Included, Driver Wage Included, Border Tax Included, 24*7 Support, Best Price Guaranteed, AC Vehicle, Fuel, Doorstep Pickup & Drop';
  if (window.switchImageInputMode) window.switchImageInputMode('trip', 'file');
  document.getElementById('tripModal').classList.add('open');
};

window.openEditTripModal = (id) => {
  const trip = allTripsData.find(t => String(t.id) === String(id));
  if (!trip) {
    console.warn(`🧳 [Admin] Edit trip package not found for ID: ${id}`);
    return;
  }
  console.log(`🧳 [Admin] Opening Edit Trip modal for: ${trip.title || trip.name} (ID: ${trip.id})`, {
    title: trip.title || trip.name,
    starting_price: trip.starting_price,
    has_image: !!trip.image_url
  });
  document.getElementById('tripModalTitle').textContent = 'Edit Trip Package';
  document.getElementById('tripId').value = trip.id;
  document.getElementById('trip_title').value = trip.title || trip.name || '';
  document.getElementById('trip_duration').value = trip.duration_days || '';
  document.getElementById('trip_subtitle').value = trip.subtitle || '';
  document.getElementById('trip_price').value = trip.starting_price || '';
  document.getElementById('trip_itinerary').value = trip.itinerary || '';
  document.getElementById('trip_vehicle_pricing').value = trip.vehicle_pricing || '';
  document.getElementById('trip_inclusions').value = trip.inclusions || 'Tolls Included, Parkings Included, Driver Wage Included, Border Tax Included, 24*7 Support, Best Price Guaranteed';
  document.getElementById('trip_exclusions').value = trip.exclusions || '';

  const statusEl = document.getElementById('trip_status');
  if (statusEl) statusEl.value = (trip.is_published !== 0 && trip.is_popular !== 0 && trip.is_active !== 0) ? '1' : '0';

  const curImg = trip.image_url || '';
  const urlInput = document.getElementById('trip_image_url');
  const previewBox = document.getElementById('trip_image_preview_box');
  const previewImg = document.getElementById('trip_image_preview');
  const statusText = document.getElementById('trip_upload_status');

  if (urlInput) urlInput.value = curImg;
  if (curImg) {
    if (previewBox) previewBox.style.display = 'flex';
    if (previewImg) previewImg.src = curImg;
    if (statusText) statusText.textContent = curImg.includes('firebasestorage') ? 'Stored in Firebase Cloud' : 'Current Package Photo';
  } else {
    if (previewBox) previewBox.style.display = 'none';
  }

  if (curImg && (curImg.startsWith('http://') || curImg.startsWith('https://')) && !curImg.includes('firebasestorage')) {
    if (window.switchImageInputMode) window.switchImageInputMode('trip', 'url');
  } else {
    if (window.switchImageInputMode) window.switchImageInputMode('trip', 'file');
  }

  document.getElementById('tripModal').classList.add('open');
};

window.closeTripModal = () => {
  const p = document.getElementById('trip_image_preview'); if (p) p.src = '';
  document.getElementById('tripModal').classList.remove('open');
};

// ==========================================================================
// 1-CLICK PUBLISH / DRAFT TOGGLE ACTIONS (INSTANT LIVE SYNC)
// ==========================================================================

window.toggleVehiclePublish = async (id) => {
  if (!allFleetData || allFleetData.length === 0) allFleetData = getStorage('fleet', SEED_DATA.fleet);
  const v = allFleetData.find(item => String(item.id) === String(id));
  if (v) {
    const isPub = (v.is_published !== 0 && v.is_available !== 0);
    v.is_published = isPub ? 0 : 1;
    v.is_available = isPub ? 0 : 1;
    setStorage('fleet', allFleetData);
    try {
      await fetch(`/api/fleet/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: v.is_available, is_published: v.is_published })
      });
    } catch (e) {}
    await syncStateToFirebaseCloud();
    await loadFleet(false);
    showAdminToast(v.is_published ? '🟢 Vehicle published & live on website!' : '🟡 Vehicle set to draft (hidden from website)!');
  }
};

window.toggleDestinationPublish = async (id) => {
  if (!allDestinationsData || allDestinationsData.length === 0) allDestinationsData = getStorage('destinations', SEED_DATA.destinations);
  const d = allDestinationsData.find(item => String(item.id) === String(id));
  if (d) {
    const isPub = (d.is_published !== 0 && d.is_popular !== 0);
    d.is_published = isPub ? 0 : 1;
    d.is_popular = isPub ? 0 : 1;
    setStorage('destinations', allDestinationsData);
    try {
      await fetch(`/api/destinations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_popular: d.is_popular, is_published: d.is_published })
      });
    } catch (e) {}
    await syncStateToFirebaseCloud();
    await loadDestinations(false);
    showAdminToast(d.is_published ? '🟢 Destination published & live on website!' : '🟡 Destination set to draft (hidden from website)!');
  }
};

window.toggleTripPublish = async (id) => {
  if (!allTripsData || allTripsData.length === 0) allTripsData = getStorage('trips', SEED_DATA.trips);
  const t = allTripsData.find(item => String(item.id) === String(id));
  if (t) {
    const isPub = (t.is_published !== 0 && t.is_popular !== 0 && t.is_active !== 0);
    t.is_published = isPub ? 0 : 1;
    t.is_popular = isPub ? 0 : 1;
    t.is_active = isPub ? 0 : 1;
    setStorage('trips', allTripsData);
    try {
      await fetch(`/api/trips/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_popular: t.is_popular, is_active: t.is_active, is_published: t.is_published })
      });
    } catch (e) {}
    await syncStateToFirebaseCloud();
    await loadTrips(false);
    showAdminToast(t.is_published ? '🟢 Trip package published & live on website!' : '🟡 Trip package set to draft (hidden from website)!');
  }
};

window.toggleServicePublish = async (id) => {
  if (!allServicesData || allServicesData.length === 0) allServicesData = getStorage('services', SEED_DATA.services);
  const s = allServicesData.find(item => String(item.id) === String(id));
  if (s) {
    const isPub = (s.is_published !== 0 && s.is_active !== 0);
    s.is_published = isPub ? 0 : 1;
    s.is_active = isPub ? 0 : 1;
    setStorage('services', allServicesData);
    try {
      await fetch(`/api/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: s.is_active, is_published: s.is_published })
      });
    } catch (e) {}
    await syncStateToFirebaseCloud();
    await loadServices(false);
    showAdminToast(s.is_published ? '🟢 Service published & live on website!' : '🟡 Service set to draft (hidden from website)!');
  }
};

window.deleteTripRecord = async (id) => {
  if (!confirm('Are you sure you want to delete this trip package?')) return;
  allTripsData = (allTripsData || getStorage('trips', SEED_DATA.trips)).filter(t => String(t.id) !== String(id));
  setStorage('trips', allTripsData);
  deleteTripFromFirestore(id).catch(() => {});
  try {
    await fetch(`/api/trips/${id}`, { method: 'DELETE' });
  } catch (err) {}
  await syncStateToFirebaseCloud();
  await loadTrips(false);
};

window.openNewCallbackModal = () => {
  document.getElementById('newCallbackModal').classList.add('open');
};
window.closeNewCallbackModal = () => document.getElementById('newCallbackModal').classList.remove('open');

window.deleteBookingRecord = async (id) => {
  if (!confirm(`Delete booking record #${id}?`)) return;
  const bookings = getStorage('bookings', SEED_DATA.bookings).filter(b => String(b.id) !== String(id));
  setStorage('bookings', bookings);
  try {
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
  } catch (err) {}
  loadStats();
  loadBookings();
};

window.deleteVehicleRecord = async (id) => {
  if (!confirm('Are you sure you want to remove this vehicle from fleet?')) return;
  allFleetData = (allFleetData || getStorage('fleet', SEED_DATA.fleet)).filter(v => String(v.id) !== String(id));
  setStorage('fleet', allFleetData);
  deleteVehicleFromFirestore(id).catch(() => {});
  try {
    await fetch(`/api/fleet/${id}`, { method: 'DELETE' });
  } catch (err) {}
  await syncStateToFirebaseCloud();
  await loadFleet(false);
};

window.deleteServiceRecord = async (id) => {
  if (!confirm('Are you sure you want to delete this service offering?')) return;
  allServicesData = (allServicesData || getStorage('services', SEED_DATA.services)).filter(s => String(s.id) !== String(id));
  setStorage('services', allServicesData);
  deleteServiceFromFirestore(id).catch(() => {});
  try {
    await fetch(`/api/services/${id}`, { method: 'DELETE' });
  } catch (err) {}
  await syncStateToFirebaseCloud();
  await loadServices(false);
};

window.deleteDestinationRecord = async (id) => {
  if (!confirm('Are you sure you want to delete this destination?')) return;
  allDestinationsData = (allDestinationsData || getStorage('destinations', SEED_DATA.destinations)).filter(d => String(d.id) !== String(id));
  setStorage('destinations', allDestinationsData);
  deleteDestinationFromFirestore(id).catch(() => {});
  try {
    await fetch(`/api/destinations/${id}`, { method: 'DELETE' });
  } catch (err) {}
  await syncStateToFirebaseCloud();
  await loadDestinations(false);
};

window.syncAllDataToFirestore = async () => {
  const btn = document.getElementById('syncFirestoreBtn');
  const origHTML = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⚡ Syncing Collections...</span>';
  }
  showAdminToast('☁️ Syncing all collections (admin, fleet, destinations, trips, services, settings, admin_images) to Cloud Firestore...');
  try {
    await syncStateToFirebaseCloud();
    showAdminToast('✅ Cloud Firestore fully synchronized! Refresh your Firebase console to view collections.');
  } catch (err) {
    showAdminToast('⚠️ Firestore sync note: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHTML;
    }
  }
};

window.openMessageStatusModal = (id, currentStatus) => {
  const idEl = document.getElementById('msgStatusId');
  const selEl = document.getElementById('msgNewStatusSelect');
  const modal = document.getElementById('messageStatusModal');
  if (idEl) idEl.value = id;
  if (selEl) selEl.value = currentStatus || 'New';
  if (modal) {
    modal.classList.add('open');
    modal.classList.add('active');
  }
};

window.closeMessageStatusModal = () => {
  const modal = document.getElementById('messageStatusModal');
  if (modal) {
    modal.classList.remove('open');
    modal.classList.remove('active');
  }
};

window.deleteContactRecord = async (id) => {
  if (!confirm('Delete this customer inquiry record?')) return;
  try {
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API offline');
  } catch (err) {
    const contacts = getStorage('contacts', SEED_DATA.contacts).filter(c => String(c.id) !== String(id));
    setStorage('contacts', contacts);
  }
  loadMessages();
};

window.logoutAdmin = async () => {
  if (!confirm('Are you sure you want to sign out of the dispatch console?')) return;
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch (e) {}
  localStorage.removeItem('ynt_admin_token');
  localStorage.removeItem('ynt_admin_user');
  localStorage.removeItem('ynt_admin_active');
  sessionStorage.removeItem('ynt_admin_token');
  sessionStorage.removeItem('ynt_admin_user');
  sessionStorage.removeItem('ynt_admin_active');
  window.location.replace('login.html');
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
