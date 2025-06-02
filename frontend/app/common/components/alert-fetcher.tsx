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
		<div className="space-y-6">
			<div>
				<div className="flex flex-col gap-4">
					<Input
						type="text"
						placeholder="Unit ID"
						value={unitId}
						onChange={(e) => setUnitId(e.target.value)}
						className="w-full h-12 text-base text-gray-900 placeholder:text-gray-500"
					/>
					<Button
						onClick={fetchAlerts}
						disabled={loading}
						className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-medium cursor-pointer transition-colors duration-200 ease-in-out"
					>
						{loading ? "Loading..." : "Fetch Alerts"}
					</Button>
				</div>
				{error && <p className="text-sm text-red-600 mt-2">{error}</p>}
			</div>

			{alerts.length > 0 && (
				<div className="mt-6">
					<h4 className="text-base font-medium text-gray-700 mb-3">
						Recent Alerts for {unitId}
					</h4>
					<div className="border border-gray-200 rounded-lg overflow-hidden">
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="text-sm whitespace-nowrap text-gray-700 font-medium">
											Timestamp
										</TableHead>
										<TableHead className="text-sm text-gray-700 font-medium">
											pH
										</TableHead>
										<TableHead className="text-sm text-gray-700 font-medium">
											Temperature (°C)
										</TableHead>
										<TableHead className="text-sm text-gray-700 font-medium">
											EC (mS/cm)
										</TableHead>
										<TableHead className="text-sm text-gray-700 font-medium">
											Status
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{alerts.map((alert) => (
										<TableRow key={alert.id}>
											<TableCell className="text-sm text-gray-900">
												{formatTimestamp(alert.timestamp)}
											</TableCell>
											<TableCell className="text-sm text-gray-900">
												{alert.readings.pH}
											</TableCell>
											<TableCell className="text-sm text-gray-900">
												{alert.readings.temp}
											</TableCell>
											<TableCell className="text-sm text-gray-900">
												{alert.readings.ec}
											</TableCell>
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
				</div>
			)}
		</div>
	);
}
