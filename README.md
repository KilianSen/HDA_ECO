# HDA ECO - Fleet Management Dashboard

HDA ECO is a comprehensive, local-first fleet management solution designed to track fuel transactions, monitor station inventory, and analyze vehicle and driver performance.

![HDA ECO Dashboard](https://via.placeholder.com/1200x600.png?text=HDA+ECO+Dashboard)

## Features

- **Dashboard:** Real-time overview of total fuel consumption, active vehicles, and recent activity.
- **Advanced Analytics:** 
  - **Global Efficiency:** Tracks L/100km or L/h across the fleet.
  - **Forecasting:** Predicts future fuel needs based on consumption trends.
  - **Operational Peaks:** Identifies peak hours and busiest days.
- **Station Management:** 
  - Monitor current tank levels and estimated days remaining.
  - Log fuel deliveries and manage inventory.
- **Transactions:** 
  - Detailed log of all fuel exports.
  - Support for manual entry and editing of transactions.
  - Import data from `DATA0001.TXT` files.
  - Export data to CSV and Excel.
- **Management:** 
  - Manage vehicle and driver identities.
  - Configure system settings (Hours vs. Kilometers).

## Getting Started

### Prerequisites

- Node.js (v20+)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/hda-eco.git
   cd hda-eco
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Start the backend server (in a separate terminal):
   ```bash
   npm run server
   ```

## Docker Deployment (Production)

To deploy HDA ECO using Docker:

1. Build and run the container using Docker Compose:
   ```bash
   docker-compose up -d --build
   ```

2. Access the application at `http://localhost:3001`.

The `docker-compose.yml` file is configured to persist your database (`database.db`) and uploaded files.

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

### GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007

Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.

(See full license text in the LICENSE file)

---

**Internal Tooling Only** - Made by [KilianSen](https://github.com/KilianSen)
