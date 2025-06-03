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

interface HomeProps {
	showDevTools?: boolean;
}

export default function Home({ showDevTools }: HomeProps = {}) {
	const [showUnitsModal, setShowUnitsModal] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedUnitId, setSelectedUnitId] = useState<string>("");

	const isDevToolsEnabled =
		showDevTools ?? import.meta.env?.VITE_SHOW_DEV_TOOLS === "true";

	const openModal = () => {
		setShowUnitsModal(true);
		// Small delay to allow the DOM to update before starting animation
		setTimeout(() => setIsModalVisible(true), 10);
	};

	const closeModal = () => {
		setIsModalVisible(false);
		// Wait for animation to complete before removing from DOM
		setTimeout(() => setShowUnitsModal(false), 200);
	};

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
							onClick={openModal}
							className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-medium cursor-pointer transition-colors duration-200 ease-in-out"
						>
							View All Units
						</Button>
					</div>
					{/* Alert Fetching Component */}
					<div className="bg-white rounded-xl shadow-md p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">
							Fetch Unit Alerts
						</h2>
						<p className="text-gray-600 text-sm mb-4">
							View recent alerts and sensor readings that need attention for a
							specific unit
						</p>
						<AlertFetcher prefilledUnitId={selectedUnitId} />
					</div>

					{/* Random Reading Generator - Development Only */}
					{isDevToolsEnabled && (
						<div className="bg-white rounded-xl shadow-md p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-6">
								Test Sensor Classification
							</h2>
							<RandomReadingGenerator />
						</div>
					)}
				</div>
			</main>

			{/* Units Health Dashboard Modal */}
			{showUnitsModal && (
				<UnitsHealthDashboard
					isVisible={isModalVisible}
					onClose={closeModal}
					onUnitClick={(unitId) => {
						setSelectedUnitId(unitId);
						closeModal();
					}}
				/>
			)}
		</div>
	);
}
