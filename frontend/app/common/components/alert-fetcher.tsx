import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./table";

interface SensorReading {
	pH: number;
	temp: number;
	ec: number;
}

interface Alert {
	id: string;
	unit_id: string;
	timestamp: string;
	readings: SensorReading;
	classification: "Healthy" | "Needs Attention";
}

export function AlertFetcher() {
	const [unitId, setUnitId] = useState("");
	const [alerts, setAlerts] = useState<Alert[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchAlerts = async () => {
		if (!unitId.trim()) {
			setError("Please enter a unit ID");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			// For now, we'll just set mock data
			// This will be replaced with actual API call in todo #5
			const mockAlerts: Alert[] = [
				{
					id: "1",
					unit_id: unitId,
					timestamp: new Date().toISOString(),
					readings: { pH: 7.5, temp: 23.1, ec: 1.4 },
					classification: "Needs Attention",
				},
				{
					id: "2",
					unit_id: unitId,
					timestamp: new Date(Date.now() - 600000).toISOString(),
					readings: { pH: 6.2, temp: 22.5, ec: 1.3 },
					classification: "Healthy",
				},
				{
					id: "3",
					unit_id: unitId,
					timestamp: new Date(Date.now() - 1200000).toISOString(),
					readings: { pH: 8.2, temp: 24.5, ec: 1.5 },
					classification: "Needs Attention",
				},
			];

			setAlerts(mockAlerts);
		} catch (err) {
			setError("Failed to fetch alerts");
		} finally {
			setLoading(false);
		}
	};

	const formatTimestamp = (timestamp: string) => {
		return new Date(timestamp).toLocaleString();
	};

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-base font-medium text-gray-900 mb-3">
					Fetch Alerts by Unit ID
				</h3>
				<div className="flex gap-2">
					<Input
						type="text"
						placeholder="Enter unit ID (e.g., unit-123)"
						value={unitId}
						onChange={(e) => setUnitId(e.target.value)}
						className="flex-1"
					/>
					<Button onClick={fetchAlerts} disabled={loading}>
						{loading ? "Loading..." : "Fetch Alerts"}
					</Button>
				</div>
				{error && <p className="text-sm text-red-600 mt-2">{error}</p>}
			</div>

			{alerts.length > 0 && (
				<div>
					<h4 className="text-sm font-medium text-gray-700 mb-2">
						Recent Alerts for {unitId}
					</h4>
					<div className="border rounded-lg overflow-hidden">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Timestamp</TableHead>
									<TableHead>pH</TableHead>
									<TableHead>Temperature (°C)</TableHead>
									<TableHead>EC (mS/cm)</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{alerts.map((alert) => (
									<TableRow key={alert.id}>
										<TableCell>{formatTimestamp(alert.timestamp)}</TableCell>
										<TableCell>{alert.readings.pH}</TableCell>
										<TableCell>{alert.readings.temp}</TableCell>
										<TableCell>{alert.readings.ec}</TableCell>
										<TableCell>
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													alert.classification === "Healthy"
														? "bg-green-100 text-green-800"
														: "bg-red-100 text-red-800"
												}`}
											>
												{alert.classification}
											</span>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			)}
		</div>
	);
}
