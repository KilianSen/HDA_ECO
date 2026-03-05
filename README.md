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

## Docker Deployment

To deploy HDA ECO using Docker:

### Using Docker Compose (Single Node)
To start the application using Docker Compose:
```bash
docker-compose up -d
```

### Using Docker Swarm (Docker Stack)
To deploy the application as a stack in a Docker Swarm cluster:

1. **Build the image and tag it:**
   ```bash
   docker build -t hda-eco:latest .
   ```

2. **Initialize Swarm (if not already):**
   ```bash
   docker swarm init
   ```

3. **Deploy the stack:**
   ```bash
   docker stack deploy -c docker-stack.yml hda-eco
   ```

## CI/CD - GitHub Actions

The project includes a GitHub Action to automatically build and publish the Docker image to GitHub Container Registry (GHCR).

- **Triggers**: On every push to `main`/`master` and on new release tags (`v*.*.*`).
- **Image Name**: `ghcr.io/yourusername/hda-eco:latest` (or the specific tag).

To use the published image in your `docker-stack.yml`, update the `image` field:
```yaml
services:
  hda-eco:
    image: ghcr.io/<your-github-username>/hda-eco:latest
    # ...
```

Note: The `docker-stack.yml` uses `replicas: 1` as the SQLite database is stored locally. For high availability, consider using an external database and distributed volumes.

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

### GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007

Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.

(See full license text in the LICENSE file)

---

**Internal Tooling Only** - Made by [KilianSen](https://github.com/KilianSen)
