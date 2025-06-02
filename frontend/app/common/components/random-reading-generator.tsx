import { useState } from "react";
import { Button } from "./button";

interface SensorReading {
	pH: number;
	temp: number;
	ec: number;
}

interface ClassificationResult {
	status: string;
	classification: "Healthy" | "Needs Attention";
}

export function RandomReadingGenerator() {
	const [lastReading, setLastReading] = useState<SensorReading | null>(null);
	const [classification, setClassification] =
		useState<ClassificationResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const generateRandomReading = (): SensorReading => {
		// pH 4-9: typical hydroponic range (not full 0-14) to generate realistic test data
		const pH = Number((Math.random() * 5 + 4).toFixed(1));

		// Temp 15-30°C: greenhouse conditions, not the full -10 to 60°C backend range
		const temp = Number((Math.random() * 15 + 15).toFixed(1));

		// EC 0.5-3.0: covers lettuce (0.8) to tomatoes (3.0) nutrient needs
		const ec = Number((Math.random() * 2.5 + 0.5).toFixed(1));

		return { pH, temp, ec };
	};

	const sendRandomReading = async () => {
		setLoading(true);
		setError(null);

		const reading = generateRandomReading();
		setLastReading(reading);

		try {
			// Mock API call - enables UI testing without backend running
			await new Promise((resolve) => setTimeout(resolve, 500));

			// pH 5.5-7.0 = optimal nutrient uptake range for most crops
			const isHealthy = reading.pH >= 5.5 && reading.pH <= 7.0;
			const mockResponse: ClassificationResult = {
				status: "OK",
				classification: isHealthy ? "Healthy" : "Needs Attention",
			};

			setClassification(mockResponse);
		} catch (err) {
			setError("Failed to send reading");
			setClassification(null);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-base font-medium text-gray-900 mb-3">
					Generate Random Sensor Reading
				</h3>
				<p className="text-sm text-gray-600 mb-4">
					Generate and send a random sensor reading to test the classification
					system.
				</p>

				<Button onClick={sendRandomReading} disabled={loading}>
					{loading ? "Sending..." : "Generate Random Reading"}
				</Button>

				{error && <p className="text-sm text-red-600 mt-2">{error}</p>}
			</div>

			{lastReading && classification && (
				<div className="mt-4 space-y-3">
					<div className="bg-gray-50 rounded-lg p-4">
						<h4 className="text-sm font-medium text-gray-700 mb-2">
							Generated Reading:
						</h4>
						<div className="grid grid-cols-3 gap-4 text-sm">
							<div>
								<span className="text-gray-500">pH:</span>{" "}
								<span className="font-medium text-gray-900">
									{lastReading.pH}
								</span>
							</div>
							<div>
								<span className="text-gray-500">Temp:</span>{" "}
								<span className="font-medium text-gray-900">
									{lastReading.temp}°C
								</span>
							</div>
							<div>
								<span className="text-gray-500">EC:</span>{" "}
								<span className="font-medium text-gray-900">
									{lastReading.ec} mS/cm
								</span>
							</div>
						</div>
					</div>

					<div className="bg-gray-50 rounded-lg p-4">
						<h4 className="text-sm font-medium text-gray-700 mb-2">
							Classification Result:
						</h4>
						<div className="flex items-center gap-2">
							<span className="text-sm text-gray-500">Status:</span>
							<span className="text-sm font-medium text-gray-900">
								{classification.status}
							</span>
						</div>
						<div className="flex items-center gap-2 mt-1">
							<span className="text-sm text-gray-500">Classification:</span>
							<span
								className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
									classification.classification === "Healthy"
										? "bg-green-100 text-green-800"
										: "bg-red-100 text-red-800"
								}`}
							>
								{classification.classification}
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
