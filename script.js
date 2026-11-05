/**
 * YAKSHITH NANDH TRAVELS - Interactive Full-Stack Client
 * Location: Tirupati, Andhra Pradesh, India
 * Dispatch Hotline: +91 88868 30755 / +91 97009 35888
 */

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

  // 3. Sticky Navigation & Scroll Spy
  const handleScroll = () => {
    const scrollY = window.scrollY;

    // Header sticky shadow
    if (scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Back to top button visibility
    if (backToTopBtn) {
      if (scrollY > 400) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }

    // ScrollSpy active link detection
    const sections = document.querySelectorAll('section[id]');
    let currentSectionId = '';

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        currentSectionId = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
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
    
    if (vehicleSelect) {
      vehicleSelect.value = vehicleName;
      vehicleSelect.classList.add('is-focused-pulse');
      setTimeout(() => vehicleSelect.classList.remove('is-focused-pulse'), 1500);
    }

    if (bookingSection) {
      const headerHeight = header.offsetHeight || 75;
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

  // 11. Live Webpage Data Synchronization (Backend to Frontend)
  const syncLiveWebpageData = async () => {
    try {
      // Sync Brand Settings
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        const s = data.settings || {};
        if (s.slogan) {
          const sloganElements = document.querySelectorAll('.hero-slogan-box span:last-child, .footer-slogan');
          sloganElements.forEach(el => { el.textContent = `"${s.slogan}"`; });
        }
        if (s.announcement) {
          const annEl = document.querySelector('.top-bar-pill');
          if (annEl) annEl.textContent = s.announcement;
        }
      }

      // Sync Services Data
      const servicesRes = await fetch('/api/services');
      if (servicesRes.ok) {
        const sData = await servicesRes.json();
        const services = sData.services || [];
        const serviceCards = document.querySelectorAll('.service-card');
        services.forEach((s, idx) => {
          if (serviceCards[idx]) {
            const titleEl = serviceCards[idx].querySelector('.service-title');
            const descEl = serviceCards[idx].querySelector('.service-desc');
            if (titleEl && s.name) titleEl.textContent = s.name;
            if (descEl && s.description) descEl.textContent = s.description;
          }
        });
      }
    } catch (e) {
      // Graceful offline fallback
    }
  };

  syncLiveWebpageData();

  // 12. Admin Live Access Mode & Direct Section Controls
  const checkAdminAccess = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasAdminParam = urlParams.get('admin') === '1' || urlParams.get('admin') === 'true';
    const hasAdminStorage = localStorage.getItem('ynt_admin_active') === '1';

    if (hasAdminParam) {
      localStorage.setItem('ynt_admin_active', '1');
    }

    if (hasAdminParam || hasAdminStorage) {
      injectAdminLiveBar();
      injectSectionEditButtons();
    }
  };

  const injectAdminLiveBar = () => {
    if (document.getElementById('adminLiveBar')) return;

    const bar = document.createElement('div');
    bar.id = 'adminLiveBar';
    bar.style.cssText = 'background:#7B263A; color:#FFF9F0; border-bottom:2px solid #C49A52; padding:8px 0; font-size:0.85rem; position:sticky; top:0; z-index:10001; box-shadow:0 4px 12px rgba(0,0,0,0.2);';
    bar.innerHTML = `
      <div class="container" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="background:#C49A52; color:#392B27; font-weight:800; font-size:0.72rem; padding:2px 8px; border-radius:999px;">👑 ADMIN ACCESS ACTIVE</span>
          <span>You have full administrative control over this webpage's data</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <a href="/admin.html?view=bookings" target="_blank" class="btn btn-sm" style="background:#FFF9F0; color:#7B263A; padding:4px 10px; font-size:0.76rem; font-weight:bold;">Dispatch Console</a>
          <a href="/admin.html?view=services" target="_blank" class="btn btn-sm" style="background:rgba(255,255,255,0.18); color:#FFF; padding:4px 10px; font-size:0.76rem;">Edit Services</a>
          <a href="/admin.html?view=fleet" target="_blank" class="btn btn-sm" style="background:rgba(255,255,255,0.18); color:#FFF; padding:4px 10px; font-size:0.76rem;">Edit Fleet</a>
          <a href="/admin.html?view=destinations" target="_blank" class="btn btn-sm" style="background:rgba(255,255,255,0.18); color:#FFF; padding:4px 10px; font-size:0.76rem;">Edit Destinations</a>
          <a href="/admin.html?view=settings" target="_blank" class="btn btn-sm" style="background:rgba(255,255,255,0.18); color:#FFF; padding:4px 10px; font-size:0.76rem;">Edit Settings</a>
          <button id="exitAdminBtn" style="background:transparent; border:1px solid #C49A52; color:#FFF; font-size:0.75rem; padding:4px 8px; border-radius:4px; cursor:pointer;">Exit</button>
        </div>
      </div>
    `;
    document.body.prepend(bar);

    document.getElementById('exitAdminBtn').addEventListener('click', () => {
      localStorage.removeItem('ynt_admin_active');
      window.location.href = window.location.pathname;
    });
  };

  const injectSectionEditButtons = () => {
    const sectionMappings = [
      { id: 'services', view: 'services', label: 'Edit Services' },
      { id: 'vehicles', view: 'fleet', label: 'Edit Vehicles' },
      { id: 'destinations', view: 'destinations', label: 'Edit Destinations' },
      { id: 'booking', view: 'bookings', label: 'Manage Bookings' },
      { id: 'contact', view: 'messages', label: 'View Inquiries' }
    ];

    sectionMappings.forEach(m => {
      const section = document.getElementById(m.id);
      if (section) {
        const header = section.querySelector('.section-header');
        if (header && !header.querySelector('.admin-section-edit-btn')) {
          const editBtn = document.createElement('a');
          editBtn.href = `/admin.html?view=${m.view}`;
          editBtn.target = '_blank';
          editBtn.className = 'admin-section-edit-btn';
          editBtn.style.cssText = 'display:inline-flex; align-items:center; gap:5px; background:#7B263A; color:#FFF9F0; border:1px solid #C49A52; padding:3px 10px; border-radius:999px; font-size:0.75rem; font-weight:700; text-decoration:none; margin-top:8px; box-shadow:0 2px 6px rgba(0,0,0,0.15);';
          editBtn.innerHTML = `✏️ ${m.label} in Admin`;
          header.appendChild(editBtn);
        }
      }
    });
  };

  // Dynamic Fleet Loader (Loads custom vehicle additions from API or LocalStorage)
  const loadWebsiteFleet = async () => {
    const grid = document.querySelector('.vehicles-grid');
    if (!grid) return;

    let fleet = null;
    try {
      const res = await fetch('/api/fleet');
      if (res.ok) {
        const data = await res.json();
        if (data && data.fleet && data.fleet.length > 0) fleet = data.fleet;
      }
    } catch (e) {}

    if (!fleet) {
      try {
        const stored = localStorage.getItem('ynt_fleet');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) fleet = parsed;
        }
      } catch (e) {}
    }

    if (!fleet || fleet.length === 0) return;

    const defaultImg = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80';
    grid.innerHTML = fleet.map((v, idx) => {
      const imgUrl = v.image_url || defaultImg;
      return `
        <div class="vehicle-card reveal-fade-up is-revealed stagger-${(idx % 3) + 1}">
          <div class="vehicle-image-wrapper">
            <img src="${imgUrl}" alt="${v.model_name} - Yakshith Nandh Travels" class="vehicle-image" loading="lazy" onerror="this.src='${defaultImg}'">
            <div class="vehicle-badge-overlay">${v.category || 'Special Fleet'}</div>
            <div class="vehicle-specs-overlay">${v.capacity || '4 Seater'} • ${v.daily_rent ? v.daily_rent : (v.airbags || v.luggage_bags || 'Dual Airbags')}</div>
          </div>
          <div class="vehicle-details">
            <h3 class="vehicle-name">${v.model_name}</h3>
            <div class="vehicle-tagline">${v.rate_per_km ? 'Tariff: ' + v.rate_per_km : 'Supreme Comfort & Ghat Mastery'}</div>
            <p class="vehicle-desc">${v.description || 'Maintained to pristine standards, fully air-conditioned, and equipped with modern safety features for quiet, relaxed travel.'}</p>
            <div class="vehicle-specs-row">
              <div class="spec-item">
                <strong>${v.capacity || '4 Seater'}</strong>
                <span>Seats</span>
              </div>
              <div class="spec-item">
                <strong>${v.daily_rent || '₹3,500/day'}</strong>
                <span>Daily Rent</span>
              </div>
              <div class="spec-item">
                <strong>${v.mileage || '14-18 km/l'}</strong>
                <span>Mileage</span>
              </div>
              <div class="spec-item">
                <strong>${v.airbags || v.luggage_bags || 'Dual Airbags'}</strong>
                <span>Airbags</span>
              </div>
            </div>
            <div class="vehicle-action-footer">
              <button type="button" class="btn btn-primary" style="width:100%;" onclick="selectVehicleForBooking('${(v.model_name || '').replace(/'/g, "\\'")}')">
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
  };

  // Dynamic Destinations Loader (Displays custom/updated images on Home Screen)
  const loadWebsiteDestinations = async () => {
    const grid = document.querySelector('.destinations-grid');
    if (!grid) return;

    let dests = null;
    try {
      const res = await fetch('/api/destinations');
      if (res.ok) {
        const data = await res.json();
        if (data && data.destinations && data.destinations.length > 0) dests = data.destinations;
      }
    } catch (e) {}

    if (!dests) {
      try {
        const stored = localStorage.getItem('ynt_destinations');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) dests = parsed;
        }
      } catch (e) {}
    }

    if (!dests || dests.length === 0) return;

    const defaultDestImg = 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80';
    grid.innerHTML = dests.map((d, idx) => {
      const imgUrl = d.image_url || defaultDestImg;
      return `
        <div class="destination-card reveal-fade-up is-revealed stagger-${(idx % 3) + 1}">
          <div class="destination-img-box">
            <img src="${imgUrl}" alt="${d.name} - Yakshith Nandh Travels" class="destination-img" loading="lazy" onerror="this.src='${defaultDestImg}'">
            <div class="destination-badge">${d.subtitle || 'Sacred Abode'}</div>
          </div>
          <div class="destination-info">
            <h3 class="destination-title">${d.name}</h3>
            <div class="destination-subtitle">${d.subtitle || ''}</div>
            <p class="destination-desc">${d.description || ''}</p>
            <div class="destination-footer">
              <span class="destination-dist">
                <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg>
                <span>${d.distance || 'Local'} • ${d.duration || 'Half Day'}</span>
              </span>
              <button type="button" class="btn btn-primary btn-sm" onclick="selectDestinationForBooking('${(d.name || '').replace(/'/g, "\\'")}', 'Outstation Pilgrimage')">
                Plan Trip
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  };

  loadWebsiteFleet();
  loadWebsiteDestinations();
  checkAdminAccess();
});
