# HydroSense Monitor

A hydroponic monitoring system that ingests sensor readings, applies intelligent classification rules, and provides real-time alerts through a React dashboard.

## Live Demo

**Frontend:** [https://hydro-sense-monitor.3jn045m1dbz0y.eu-central-1.cs.amazonlightsail.com/](https://hydro-sense-monitor.3jn045m1dbz0y.eu-central-1.cs.amazonlightsail.com/)

**Backend API:** [https://hydro-sense-monitor.3jn045m1dbz0y.eu-central-1.cs.amazonlightsail.com/api/v1](https://hydro-sense-monitor.3jn045m1dbz0y.eu-central-1.cs.amazonlightsail.com/api/v1)

### Backend API docs

[https://documenter.getpostman.com/view/21567880/2sB2x2Ju3M](https://documenter.getpostman.com/view/21567880/2sB2x2Ju3M)

## Project Structure

````
hydro-sense-monitor/
├── backend/
│   ├── app/
│   │   ├── api/routes/        # FastAPI endpoints
│   │   ├── core/              # Configuration
│   │   ├── tests/             # Backend test suite
│   │   ├── main.py            # Application entry point
│   │   └── schemas.py         # Pydantic models
│   └── pyproject.toml         # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── common/components/ # Reusable UI components
│   │   ├── routes/            # Page components
│   │   └── lib/               # API client & utilities
│   ├── tests/                 # Frontend test suite
│   └── package.json           # Node dependencies
├── docker/                    # Container configurations
├── .github/workflows/         # CI/CD pipeline
└── README.md
````

## Quick Start

### Backend (FastAPI)

```bash
cd backend
uv sync
uv run uvicorn backend.app.main:app --reload
```

Server runs at `http://localhost:8000`

### Frontend (React + TypeScript)

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend available at `http://localhost:5173`

## API Endpoints

### `POST /api/v1/sensor`

Submit sensor readings and receive health classification.

**Request:**

```json
{
  "unitId": "greenhouse-123",
  "timestamp": "2025-05-24T12:34:56Z",
  "readings": { "pH": 6.5, "temp": 22.1, "ec": 1.2 }
}
```

**Response:**

```json
{
  "status": "OK",
  "classification": "Healthy"
}
```

### `GET /api/v1/alerts?unitId=greenhouse-123`

Retrieve the last 10 readings classified as "Needs Attention" for a specific unit.

**Response:**

```json
{
  "unitId": "greenhouse-123",
  "alerts": [
    {
      "unitId": "greenhouse-123",
      "timestamp": "2025-05-24T12:34:56Z",
      "readings": { "pH": 4.2, "temp": 22.1, "ec": 1.2 },
      "classification": "Needs Attention"
    }
  ],
  "unitExists": true,
  "totalReadings": 15
}
```

### `GET /api/v1/units`

Get overview of all hydroponic units with health status and recent activity.

**Response:**

```json
{
  "units": [
    {
      "unitId": "greenhouse-123",
      "lastReading": { /* Latest sensor reading */ },
      "totalReadings": 25,
      "alertsCount": 3,
      "healthStatus": "warning"
    }
  ],
  "totalUnits": 5
}
```

### `GET /healthcheck`

System health verification endpoint.

**Response:**

```json
{
  "status": "Server is running!"
}
```

## Design Decisions

### pH Classification Thresholds

- **Healthy**: pH 5.5 - 7.0 (inclusive)
- **Needs Attention**: pH < 5.5 or pH > 7.0

This range provides the sweet spot for nutrient availability in hydroponic systems. If the pH goes too high or too low, plants lose the ability to take up nutrients - it's like the nutrients are there but out of reach.

### Health Status System

Units are categorized based on recent alert frequency:

- **Healthy**: 0 alerts in last 10 readings
- **Warning**: 1-3 alerts in last 10 readings
- **Critical**: 4+ alerts in last 10 readings

### Data Storage

Uses in-memory storage for simplicity and speed. The data structure uses a list for readings and a dict for quick alert lookups by `unitId`. For production environment, consider:

- PostgreSQL/Supabase for persistent storage
- Redis for caching frequently accessed readings
- Message queues (RabbitMQ) for high-volume sensor inputs

## Enhancement: Units Health Overview

**Implementation**: A minimal "View All Units" dashboard that displays a grid of all hydroponic units with color-coded health indicators, enabling growers to instantly assess their entire operation.

**Value**: This bird's-eye view eliminates the need to check each unit individually and helps prioritize which units need immediate attention. The interface includes:

- **Modal Interface**: Clean overlay with unit grid layout
- **Health Status Indicators**: Color-coded badges (green/yellow/red)
- **Quick Actions**: Click any unit to jump directly to its alert details
- **Pagination**: Handles large numbers of units efficiently
- **Real-time Refresh**: One-click update of all unit statuses

This small addition lets you zoom out from single units to see the big picture of your whole operation, making life way easier for growers/commercial hydroponic farms.

## Testing

### Backend Tests (pytest)

```bash
cd backend
uv run pytest app/tests/ -v
```

**Coverage includes:**

- Payload validation and error handling
- pH classification logic accuracy
- Alert storage and retrieval functionality
- API endpoint behavior and responses

### Frontend Tests (Jest + React Testing Library)

```bash
cd frontend
pnpm test
```

**Coverage includes:**

- Component rendering and user interactions
- Color logic for health status indicators
- Alert fetching and error handling
- Random reading generation and API integration
- Units Health Dashboard functionality

### Production-Critical Test Cases

Beyond standard test coverage, two critical production scenarios are covered:

1. **Out-of-Order Timestamps** (`test_out_of_order_timestamps`)

   - **Problem**: Sensors may send readings with non-chronological timestamps due to network delays, buffering, or clock sync issues
   - **Solution**: System accepts and stores readings correctly while maintaining proper temporal ordering for alerts

2. **Malformed JSON Payloads** (`test_malformed_json_payload`)

   - **Problem**: Invalid JSON from network corruption, client bugs, or malicious requests could crash the system
   - **Solution**: Robust error handling with appropriate HTTP status codes and descriptive error messages without exposing internal details


## Environment Configuration

### Backend Environment Variables

Create `.env` in `backend/` directory:

```bash
PROJECT_NAME="HydroSense Monitor API"
BACKEND_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173
```

### Frontend Environment Variables

Create `.env` in `frontend/` directory:

```bash
VITE_API_URL=http://127.0.0.1:8000/api/v1
VITE_SHOW_DEV_TOOLS=true
```

You can set `VITE_SHOW_DEV_TOOLS=false` to hide development tools (Generate Random Reading)



## CI/CD Pipeline

Automated GitHub Actions workflow provides:

- **Testing**: Full backend (pytest) and frontend (Jest) test suites
- **Building**: Docker containerization for both services
- **Deployment**: AWS Lightsail deployment with multi-container orchestration
- **Quality Assurance**: Linting and type checking

***

## How Total Readings and Alerts Count Work

### Total Readings

- What it counts: The total number of sensor readings ever submitted
  for that unit
- Behavior: Always increases, never decreases
- All units show "1" because each has submitted
  only one reading so far

### Alerts Count

- What it counts: The total number of readings classified as "Needs
  Attention" (pH < 5.5 or pH > 7.0) for that unit
- Behavior: Can only increase or stay the same, never decreases

### Health Status (the colored badge)

- Based on recent performance - only the last 10 readings:

  - 🟢 HEALTHY: 0 alerts in last 10 readings
  - 🟡 WARNING: 1-3 alerts in last 10 readings
  - 🔴 CRITICAL: 4+ alerts in last 10 readings


### Example:

If `tomato-row-6`unit (currently showing pH 4.6) continues sending readings:

- After 5 more readings: Total Readings: 6
- If 3 are healthy (pH 5.5-7.0): Alerts Count: 3 (original 1 + 2 new
  alerts)
- Health Status would depend on the last 10 readings pattern

The counts provide historical context (total performance) while the
health status shows current condition (recent performance).

***

## Demonstrating Health Status Transitions

### Unit Transitions from HEALTHY → WARNING → CRITICAL

Create a Healthy Unit (0 alerts in last 10)



**POST /api/v1/sensor** - Submit 10 healthy readings

```jsonc
// Reading 1-10: All healthy (pH between 5.5-7.0)
  {
    "unitId": "tomato-row-6",
    "timestamp": "2025-06-05T10:00:00Z",
    "readings": {
      "pH": 6.5,
      "temp": 22.5,
      "ec": 1.8
    }
  }
```

**Result:** After 10 readings with pH 5.5-7.0, unit shows 🟢 HEALTHY

### Transition to WARNING (1-3 alerts in last 10)

**POST /api/v1/sensor** - Add 2 bad readings

```jsonc
// Reading 11: Bad pH (alert)
  {
    "unitId": "tomato-row-6",
    "timestamp": "2025-06-05T10:11:00Z",
    "readings": {
      "pH": 5.2,  // < 5.5 = Alert!
      "temp": 22.5,
      "ec": 1.8
    }
  }
  // Reading 12: Another bad pH
  {
    "unitId": "tomato-row-6",
    "timestamp": "2025-06-05T10:12:00Z",
    "readings": {
      "pH": 7.8,  // > 7.0 = Alert!
      "temp": 22.5,
      "ec": 1.8
    }
  }
```

**Result:** Last 10 readings (3-12) have 2 alerts → 🟡 **WARNING**

### Transition to CRITICAL (4+ alerts in last 10)

**POST /api/v1/sensor** - Add more bad readings

```jsonc
// Readings 13-16: All bad pH values
  {
    "unitId": "tomato-row-6",
    "timestamp": "2025-06-05T10:13:00Z",
    "readings": {
      "pH": 4.8,  // alert!
      "temp": 22.5,
      "ec": 1.8
    }
  }
```

**Result:** Last 10 readings (7-16) have 5 alerts → 🔴 **CRITICAL**

### Recovery from CRITICAL → WARNING → HEALTHY

Begin recovery with `tomato-row-6` unit.

**POST /api/v1/sensor** - Add good readings

```jsonc
{
    "unitId": "tomato-row-6",
    "timestamp": "2025-06-05T11:00:00Z",
    "readings": {
      "pH": 6.2,  // Healthy!
      "temp": 22.5,
      "ec": 1.8
    }
}
```

**After adding 7 healthy readings:** Last 10 have only 3 alerts → 🟡 WARNING

**After adding 10 healthy readings:** Last 10 have 0 alerts → 🟢 HEALTHY
