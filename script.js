/**
 * YAKSHITH NANDH TRAVELS - Interactive Full-Stack Client
 * Location: Tirupati, Andhra Pradesh, India
 * Dispatch Hotline: +91 88868 30755 / +91 97009 35888
 */

import { db, doc, onSnapshot, getDoc, getDocs, collection } from './firebase-config.js?v=1794080000000';

document.addEventListener('DOMContentLoaded', () => {
  // 1. DOM Elements
  const header = document.querySelector('.main-header');
  const mobileToggle = document.querySelector('.mobile-menu-toggle');
  const mobileDrawer = document.querySelector('.mobile-drawer');
  const mobileBackdrop = document.querySelector('.mobile-backdrop');
  const mobileClose = document.querySelector('.mobile-drawer-close');
  const mobileLinks = document.querySelectorAll('.mobile-drawer-link');
  const navLinks = document.querySelectorAll('.nav-link');
  const backToTopBtn = document.querySelector('.back-to-top-btn');
  const bookingForm = document.getElementById('bookingForm');
  const bookingToast = document.getElementById('bookingToast');
  const travelDateInput = document.getElementById('travelDate');

  // 2. Set Minimum Travel Date to Today
  if (travelDateInput) {
    const today = new Date().toISOString().split('T')[0];
    travelDateInput.setAttribute('min', today);
  }

  // 3. High-Performance Sticky Navigation & Scroll Spy (rAF throttled)
  const sections = Array.from(document.querySelectorAll('section[id]'));
  let scrollTicking = false;

  const handleScroll = () => {
    const scrollY = window.scrollY;

    // Header sticky shadow (only modify DOM when state changes)
    if (scrollY > 50) {
      if (!header.classList.contains('scrolled')) header.classList.add('scrolled');
    } else {
      if (header.classList.contains('scrolled')) header.classList.remove('scrolled');
    }

    // Back to top button visibility (only modify DOM when state changes)
    if (backToTopBtn) {
      if (scrollY > 400) {
        if (!backToTopBtn.classList.contains('visible')) backToTopBtn.classList.add('visible');
      } else {
        if (backToTopBtn.classList.contains('visible')) backToTopBtn.classList.remove('visible');
      }
    }

    // ScrollSpy active link detection (Reverse check, minimal reflow)
    let currentSectionId = '';
    for (let i = sections.length - 1; i >= 0; i--) {
      const s = sections[i];
      if (scrollY >= s.offsetTop - 140) {
        currentSectionId = s.id;
        break;
      }
    }

    if (currentSectionId) {
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${currentSectionId}`);
      });
    }
  };

  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        handleScroll();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });
  handleScroll(); // Initial check

  // 4. Mobile Menu Toggle
  const openMobileMenu = () => {
    mobileDrawer.classList.add('open');
    mobileBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeMobileMenu = () => {
    mobileDrawer.classList.remove('open');
    mobileBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  };

  if (mobileToggle) mobileToggle.addEventListener('click', openMobileMenu);
  if (mobileClose) mobileClose.addEventListener('click', closeMobileMenu);
  if (mobileBackdrop) mobileBackdrop.addEventListener('click', closeMobileMenu);

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMobileMenu();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileDrawer.classList.contains('open')) {
      closeMobileMenu();
    }
  });

  // 5. Back to Top Smooth Scroll
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // 6. Clean URL Navigation (Removes '#' symbol completely from page URL)
  const cleanHashFromUrl = () => {
    if (window.location.hash) {
      const targetElement = document.querySelector(window.location.hash);
      if (targetElement) {
        setTimeout(() => {
          const headerHeight = header ? (header.offsetHeight || 75) : 75;
          const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }, 120);
      }
      try {
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      } catch (e) {}
    }
  };

  cleanHashFromUrl();
  window.addEventListener('hashchange', cleanHashFromUrl);

  // Clean URL query section view (e.g. ?view=vehicles, ?view=services)
  const urlViewParam = new URLSearchParams(window.location.search).get('view');
  if (urlViewParam) {
    const targetElement = document.getElementById(urlViewParam);
    if (targetElement) {
      setTimeout(() => {
        const headerHeight = header ? (header.offsetHeight || 75) : 75;
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }, 150);
    }
    try {
      history.replaceState(null, document.title, window.location.pathname);
    } catch (e) {}
  }

  // Smooth Scroll for all internal anchor links (Strips '#' from URL)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const headerHeight = header ? (header.offsetHeight || 75) : 75;
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        // Strip '#' from address bar immediately
        try {
          history.replaceState(null, document.title, window.location.pathname + window.location.search);
        } catch (err) {}
      }
    });
  });

  // 7. Scroll Reveal Animation via IntersectionObserver
  const revealElements = document.querySelectorAll('.reveal-fade-up');
  if ('IntersectionObserver' in window && revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.12
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('is-revealed'));
  }

  // 8. Dynamic Prefill Triggers (Vehicle, Service, Destination)
  window.selectVehicleForBooking = (vehicleName) => {
    const vehicleSelect = document.getElementById('preferredVehicle');
    const bookingSection = document.getElementById('booking');
    
    if (vehicleSelect && vehicleName) {
      const cleanTarget = String(vehicleName).trim().toLowerCase();
      let matched = false;

      // 1. Exact value match
      for (let i = 0; i < vehicleSelect.options.length; i++) {
        const opt = vehicleSelect.options[i];
        if (opt.value && opt.value.trim().toLowerCase() === cleanTarget) {
          vehicleSelect.selectedIndex = i;
          matched = true;
          break;
        }
      }

      // 2. Partial label/text match
      if (!matched) {
        for (let i = 0; i < vehicleSelect.options.length; i++) {
          const opt = vehicleSelect.options[i];
          const optText = opt.text ? opt.text.trim().toLowerCase() : '';
          const optVal = opt.value ? opt.value.trim().toLowerCase() : '';
          if (optText.includes(cleanTarget) || cleanTarget.includes(optVal) || optVal.includes(cleanTarget)) {
            vehicleSelect.selectedIndex = i;
            matched = true;
            break;
          }
        }
      }

      // 3. Dynamic insertion fallback if vehicle was not in options
      if (!matched) {
        const newOpt = document.createElement('option');
        newOpt.value = String(vehicleName).trim();
        newOpt.textContent = String(vehicleName).trim();
        newOpt.selected = true;
        vehicleSelect.appendChild(newOpt);
        vehicleSelect.value = String(vehicleName).trim();
      }

      // Dispatch change event to notify all listeners
      vehicleSelect.dispatchEvent(new Event('change', { bubbles: true }));
      vehicleSelect.classList.remove('is-invalid');
      vehicleSelect.classList.add('is-focused-pulse');
      setTimeout(() => vehicleSelect.classList.remove('is-focused-pulse'), 1500);
    }

    if (bookingSection) {
      const headerHeight = header ? (header.offsetHeight || 75) : 75;
      const targetPosition = bookingSection.getBoundingClientRect().top + window.pageYOffset - headerHeight;
      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    }
  };

  window.selectServiceForBooking = (serviceName) => {
    const serviceSelect = document.getElementById('serviceSelection');
    const bookingSection = document.getElementById('booking');

    if (serviceSelect) {
      serviceSelect.value = serviceName;
      serviceSelect.classList.add('is-focused-pulse');
      setTimeout(() => serviceSelect.classList.remove('is-focused-pulse'), 1500);
    }

    if (bookingSection) {
      const headerHeight = header.offsetHeight || 75;
      const targetPosition = bookingSection.getBoundingClientRect().top + window.pageYOffset - headerHeight;
      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    }
  };

  window.selectDestinationForBooking = (destinationName, defaultService = 'Temple Tours') => {
    const destinationInput = document.getElementById('destinationLocation');
    const serviceSelect = document.getElementById('serviceSelection');
    const bookingSection = document.getElementById('booking');

    if (destinationInput) {
      destinationInput.value = destinationName;
      destinationInput.classList.add('is-focused-pulse');
      setTimeout(() => destinationInput.classList.remove('is-focused-pulse'), 1500);
    }

    if (serviceSelect && defaultService) {
      serviceSelect.value = defaultService;
    }

    if (bookingSection) {
      const headerHeight = header.offsetHeight || 75;
      const targetPosition = bookingSection.getBoundingClientRect().top + window.pageYOffset - headerHeight;
      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    }
  };

  window.selectTripForBooking = (tripTitle, duration = 'Tour Package') => {
    const destinationInput = document.getElementById('destinationLocation');
    const serviceSelect = document.getElementById('serviceSelection');
    const bookingSection = document.getElementById('booking');

    if (destinationInput) {
      destinationInput.value = `${tripTitle} (${duration})`;
      destinationInput.classList.add('is-focused-pulse');
      setTimeout(() => destinationInput.classList.remove('is-focused-pulse'), 1500);
    }

    if (serviceSelect) {
      serviceSelect.value = 'Outstation Trips';
    }

    if (bookingSection) {
      const headerEl = document.querySelector('.main-header');
      const headerHeight = headerEl ? headerEl.offsetHeight : 75;
      const targetPosition = bookingSection.getBoundingClientRect().top + window.pageYOffset - headerHeight;
      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    }
  };

  // 9. Interactive Full-Stack Booking Submission
  if (bookingForm) {
    const validateIndianPhone = (phone) => {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) return true;
      if (cleaned.length === 12 && cleaned.startsWith('91') && /^[6-9]\d{9}$/.test(cleaned.substring(2))) return true;
      return false;
    };

    const inputsToValidate = [
      'customerName',
      'customerPhone',
      'serviceSelection',
      'preferredVehicle',
      'pickupLocation',
      'destinationLocation',
      'travelDate',
      'passengerCount'
    ];

    inputsToValidate.forEach(fieldId => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.addEventListener('input', () => {
          el.classList.remove('is-invalid');
        });
      }
    });

    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      let isValid = true;
      let firstInvalidInput = null;

      const customerName = document.getElementById('customerName');
      const customerPhone = document.getElementById('customerPhone');
      const serviceSelection = document.getElementById('serviceSelection');
      const preferredVehicle = document.getElementById('preferredVehicle');
      const pickupLocation = document.getElementById('pickupLocation');
      const destinationLocation = document.getElementById('destinationLocation');
      const travelDate = document.getElementById('travelDate');
      const passengerCount = document.getElementById('passengerCount');
      const additionalNotes = document.getElementById('additionalNotes');
      const submitBtn = bookingForm.querySelector('button[type="submit"]');

      // Validate inputs
      if (!customerName.value.trim() || customerName.value.trim().length < 2) {
        customerName.classList.add('is-invalid');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = customerName;
      }

      if (!validateIndianPhone(customerPhone.value.trim())) {
        customerPhone.classList.add('is-invalid');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = customerPhone;
      }

      if (!serviceSelection.value) {
        serviceSelection.classList.add('is-invalid');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = serviceSelection;
      }

      if (!preferredVehicle.value) {
        preferredVehicle.classList.add('is-invalid');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = preferredVehicle;
      }

      if (!pickupLocation.value.trim()) {
        pickupLocation.classList.add('is-invalid');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = pickupLocation;
      }

      if (!destinationLocation.value.trim()) {
        destinationLocation.classList.add('is-invalid');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = destinationLocation;
      }

      if (!travelDate.value) {
        travelDate.classList.add('is-invalid');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = travelDate;
      }

      const passengers = parseInt(passengerCount.value, 10);
      if (isNaN(passengers) || passengers < 1 || passengers > 12) {
        passengerCount.classList.add('is-invalid');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = passengerCount;
      }

      if (!isValid) {
        if (firstInvalidInput) {
          firstInvalidInput.focus();
          firstInvalidInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      // Payload for backend
      const bookingPayload = {
        customer_name: customerName.value.trim(),
        customer_phone: customerPhone.value.trim(),
        service_type: serviceSelection.value,
        preferred_vehicle: preferredVehicle.value,
        pickup_location: pickupLocation.value.trim(),
        destination: destinationLocation.value.trim(),
        travel_date: travelDate.value,
        passenger_count: parseInt(passengerCount.value, 10),
        additional_notes: additionalNotes.value.trim()
      };

      // Set Loading State
      const originalBtnHTML = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:8px;">
          <svg style="animation:spin 1s linear infinite; width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24">
            <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8zm0 16c4.41 0 8-3.59 8-8h2c0 5.52-4.48 10-10 10v-2z"/>
          </svg>
          Registering Booking...
        </span>
      `;

      let bookingRef = 'YNT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
      let whatsappUrl = '';

      try {
        // Send to Backend API
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingPayload)
        });

        if (response.ok) {
          const result = await response.json();
          if (result.booking && result.booking.booking_ref) {
            bookingRef = result.booking.booking_ref;
          }
          if (result.whatsapp_url) {
            whatsappUrl = result.whatsapp_url;
          }
        } else {
          console.warn('Backend responded with non-200. Using client-side fallback.');
        }
      } catch (err) {
        console.warn('Backend unreachable (static mode). Using client-side fallback:', err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }

      // Fallback WhatsApp message generator if not received from API
      if (!whatsappUrl) {
        const text = 
`*YAKSHITH NANDH TRAVELS - BOOKING REGISTRATION*
🙏 *Namaste! Here is my confirmed booking:*
━━━━━━━━━━━━━━━━━━━━
🎫 *Booking Ref:* ${bookingRef}
👤 *Passenger:* ${bookingPayload.customer_name}
📞 *Contact:* ${bookingPayload.customer_phone}
🧳 *Service:* ${bookingPayload.service_type}
🚗 *Vehicle:* ${bookingPayload.preferred_vehicle}
📍 *Pickup:* ${bookingPayload.pickup_location}
🎯 *Destination:* ${bookingPayload.destination}
📅 *Date:* ${bookingPayload.travel_date}
👥 *Passengers:* ${bookingPayload.passenger_count}
📝 *Notes:* ${bookingPayload.additional_notes || 'None'}
━━━━━━━━━━━━━━━━━━━━
📍 *Tirupati Dispatch Center:* +91 88868 30755
_Booking registered in Yakshith Nandh Travels Dispatch Queue_`;

        whatsappUrl = `https://api.whatsapp.com/send?phone=918886830755&text=${encodeURIComponent(text)}`;
      }

      // Display Grand Temple Confirmation Card
      if (bookingToast) {
        bookingToast.innerHTML = `
          <div style="background:#FFF9F0; border:2px solid var(--color-accent-gold); border-radius:12px; padding:20px; color:var(--color-text-main); margin-top:20px; box-shadow:0 8px 24px rgba(123,38,58,0.15);">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; border-bottom:1px solid var(--color-border); padding-bottom:12px; margin-bottom:14px;">
              <div>
                <span style="font-size:0.78rem; text-transform:uppercase; letter-spacing:1px; color:var(--color-text-muted); font-weight:700;">Booking Reference:</span>
                <div style="font-family:var(--font-heading); font-size:1.4rem; color:var(--color-primary); font-weight:800;">${bookingRef}</div>
              </div>
              <span style="background:rgba(37,211,102,0.15); color:#128C7E; border:1px solid #25D366; font-size:0.8rem; font-weight:700; padding:4px 12px; border-radius:999px;">
                ● Registered in Dispatch Queue
              </span>
            </div>

            <div style="font-size:0.92rem; line-height:1.6; margin-bottom:16px;">
              <strong>Thank you, ${bookingPayload.customer_name}!</strong> Your booking for <strong>${bookingPayload.preferred_vehicle}</strong> on <strong>${bookingPayload.travel_date}</strong> (Route: ${bookingPayload.pickup_location} ➔ ${bookingPayload.destination}) has been saved in our Tirupati database.
            </div>

            <div style="display:flex; flex-wrap:wrap; gap:12px;">
              <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="background:#25D366; border-color:#20ba5a; color:#fff;">
                <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>
                <span>Open WhatsApp Dispatch</span>
              </a>
              <a href="tel:+918886830755" class="btn btn-secondary btn-sm">
                <span>Call Helpline (+91 88868 30755)</span>
              </a>
            </div>
          </div>
        `;
        bookingToast.classList.add('show');
        bookingToast.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // Automatically launch WhatsApp dispatch in new tab
      setTimeout(() => {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      }, 800);
    });
  }

  // 10. Image Error Fallback Handler
  const allImages = document.querySelectorAll('img');
  allImages.forEach(img => {
    img.addEventListener('error', function() {
      if (!this.getAttribute('data-error-handled')) {
        this.setAttribute('data-error-handled', 'true');
        this.src = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80';
      }
    });
  });

  // ==========================================================================
  // UNIFIED LIVE WEBSITE SYNCHRONIZATION ENGINE (Single Source of Truth)
  // Reactive updates from Cloud Firestore + Instant Revalidation Polling
  // ==========================================================================

  const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  let lastAppliedSnapshotHash = '';
  let currentSiteState = {
    settings: null,
    services: [],
    fleet: [],
    destinations: [],
    trips: []
  };
  let hasHydratedFromFirestore = false;

  const applyWebsiteData = (data, source = 'unknown') => {
    if (!data || typeof data !== 'object') return;

    if (source === 'firestore') {
      hasHydratedFromFirestore = true;
    }

    // If source is API snapshot and we already have Firestore state, never let API snapshot overwrite Firestore data
    if (source === 'api' && hasHydratedFromFirestore) {
      if (currentSiteState.fleet && currentSiteState.fleet.length > 0) {
        data.fleet = currentSiteState.fleet;
      }
      if (currentSiteState.destinations && currentSiteState.destinations.length > 0) {
        data.destinations = currentSiteState.destinations;
      }
      if (currentSiteState.trips && currentSiteState.trips.length > 0) {
        data.trips = currentSiteState.trips;
      }
      if (currentSiteState.services && currentSiteState.services.length > 0) {
        data.services = currentSiteState.services;
      }
      if (currentSiteState.settings) {
        data.settings = { ...data.settings, ...currentSiteState.settings };
      }
    }

    // Preserve latest state internally
    if (data.settings && typeof data.settings === 'object') currentSiteState.settings = data.settings;
    if (Array.isArray(data.fleet) && data.fleet.length > 0) {
      if (!currentSiteState.fleet || currentSiteState.fleet.length === 0) {
        currentSiteState.fleet = data.fleet.map(f => ({
          ...f,
          image_url: f.image_url || f.imageUrl || f.image || ''
        }));
      } else {
        const mergedFleet = [...currentSiteState.fleet];
        for (const incoming of data.fleet) {
          const idx = mergedFleet.findIndex(m => String(m.id) === String(incoming.id));
          const incImg = incoming.image_url || incoming.imageUrl || incoming.image || '';
          if (idx === -1) {
            mergedFleet.push({ ...incoming, image_url: incImg });
          } else {
            const existingImg = mergedFleet[idx].image_url || '';
            const keepExisting = existingImg && (existingImg.startsWith('data:') || existingImg.includes('firebasestorage')) && (!incImg || incImg.includes('unsplash.com'));
            mergedFleet[idx] = {
              ...mergedFleet[idx],
              ...incoming,
              image_url: keepExisting ? existingImg : (incImg || existingImg)
            };
          }
        }
        currentSiteState.fleet = mergedFleet;
      }
    }
    if (Array.isArray(data.destinations) && data.destinations.length > 0) {
      if (!currentSiteState.destinations || currentSiteState.destinations.length === 0) {
        currentSiteState.destinations = data.destinations.map(d => ({
          ...d,
          image_url: d.image_url || d.imageUrl || d.image || d.photo || ''
        }));
      } else {
        const merged = [...currentSiteState.destinations];
        for (const incoming of data.destinations) {
          const idx = merged.findIndex(m => String(m.id) === String(incoming.id));
          const incImg = incoming.image_url || incoming.imageUrl || incoming.image || incoming.photo || '';
          if (idx === -1) {
            merged.push({ ...incoming, image_url: incImg });
          } else {
            const existingImg = merged[idx].image_url || '';
            const keepExisting = existingImg && (existingImg.startsWith('data:') || existingImg.includes('firebasestorage')) && (!incImg || incImg.includes('unsplash.com'));
            merged[idx] = {
              ...merged[idx],
              ...incoming,
              image_url: keepExisting ? existingImg : (incImg || existingImg)
            };
          }
        }
        currentSiteState.destinations = merged;
      }
    }
    if (Array.isArray(data.trips) && data.trips.length > 0) {
      if (!currentSiteState.trips || currentSiteState.trips.length === 0) {
        currentSiteState.trips = data.trips.map(t => ({
          ...t,
          image_url: t.image_url || t.imageUrl || t.image || ''
        }));
      } else {
        const mergedTrips = [...currentSiteState.trips];
        for (const incoming of data.trips) {
          const idx = mergedTrips.findIndex(m => String(m.id) === String(incoming.id));
          const incImg = incoming.image_url || incoming.imageUrl || incoming.image || '';
          if (idx === -1) {
            mergedTrips.push({ ...incoming, image_url: incImg });
          } else {
            const existingImg = mergedTrips[idx].image_url || '';
            const keepExisting = existingImg && (existingImg.startsWith('data:') || existingImg.includes('firebasestorage')) && (!incImg || incImg.includes('unsplash.com'));
            mergedTrips[idx] = {
              ...mergedTrips[idx],
              ...incoming,
              image_url: keepExisting ? existingImg : (incImg || existingImg)
            };
          }
        }
        currentSiteState.trips = mergedTrips;
      }
    }
    if (Array.isArray(data.services) && data.services.length > 0) currentSiteState.services = data.services;

    // Working effective data
    const effectiveData = {
      settings: currentSiteState.settings || data.settings,
      fleet: (currentSiteState.fleet && currentSiteState.fleet.length > 0) ? currentSiteState.fleet : (data.fleet || []),
      destinations: (currentSiteState.destinations && currentSiteState.destinations.length > 0) ? currentSiteState.destinations : (data.destinations || []),
      trips: (currentSiteState.trips && currentSiteState.trips.length > 0) ? currentSiteState.trips : (data.trips || []),
      services: (currentSiteState.services && currentSiteState.services.length > 0) ? currentSiteState.services : (data.services || [])
    };

    // Deep content signature (excludes volatile timestamps like updated_at to prevent DOM thrashing)
    const currentHash = JSON.stringify({
      s: effectiveData.settings ? {
        c: effectiveData.settings.company_name,
        p: effectiveData.settings.primary_phone,
        p2: effectiveData.settings.secondary_phone,
        sl: effectiveData.settings.slogan,
        an: effectiveData.settings.announcement,
        em: effectiveData.settings.email,
        l: effectiveData.settings.location
      } : null,
      f: (effectiveData.fleet || []).map(v => `${v.id}:${v.is_published}:${v.is_available}:${v.model_name}:${v.daily_rent}:${v.rate_per_km}:${v.image_url}`).join('|'),
      d: (effectiveData.destinations || []).map(d => `${d.id}:${d.is_published}:${d.is_popular}:${d.name}:${d.subtitle}:${d.image_url}`).join('|'),
      t: (effectiveData.trips || []).map(t => `${t.id}:${t.is_published}:${t.is_popular}:${t.title}:${t.starting_price}:${t.image_url}`).join('|'),
      v: (effectiveData.services || []).map(s => `${s.id}:${s.is_published}:${s.is_active}:${s.name}:${s.starting_price}`).join('|')
    });
    if (currentHash === lastAppliedSnapshotHash) return;
    lastAppliedSnapshotHash = currentHash;

    // 1. Synchronize Website Branding, Helpline Numbers & Contact Details
    if (effectiveData.settings && typeof effectiveData.settings === 'object') {
      const s = effectiveData.settings;

      // Slogan
      if (s.slogan) {
        document.querySelectorAll('.hero-slogan-box span:last-child, .footer-slogan, .about-lead').forEach(el => {
          el.textContent = `"${s.slogan}"`;
        });
      }

      // Company Name
      if (s.company_name) {
        document.querySelectorAll('.brand-name, .footer-brand-logo strong').forEach(el => {
          el.textContent = s.company_name;
        });
      }

      // Top Announcement Bar
      if (s.announcement) {
        document.querySelectorAll('.top-bar-pill').forEach(el => {
          el.textContent = s.announcement;
        });
      }

      // Primary Hotline
      if (s.primary_phone) {
        const cleanPhone = s.primary_phone.replace(/\s+/g, '');
        document.querySelectorAll('a[title="Call Primary Dispatch"] span, .contact-card:nth-child(1) .contact-action-link, .location-banner-cta a[href^="tel"] span').forEach(el => {
          el.textContent = s.primary_phone;
        });
        document.querySelectorAll('a[title="Call Primary Dispatch"], .contact-card:nth-child(1) a[href^="tel"], .location-banner-cta a[href^="tel"]').forEach(el => {
          el.setAttribute('href', `tel:${cleanPhone}`);
        });
      }

      // Secondary Helpline
      if (s.secondary_phone) {
        const cleanSecPhone = s.secondary_phone.replace(/\s+/g, '');
        document.querySelectorAll('a[title="Call Secondary Dispatch"] span, .contact-card:nth-child(2) .contact-action-link').forEach(el => {
          el.textContent = s.secondary_phone;
        });
        document.querySelectorAll('a[title="Call Secondary Dispatch"], .contact-card:nth-child(2) a[href^="tel"]').forEach(el => {
          el.setAttribute('href', `tel:${cleanSecPhone}`);
        });
      }

      // Business Email
      if (s.email) {
        document.querySelectorAll('.contact-card:nth-child(4) .contact-action-link, .footer-about + a[href^="mailto"]').forEach(el => {
          el.textContent = s.email;
          el.setAttribute('href', `mailto:${s.email}`);
        });
      }

      // Base Location
      if (s.location) {
        document.querySelectorAll('.top-bar-contact .top-bar-item:nth-child(3) span, .footer-brand-col span[style*="uppercase"]').forEach(el => {
          el.textContent = s.location;
        });
      }
    }

    // 2. Synchronize Services Section & Dropdown Options
    if (effectiveData.services && Array.isArray(effectiveData.services)) {
      const publishedServices = effectiveData.services.filter(s => s.is_published !== 0 && s.is_active !== 0);
      const servicesGrid = document.querySelector('.services-grid');
      if (servicesGrid && publishedServices.length > 0) {
        servicesGrid.innerHTML = publishedServices.map((s, idx) => {
          const featuresList = (s.features || '').split(',').map(f => f.trim()).filter(f => f.length > 0);
          const featuresHTML = featuresList.map(feat => `
            <li>
              <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              <span>${escapeHTML(feat)}</span>
            </li>
          `).join('');

          return `
            <div class="service-card reveal-fade-up is-revealed stagger-${(idx % 4) + 1}">
              <div class="service-icon-medallion">
                <svg viewBox="0 0 24 24"><path d="M12 2L9 7h6l-3-5zm-5 6l-2 5h14l-2-5H7zm-3 6l-2 6h18l-2-6H4z"/></svg>
              </div>
              <h3 class="service-title">${escapeHTML(s.name)}</h3>
              <p class="service-desc">${escapeHTML(s.description || '')}</p>
              ${featuresHTML ? `<ul class="service-features-list">${featuresHTML}</ul>` : ''}
              <div class="service-card-footer" style="margin-top:auto; padding-top:14px; display:flex; justify-content:space-between; align-items:center;">
                <span class="service-price-tag" style="font-size:0.88rem; font-weight:700; color:var(--color-primary); background:#FFF9F0; border:1px solid var(--color-border); padding:4px 10px; border-radius:999px;">
                  From ${escapeHTML(s.starting_price || 'Best Rate')}
                </span>
                <button type="button" class="btn btn-secondary btn-sm" onclick="selectServiceForBooking('${escapeHTML((s.name || '').replace(/'/g, "\\'"))}')">
                  Book Service
                </button>
              </div>
            </div>
          `;
        }).join('');
      }

      // Update Service select options in the booking form
      const serviceSelect = document.getElementById('serviceSelection');
      if (serviceSelect && publishedServices.length > 0) {
        const currentVal = serviceSelect.value;
        serviceSelect.innerHTML = '<option value="" disabled selected>Select a Service</option>' +
          publishedServices.map(s => `<option value="${escapeHTML(s.name)}">${escapeHTML(s.name)} (from ${escapeHTML(s.starting_price || 'Best Rate')})</option>`).join('');
        if (currentVal) serviceSelect.value = currentVal;
      }
    }

    // 3. Synchronize Vehicles Fleet Section & Dropdown Options
    if (effectiveData.fleet && Array.isArray(effectiveData.fleet)) {
      const publishedFleet = effectiveData.fleet.filter(v => v.is_published !== 0 && v.is_available !== 0);
      const fleetGrid = document.querySelector('.vehicles-grid');
      if (fleetGrid && publishedFleet.length > 0) {
        const defaultImg = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80';
        fleetGrid.innerHTML = publishedFleet.map((v, idx) => {
          const imgUrl = v.image_url || defaultImg;
          return `
            <div class="vehicle-card reveal-fade-up is-revealed stagger-${(idx % 3) + 1}">
              <div class="vehicle-custom-banner">
                <svg style="width:13px;height:13px;fill:currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1-6.2-4.5-6.2 4.5 2.3-7.1-6.1-4.5h7.6z"/></svg>
                <span>Customized Services Available</span>
              </div>
              <div class="vehicle-image-wrapper">
                <img src="${imgUrl}" alt="${escapeHTML(v.model_name)} - Yakshith Nandh Travels" class="vehicle-image" loading="lazy" onerror="this.onerror=null; this.src='${defaultImg}';">
                <div class="vehicle-badge-overlay">${escapeHTML(v.category || 'Special Fleet')}</div>
                <div class="vehicle-specs-overlay">${escapeHTML(v.capacity || '4 Seater')} • ${escapeHTML(v.daily_rent ? v.daily_rent : (v.airbags || v.luggage_bags || 'Dual Airbags'))}</div>
              </div>
              <div class="vehicle-details">
                <h3 class="vehicle-name">${escapeHTML(v.model_name)}</h3>
                <p class="vehicle-desc">${escapeHTML(v.description || 'Maintained to pristine standards, fully air-conditioned, and equipped with modern safety features.')}</p>
                <div class="vehicle-specs-row">
                  <div class="spec-item">
                    <strong>${escapeHTML(v.capacity || '4 Seater')}</strong>
                    <span>Seats</span>
                  </div>
                  <div class="spec-item">
                    <strong>${escapeHTML(v.daily_rent || '₹3,500/day')}</strong>
                    <span>Daily Rent</span>
                  </div>
                  <div class="spec-item">
                    <strong>${escapeHTML(v.mileage || 'Diesel')}</strong>
                    <span>Diesel Expenses</span>
                  </div>
                  <div class="spec-item">
                    <strong>${escapeHTML(v.airbags || v.luggage_bags || 'Dual Airbags')}</strong>
                    <span>Airbags</span>
                  </div>
                  <div class="spec-item" style="grid-column: 1 / -1; border-top: 1px dashed var(--color-border); padding-top: 8px; margin-top: 4px;">
                    <strong style="color:var(--color-primary); font-size:1.05rem;">${escapeHTML(v.rate_per_km ? (v.rate_per_km.toLowerCase().includes('km') ? v.rate_per_km : v.rate_per_km + ' / km') : '₹23 / km')}</strong>
                    <span>For Long Distances</span>
                  </div>
                </div>
                <div class="vehicle-action-footer">
                  <button type="button" class="btn btn-primary" style="width:100%;" onclick="selectVehicleForBooking('${escapeHTML((v.model_name || '').replace(/'/g, "\\\'"))}')">
                    <span>Enquire Now</span>
                    <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24">
                      <path d="M5 13h11.86l-5.43 5.43 1.42 1.42L21.14 12l-8.29-8.29-1.42 1.42L16.86 11H5v2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      // Update Vehicle select options in the booking form
      const vehicleSelect = document.getElementById('preferredVehicle');
      if (vehicleSelect && publishedFleet.length > 0) {
        const currentVal = vehicleSelect.value;
        const optionsHTML = ['<option value="" disabled' + (!currentVal ? ' selected' : '') + '>Select Preferred Vehicle</option>'];
        publishedFleet.forEach(v => {
          const vName = v.model_name || 'Vehicle';
          const cap = v.capacity ? ` (${v.capacity})` : '';
          const isSelected = (currentVal && (currentVal === vName || currentVal.toLowerCase() === vName.toLowerCase()));
          optionsHTML.push(`<option value="${escapeHTML(vName)}"${isSelected ? ' selected' : ''}>${escapeHTML(vName)}${escapeHTML(cap)}</option>`);
        });
        optionsHTML.push('<option value="Any Available Vehicle"' + (currentVal === 'Any Available Vehicle' ? ' selected' : '') + '>Any Available Vehicle</option>');
        vehicleSelect.innerHTML = optionsHTML.join('');
        if (currentVal) vehicleSelect.value = currentVal;
      }
    }

    // 4. Synchronize Destinations Section
    if (effectiveData.destinations && Array.isArray(effectiveData.destinations)) {
      const publishedDestinations = effectiveData.destinations.filter(d => d.is_published !== 0 && d.is_popular !== 0);
      const destGrid = document.querySelector('.destinations-grid');
      if (destGrid && publishedDestinations.length > 0) {
        const defaultDestImg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><rect width="800" height="400" fill="#f0ece4"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#7B263A" font-family="sans-serif" font-size="22" font-weight="bold">Yakshith Nandh Travels</text></svg>');
        destGrid.innerHTML = publishedDestinations.map((d, idx) => {
          const imgUrl = d.image_url || d.imageUrl || d.image || d.photo || defaultDestImg;
          return `
            <div class="destination-card reveal-fade-up is-revealed stagger-${(idx % 3) + 1}">
              <div class="destination-img-box">
                <img src="${imgUrl}" alt="${escapeHTML(d.name)} - Yakshith Nandh Travels" class="destination-img" loading="lazy" onerror="this.onerror=null; this.src='${defaultDestImg}';">
                <div class="destination-badge">${escapeHTML(d.subtitle || 'Divine Abode')}</div>
              </div>
              <div class="destination-info">
                <h3 class="destination-title">${escapeHTML(d.name)}</h3>
                <div class="destination-subtitle">${escapeHTML(d.subtitle || '')}</div>
                <p class="destination-desc">${escapeHTML(d.description || '')}</p>
                <div class="destination-footer">
                  <span class="destination-dist">
                    <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg>
                    <span>${escapeHTML(d.distance || 'Local')} • ${escapeHTML(d.duration || 'Half Day')}</span>
                  </span>
                  <button type="button" class="btn btn-primary btn-sm" onclick="selectDestinationForBooking('${escapeHTML((d.name || '').replace(/'/g, "\\'"))}', 'Outstation Pilgrimage')">
                    Plan Trip
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 5. Synchronize Trips & Multi-Day Tour Packages Section
    if (effectiveData.trips && Array.isArray(effectiveData.trips)) {
      const publishedTrips = effectiveData.trips.filter(t => t.is_published !== 0 && t.is_active !== 0);
      const tripsGrid = document.querySelector('.trips-grid');
      if (tripsGrid && publishedTrips.length > 0) {
        const defaultTripImg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><rect width="800" height="400" fill="#f0ece4"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#7B263A" font-family="sans-serif" font-size="22" font-weight="bold">Tirupati Tour Package</text></svg>');
        tripsGrid.innerHTML = publishedTrips.map((t, idx) => {
          const imgUrl = t.image_url || defaultTripImg;

          // Day-wise itinerary
          const itineraryLines = (t.itinerary || '').split('\n').filter(l => l.trim().length > 0);
          const dayListHTML = itineraryLines.map((line, dIdx) => {
            let dayLabel = `Day ${dIdx + 1}`;
            let content = line;
            const match = line.match(/^(Day\s*[0-9]+)\s*[:\-]\s*(.*)$/i);
            if (match) {
              dayLabel = match[1];
              content = match[2];
            }
            return `
              <div class="itinerary-day-item">
                <span class="day-chip">${escapeHTML(dayLabel)}</span>
                <span>${escapeHTML(content)}</span>
              </div>
            `;
          }).join('');

          // Vehicles and pricing pills
          const vehicleItems = (t.vehicle_pricing || '').split('|').map(v => v.trim()).filter(v => v.length > 0);
          const vehicleGridHTML = vehicleItems.map(item => {
            const parts = item.split(':');
            const vName = parts[0] ? parts[0].trim() : item;
            const vPrice = parts[1] ? parts[1].trim() : '';
            return `
              <div class="vehicle-price-pill">
                <span>${escapeHTML(vName)}:</span>
                <strong>${escapeHTML(vPrice)}</strong>
              </div>
            `;
          }).join('');

          // Inclusions
          const inclusionItems = (t.inclusions || 'Tolls Included, Parkings Included, Driver Wage Included, 24*7 Support').split(',').map(i => i.trim()).filter(i => i.length > 0);
          const incChecklistHTML = inclusionItems.slice(0, 6).map(inc => {
            return `<span class="inc-check-tag">✓ ${escapeHTML(inc.replace(/^✓\s*/, ''))}</span>`;
          }).join('');

          return `
            <div class="trip-card reveal-fade-up is-revealed stagger-${(idx % 3) + 1}">
              <div class="trip-card-image-box">
                <img src="${imgUrl}" alt="${escapeHTML(t.title)} - Yakshith Nandh Travels" loading="lazy" onerror="this.onerror=null; this.src='${defaultTripImg}';">
                <span class="trip-duration-badge">📅 ${escapeHTML(t.duration_days || '1 Day')}</span>
                <span class="trip-all-inc-badge">✓ All-Inclusive</span>
              </div>
              <div class="trip-card-body">
                <h3 class="trip-card-title">${escapeHTML(t.title)}</h3>
                <div class="trip-card-subtitle">${escapeHTML(t.subtitle || 'Divine Pilgrimage Circuit')}</div>

                <div class="trip-itinerary-box">
                  <div class="itinerary-heading">📍 Day-Wise Itinerary:</div>
                  <div class="itinerary-day-list">
                    ${dayListHTML || '<div style="font-size:0.85rem;color:var(--color-text-muted);">Customizable temple darshan itinerary with ghat road driver.</div>'}
                  </div>
                </div>

                <div class="trip-pricing-table">
                  <div class="pricing-table-heading">
                    <span>🚗 Vehicles & Pricing</span>
                    <span style="font-size:0.72rem; color:var(--color-accent-gold-dark);">All-Inclusive Fare</span>
                  </div>
                  <div class="vehicle-price-grid">
                    ${vehicleGridHTML || '<div class="vehicle-price-pill"><span>Standard Fleet:</span><strong>Best Price</strong></div>'}
                  </div>
                </div>

                <div class="trip-inclusions-checklist">
                  ${incChecklistHTML}
                </div>

                <div class="trip-card-footer">
                  <div class="starting-price-box">
                    <span class="price-label">Starting From</span>
                    <span class="price-val">${escapeHTML(t.starting_price || 'Best Fare')}</span>
                  </div>
                  <button type="button" class="btn btn-primary btn-sm" onclick="selectTripForBooking('${escapeHTML((t.title || '').replace(/'/g, "\\'"))}', '${escapeHTML((t.duration_days || 'Tour Package').replace(/'/g, "\\'"))}')">
                    Book This Trip
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  };

  // ==========================================================================
  // INSTANT HYDRATION FROM CACHE (Zero Blank Flash on Reload)
  // ==========================================================================
  try {
    const cachedStateStr = localStorage.getItem('ynt_firestore_cache');
    if (cachedStateStr) {
      const cached = JSON.parse(cachedStateStr);
      if (cached && typeof cached === 'object') {
        applyWebsiteData(cached, 'firestore');
      }
    }
  } catch (e) {}

  // ==========================================================================
  // REAL-TIME FIRESTORE LISTENERS (Live Reactive Updates Across All Devices)
  // ==========================================================================

  // 1. Unified Site Content Snapshot
  try {
    const docRef = doc(db, 'site_content', 'data');
    onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        if (cloudData) {
          try {
            localStorage.setItem('ynt_firestore_cache', JSON.stringify(cloudData));
          } catch (e) {}
          applyWebsiteData(cloudData, 'firestore');
          console.log('⚡ Real-time sync: Live state received from Cloud Firestore.');
        }
      }
    }, (err) => {
      console.warn('Firestore onSnapshot listener note:', err.message);
    });
  } catch (err) {
    console.warn('Firestore initialization note:', err.message);
  }

  // 2. Individual Collection Direct Query & Listeners for Direct Admin Updates
  try {
    Promise.all([
      getDocs(collection(db, 'destinations')),
      getDocs(collection(db, 'fleet')),
      getDocs(collection(db, 'trips'))
    ]).then(([destSnap, fleetSnap, tripSnap]) => {
      if (destSnap && !destSnap.empty) {
        const destList = [];
        destSnap.forEach(d => {
          const item = d.data();
          if (item) {
            const idVal = item.id !== undefined ? item.id : (isNaN(d.id) ? d.id : parseInt(d.id, 10));
            const imgUrl = item.image_url || item.imageUrl || item.image || item.photo || '';
            destList.push({ ...item, id: idVal, image_url: imgUrl });
          }
        });
        if (destList.length > 0) {
          destList.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
          applyWebsiteData({ destinations: destList }, 'firestore');
        }
      }
      if (fleetSnap && !fleetSnap.empty) {
        const fleetList = [];
        fleetSnap.forEach(d => {
          const item = d.data();
          if (item) {
            const idVal = item.id !== undefined ? item.id : (isNaN(d.id) ? d.id : parseInt(d.id, 10));
            const imgUrl = item.image_url || item.imageUrl || item.image || '';
            fleetList.push({ ...item, id: idVal, image_url: imgUrl });
          }
        });
        if (fleetList.length > 0) {
          fleetList.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
          applyWebsiteData({ fleet: fleetList }, 'firestore');
        }
      }
      if (tripSnap && !tripSnap.empty) {
        const tripList = [];
        tripSnap.forEach(d => {
          const item = d.data();
          if (item) {
            const idVal = item.id !== undefined ? item.id : (isNaN(d.id) ? d.id : parseInt(d.id, 10));
            const imgUrl = item.image_url || item.imageUrl || item.image || '';
            tripList.push({ ...item, id: idVal, image_url: imgUrl });
          }
        });
        if (tripList.length > 0) {
          tripList.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
          applyWebsiteData({ trips: tripList }, 'firestore');
        }
      }
    }).catch(() => {});

    onSnapshot(collection(db, 'fleet'), (snap) => {
      if (!snap.empty) {
        const fleetList = [];
        snap.forEach(d => {
          const item = d.data();
          if (item) {
            const idVal = item.id !== undefined ? item.id : (isNaN(d.id) ? d.id : parseInt(d.id, 10));
            const imgUrl = item.image_url || item.imageUrl || item.image || item.photo || '';
            fleetList.push({ ...item, id: idVal, image_url: imgUrl });
          }
        });
        if (fleetList.length > 0) {
          fleetList.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
          applyWebsiteData({ fleet: fleetList }, 'firestore');
        }
      }
    }, (err) => console.warn('Fleet collection listener note:', err.message));

    onSnapshot(collection(db, 'destinations'), (snap) => {
      if (!snap.empty) {
        const destList = [];
        snap.forEach(d => {
          const item = d.data();
          if (item) {
            const idVal = item.id !== undefined ? item.id : (isNaN(d.id) ? d.id : parseInt(d.id, 10));
            const imgUrl = item.image_url || item.imageUrl || item.image || item.photo || '';
            destList.push({ ...item, id: idVal, image_url: imgUrl });
          }
        });
        if (destList.length > 0) {
          destList.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
          try {
            const rawCache = localStorage.getItem('ynt_firestore_cache');
            const curCache = rawCache ? JSON.parse(rawCache) : {};
            curCache.destinations = destList;
            localStorage.setItem('ynt_firestore_cache', JSON.stringify(curCache));
          } catch (e) {}
          applyWebsiteData({ destinations: destList }, 'firestore');
        }
      }
    }, (err) => console.warn('Destinations collection listener note:', err.message));

    onSnapshot(collection(db, 'trips'), (snap) => {
      if (!snap.empty) {
        const tripList = [];
        snap.forEach(d => {
          const item = d.data();
          if (item) {
            const idVal = item.id !== undefined ? item.id : (isNaN(d.id) ? d.id : parseInt(d.id, 10));
            const imgUrl = item.image_url || item.imageUrl || item.image || item.photo || '';
            tripList.push({ ...item, id: idVal, image_url: imgUrl });
          }
        });
        if (tripList.length > 0) {
          tripList.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
          applyWebsiteData({ trips: tripList }, 'firestore');
        }
      }
    }, (err) => console.warn('Trips collection listener note:', err.message));
  } catch (err) {
    console.warn('Collection listeners note:', err.message);
  }

  // ==========================================================================
  // RESILIENT BACKGROUND REVALIDATION POLLING (Zero Missed Updates)
  // ==========================================================================
  let isFetchingSnapshot = false;
  const fetchLatestSnapshot = async () => {
    if (isFetchingSnapshot) return;
    isFetchingSnapshot = true;
    try {
      const res = await fetch('/api/snapshot', { cache: 'default' });
      if (res.ok) {
        const snapshot = await res.json();
        if (snapshot && snapshot.success) {
          applyWebsiteData(snapshot, 'api');
        }
      }
    } catch (e) {} finally {
      isFetchingSnapshot = false;
    }
  };

  // Immediate initial hydration check
  fetchLatestSnapshot();

  // Periodic heartbeat polling: every 20s when tab is active (preserves CPU & mobile data)
  setInterval(() => {
    if (!document.hidden) {
      fetchLatestSnapshot();
    }
  }, 20000);

  // Auto-revalidate immediately whenever tab or window regains focus
  window.addEventListener('focus', fetchLatestSnapshot);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) fetchLatestSnapshot();
  });

  // Ensure any previous admin live bar is removed
  const legacyBar = document.getElementById('adminLiveBar');
  if (legacyBar) legacyBar.remove();
  try {
    localStorage.removeItem('ynt_admin_active');
  } catch (e) {}
});
