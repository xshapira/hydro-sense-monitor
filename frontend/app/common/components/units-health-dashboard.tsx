import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { UnitStatus } from "../../lib/api";
import { Button } from "./button";

interface UnitsHealthDashboardProps {
	onUnitClick?: (unitId: string) => void;
	onClose?: () => void;
	isVisible: boolean;
}

export function UnitsHealthDashboard({
	onUnitClick,
	onClose,
	isVisible,
}: UnitsHealthDashboardProps) {
	const [units, setUnits] = useState<UnitStatus[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 9; // 3x3 grid

	useEffect(() => {
		fetchUnits();
	}, []);

	const fetchUnits = async (isRefresh = false) => {
		if (isRefresh) {
			setRefreshing(true);
		} else {
			setLoading(true);
		}
		setError(null);

		try {
			const response = await api.fetchUnits();
			setUnits(response.units);
		} catch (err) {
			if (err instanceof Error) {
				setError(err.message);
			} else {
				setError("Failed to fetch units");
			}
		} finally {
			if (isRefresh) {
				setRefreshing(false);
			} else {
				setLoading(false);
			}
		}
	};

	const getHealthColor = (status: UnitStatus["healthStatus"]) => {
		switch (status) {
			case "healthy":
				return "bg-green-100 border-green-300 text-green-900";
			case "warning":
				return "bg-yellow-100 border-yellow-300 text-yellow-900";
			case "critical":
				return "bg-red-100 border-red-300 text-red-900";
		}
	};

	const getHealthBadgeColor = (status: UnitStatus["healthStatus"]) => {
		switch (status) {
			case "healthy":
				return "bg-green-500 text-white";
			case "warning":
				return "bg-yellow-500 text-white";
			case "critical":
				return "bg-red-500 text-white";
		}
	};

	const formatTimestamp = (timestamp: string) => {
		return new Date(timestamp).toLocaleString();
	};

	// Pagination calculations
	const totalPages = Math.ceil(units.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentUnits = units.slice(startIndex, endIndex);

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose?.();
		}
	};

	const handleBackdropKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			onClose?.();
		}
	};

	return (
		<div
			className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ease-in-out ${
				isVisible ? "opacity-100" : "opacity-0"
			}`}
			onClick={handleBackdropClick}
			onKeyDown={handleBackdropKeyDown}
			tabIndex={-1}
		>
			<div
				className={`bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
					isVisible
						? "opacity-100 scale-100 translate-y-0"
						: "opacity-0 scale-95 translate-y-4"
				}`}
			>
				<div className="p-6 border-b border-gray-200">
					<div className="flex items-center justify-between">
						<h2 className="text-2xl font-semibold text-gray-900">
							All Units Health Status
						</h2>
						{onClose && (
							<button
								type="button"
								onClick={onClose}
								className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors cursor-pointer"
								aria-label="Close"
							>
								<svg
									className="w-6 h-6"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						)}
					</div>
					{error && <p className="text-sm text-red-600 mt-2">{error}</p>}
				</div>

				<div className="flex-1 overflow-y-auto p-6">
					{loading ? (
						<div className="text-center py-12">
							<p className="text-gray-500">Loading units...</p>
						</div>
					) : units.length === 0 ? (
						<div className="text-center py-12">
							<p className="text-gray-500">
								No units found. Start by submitting sensor readings.
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
							{currentUnits.map((unit) => (
								<button
									key={unit.unitId}
									type="button"
									className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg w-full text-left ${getHealthColor(
										unit.healthStatus,
									)}`}
									onClick={() => onUnitClick?.(unit.unitId)}
									aria-label={`View details for ${unit.unitId}`}
								>
									<div className="flex items-start justify-between mb-3">
										<h3 className="font-semibold text-lg">{unit.unitId}</h3>
										<span
											className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthBadgeColor(
												unit.healthStatus,
											)}`}
										>
											{unit.healthStatus.toUpperCase()}
										</span>
									</div>

									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-gray-600">Total Readings:</span>
											<span className="font-medium">{unit.totalReadings}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-600">Alerts Count:</span>
											<span className="font-medium">{unit.alertsCount}</span>
										</div>

										{unit.lastReading && (
											<>
												<div className="pt-2 border-t border-gray-200 mt-2">
													<p className="text-xs text-gray-600 mb-1">
														Last Reading:
													</p>
													<p className="text-xs">
														{formatTimestamp(unit.lastReading.timestamp)}
													</p>
												</div>
												<div className="grid grid-cols-3 gap-2 text-xs">
													<div>
														<span className="text-gray-600">pH:</span>
														<p className="font-medium">
															{unit.lastReading.readings.pH}
														</p>
													</div>
													<div>
														<span className="text-gray-600">Temp:</span>
														<p className="font-medium">
															{unit.lastReading.readings.temp}°C
														</p>
													</div>
													<div>
														<span className="text-gray-600">EC:</span>
														<p className="font-medium">
															{unit.lastReading.readings.ec}
														</p>
													</div>
												</div>
											</>
										)}
									</div>
								</button>
							))}
						</div>
					)}
				</div>

				<div className="p-4 border-t border-gray-200 bg-gray-50">
					<Button
						onClick={() => fetchUnits(true)}
						disabled={refreshing}
						className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-base font-medium cursor-pointer transition-colors duration-200 ease-in-out"
					>
						{refreshing ? "Refreshing..." : "Refresh Units"}
					</Button>
				</div>
			</div>
		</div>
	);
}
