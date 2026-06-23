This is a advanced, web-based calculator project designed for students and enthusiasts. Built with a modern tech stack featuring a custom glassmorphism UI and optimized background processing.

## 🚀 Features
* **Performance-First:** Math-heavy computations are offloaded to **Web Workers** to keep the UI fluid and responsive.
* **Modern Aesthetic:** Implements a "Glassmorphism" design with ambient proximal lighting.
* **Mobile-Ready:** Fully responsive layout, tested for seamless use on smartphones.
* **Self-Hosted:** Deployed using **Caddy** for efficient, secure, and fast delivery.

## 🛠 Tech Stack
* **Frontend:** HTML5, CSS3 (Glassmorphism), JavaScript (ES6+)
* **Math Engine:** [Desmos Graphing Calculator API](https://www.desmos.com/api)
* **Concurrency:** Web Workers (for background processing)
* **Server:** Caddy Web Server

## 📂 Project Structure
```
/
├── Caddyfile            # Caddy server configuration
├── index.html           # Main application entry point
├── css/
│   ├── main.css         # General app styling & glassmorphism
│   └── calculator.css   # Desmos container overrides
├── js/
│   ├── main.js          # App initialization & UI logic
│   ├── worker.js        # Background mathematical computations
│   └── desmos-init.js   # Desmos API wrapper & configuration
└── assets/              # Icons and images
```

## ⚙️ Setup & Deployment

### Prerequisites
* [Caddy Server](https://caddyserver.com/) installed on your machine.

### Local Installation
Download the index.html, main.js, global.css, wokrer.js and run.bat. Use the calculator in your web browser. Launch it via "run.bat"

## 🛡 License
This project is for personal use and study purposes.
The Desmos API is subject to [Desmos Terms of Service](https://www.desmos.com/api-terms).
