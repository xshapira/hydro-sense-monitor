import { useState } from "react";
import { AlertFetcher } from "../common/components/alert-fetcher";
import { Button } from "../common/components/button";
import { RandomReadingGenerator } from "../common/components/random-reading-generator";
import { UnitsHealthDashboard } from "../common/components/units-health-dashboard";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "HydroSense Monitor" },
		{
			name: "description",
			content: "Monitor hydroponic sensor readings in real-time",
		},
	];
}

export default function Home() {
	const [showUnitsModal, setShowUnitsModal] = useState(false);

	return (
		<div className="min-h-screen bg-gray-100">
			{/* Header */}
			<header className="bg-white shadow-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-center h-20">
						<h1 className="text-3xl font-semibold text-gray-900">
							HydroSense Monitor
						</h1>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-3xl mx-auto px-4 pt-20 pb-12">
				<div className="space-y-6">
					{/* Units Overview Button */}
					<div className="bg-white rounded-xl shadow-md p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">
							Units Overview
						</h2>
						<p className="text-gray-600 text-sm mb-4">
							View the health status of all your hydroponic units at a glance
						</p>
						<Button
							onClick={() => setShowUnitsModal(true)}
							className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-medium"
						>
							View All Units
						</Button>
					</div>
					{/* Alert Fetching Component */}
					<div className="bg-white rounded-xl shadow-md p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-6">
							Fetch Unit Alerts
						</h2>
						<AlertFetcher />
					</div>

					{/* Random Reading Generator */}
					<div className="bg-white rounded-xl shadow-md p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-6">
							Test Sensor Classification
						</h2>
						<RandomReadingGenerator />
					</div>
				</div>
			</main>

			{/* Units Health Dashboard Modal */}
			{showUnitsModal && (
				<UnitsHealthDashboard
					onClose={() => setShowUnitsModal(false)}
					onUnitClick={(unitId) => {
						setShowUnitsModal(false);
					}}
				/>
			)}
		</div>
	);
}
