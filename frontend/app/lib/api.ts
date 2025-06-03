const getApiBaseUrl = () => {
	try {
		return import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";
	} catch {
		return "http://127.0.0.1:8000/api/v1";
	}
};

const API_BASE_URL = getApiBaseUrl();

export interface SensorReading {
	pH: number;
	temp: number;
	ec: number;
}

export interface SensorDataInput {
	unitId: string;
	timestamp: string;
	readings: SensorReading;
}

export interface ClassificationStatus {
	status: string;
	classification: "Healthy" | "Needs Attention";
}

export interface Alert {
	unitId: string;
	timestamp: string;
	readings: SensorReading;
	classification: "Healthy" | "Needs Attention";
}

export interface AlertsResponse {
	unitId: string;
	alerts: Alert[];
}

export interface UnitStatus {
	unitId: string;
	lastReading: Alert | null;
	totalReadings: number;
	alertsCount: number;
	healthStatus: "healthy" | "warning" | "critical";
}

export interface UnitsResponse {
	units: UnitStatus[];
	totalUnits: number;
}

class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}

export const api = {
	async fetchAlerts(unitId: string): Promise<AlertsResponse> {
		if (!unitId.trim()) {
			throw new Error("Unit ID is required");
		}

		const response = await fetch(
			`${API_BASE_URL}/alerts?unit_id=${encodeURIComponent(unitId)}`,
		);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new ApiError(
				response.status,
				errorData.detail || `Failed to fetch alerts: ${response.statusText}`,
			);
		}

		return response.json();
	},

	async submitSensorReading(
		data: SensorDataInput,
	): Promise<ClassificationStatus> {
		const response = await fetch(`${API_BASE_URL}/sensor`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new ApiError(
				response.status,
				errorData.detail ||
					`Failed to submit sensor reading: ${response.statusText}`,
			);
		}

		return response.json();
	},

	async fetchUnits(): Promise<UnitsResponse> {
		const response = await fetch(`${API_BASE_URL}/units`);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new ApiError(
				response.status,
				errorData.detail || `Failed to fetch units: ${response.statusText}`,
			);
		}

		return response.json();
	},
};
