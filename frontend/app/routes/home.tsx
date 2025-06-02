import { AlertFetcher } from "../common/components/alert-fetcher";
import { RandomReadingGenerator } from "../common/components/random-reading-generator";
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
	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow-sm border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<h1 className="text-2xl font-semibold text-gray-900">
							HydroSense Monitor
						</h1>
						<div className="text-sm text-gray-500">
							Monitoring hydroponic pods
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="space-y-8">
					{/* Dashboard Section */}
					<section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 className="text-lg font-medium text-gray-900 mb-4">
							Sensor Dashboard
						</h2>
						<p className="text-gray-600">
							Monitor pH, temperature, and conductivity readings from your
							hydroponic units.
						</p>

						{/* Components will be added here */}
						<div className="mt-6 space-y-6">
							{/* Alert Fetching Component */}
							<AlertFetcher />

							{/* Random Reading Generator */}
							<RandomReadingGenerator />
						</div>
					</section>
				</div>
			</main>
		</div>
	);
}
