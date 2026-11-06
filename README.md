# 🏛️ Yakshith Nandh Travels

> *Your Safety, Our Priority.*

A premium travel and cab service website for **Yakshith Nandh Travels**, based in **Tirupati, Andhra Pradesh, India** — inspired by the spiritual heritage and temple architecture of Tirumala Sri Venkateswara.

---

## ✨ Features

- 🎨 **Temple-Inspired Design** — Light Maroon, Warm Beige & Antique Gold palette
- 📱 **Fully Responsive** — Mobile-first design with elegant animations
- 🗄️ **SQLite Backend** — Zero-dependency Node.js server with built-in SQLite
- 📋 **Admin Console** — Full CRUD management at `/admin`
  - Bookings & Dispatch
  - Services management
  - Fleet management
  - Destinations management
  - Customer messages & callbacks
  - Site settings
- 💬 **WhatsApp Booking** — Booking form generates a formatted WhatsApp message
- 🔔 **Callback Requests** — Public contact form logs directly to database

---

## 🚀 Getting Started

### Prerequisites
- **Node.js v22+** (uses built-in `node:sqlite` — no npm install needed)

### Run Locally

```bash
# Clone the repo
git clone https://github.com/genzprompts2-cyber/YakshithNanadhtravels.git
cd YakshithNanadhtravels

# Start the server (no npm install required!)
node server.js
```

Then open: **http://localhost:3000**  
Admin Console: **http://localhost:3000/admin**

### Run in VSCode

1. Open the folder in VSCode
2. Press **F5** (or go to Run → Start Debugging)
3. Select **"▶ Start Yakshith Nandh Travels Server"**
4. Open http://localhost:3000 in your browser

---

## 📁 Project Structure

```
yakshithnanadhtravels/
├── index.html          # Main public website
├── admin.html          # Admin console
├── login.html          # Admin secure authentication login
├── script.js           # Public site JS (booking, real-time sync)
├── admin.js            # Admin JS (CRUD handlers, dual-mode uploader)
├── login.js            # Secure login & session management
├── styles.css          # Full temple-aesthetic stylesheet
├── firebase-config.js  # Firebase client credentials & configuration
├── firebase-sdk.js     # Firebase cloud firestore & storage integration
├── database.js         # SQLite fallback and dual-mode data persistence
├── server.js           # Node.js HTTP + REST API server
├── vercel.json         # Vercel serverless deployment config
├── api/                # Serverless API routes
├── images/             # Static brand images & hero assets
├── uploads/            # Dynamic uploaded images
├── data/               # Persistent data snapshots (travels_state.json)
└── .vscode/            # Editor debugging and settings
```

---

## 📞 Contact

| | |
|---|---|
| **Company** | Yakshith Nandh Travels |
| **Location** | Tirupati, Andhra Pradesh, India |
| **Primary** | [+91 88868 30755](tel:+918886830755) |
| **Secondary** | [+91 97009 35888](tel:+919700935888) |
| **WhatsApp** | [Chat Now](https://wa.me/918886830755) |
| **Email** | yakshithnandhtravels.demo@gmail.com *(demo placeholder)* |
| **Hours** | 24/7 — All Days |

---

## 🎨 Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Primary | Deep Light Maroon | `#7B263A` |
| Secondary | Muted Maroon | `#963F50` |
| Background | Warm Beige | `#F5EBDD` |
| Section BG | Ivory | `#FFF9F0` |
| Accent | Antique Gold | `#C49A52` |
| Text | Dark Brown | `#392B27` |

---

*Designed with 🙏 for the spiritual city of Tirupati.*
