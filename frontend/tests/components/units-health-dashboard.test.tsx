import { jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnitsHealthDashboard } from "~/common/components/units-health-dashboard";
import { api } from "~/lib/api";
import type { UnitStatus } from "~/lib/api";

// Manual mocking approach for ESM compatibility
const mockFetchUnits = jest.fn() as jest.MockedFunction<typeof api.fetchUnits>;
const mockFetchAlerts = jest.fn() as jest.MockedFunction<
	typeof api.fetchAlerts
>;
const mockSubmitSensorReading = jest.fn() as jest.MockedFunction<
	typeof api.submitSensorReading
>;

// Override the imported api functions with mocks
Object.assign(api, {
	fetchUnits: mockFetchUnits,
	fetchAlerts: mockFetchAlerts,
	submitSensorReading: mockSubmitSensorReading,
});

describe("UnitsHealthDashboard Component", () => {
	const mockUnits: UnitStatus[] = [
		{
			unitId: "unit-1",
			healthStatus: "healthy",
			totalReadings: 10,
			alertsCount: 0,
			lastReading: {
				unitId: "unit-1",
				timestamp: "2025-05-24T12:00:00Z",
				readings: { pH: 6.5, temp: 22, ec: 1.2 },
				classification: "Healthy",
			},
		},
		{
			unitId: "unit-2",
			healthStatus: "warning",
			totalReadings: 15,
			alertsCount: 3,
			lastReading: {
				unitId: "unit-2",
				timestamp: "2025-05-24T12:30:00Z",
				readings: { pH: 7.2, temp: 23, ec: 1.5 },
				classification: "Needs Attention",
			},
		},
		{
			unitId: "unit-3",
			healthStatus: "critical",
			totalReadings: 8,
			alertsCount: 6,
			lastReading: null,
		},
	];

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("shows loading state initially", () => {
		mockFetchUnits.mockImplementation(
			() =>
				new Promise((resolve) =>
					setTimeout(() => resolve({ units: mockUnits, totalUnits: 3 }), 100),
				),
		);

		render(<UnitsHealthDashboard isVisible={true} />);

		expect(screen.getByText("Loading units...")).toBeInTheDocument();
	});

	it("displays units after loading", async () => {
		mockFetchUnits.mockResolvedValueOnce({
			units: mockUnits,
			totalUnits: 3,
		});

		render(<UnitsHealthDashboard isVisible={true} />);

		await waitFor(() => {
			expect(screen.getByText("unit-1")).toBeInTheDocument();
		});

		// Check all units are displayed
		expect(screen.getByText("unit-1")).toBeInTheDocument();
		expect(screen.getByText("unit-2")).toBeInTheDocument();
		expect(screen.getByText("unit-3")).toBeInTheDocument();

		// Check health status badges
		expect(screen.getByText("HEALTHY")).toBeInTheDocument();
		expect(screen.getByText("WARNING")).toBeInTheDocument();
		expect(screen.getByText("CRITICAL")).toBeInTheDocument();
	});

	it("displays unit details correctly", async () => {
		mockFetchUnits.mockResolvedValueOnce({
			units: [mockUnits[0]],
			totalUnits: 1,
		});

		render(<UnitsHealthDashboard isVisible={true} />);

		await waitFor(() => {
			expect(screen.getByText("unit-1")).toBeInTheDocument();
		});

		// Check unit details
		expect(screen.getByText("Total Readings:")).toBeInTheDocument();
		expect(screen.getByText("10")).toBeInTheDocument();
		expect(screen.getByText("Alerts Count:")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();

		// Check last reading details
		expect(screen.getByText("pH:")).toBeInTheDocument();
		expect(screen.getByText("6.5")).toBeInTheDocument();
		expect(screen.getByText("Temp:")).toBeInTheDocument();
		expect(screen.getByText("22°C")).toBeInTheDocument();
		expect(screen.getByText("EC:")).toBeInTheDocument();
		expect(screen.getByText("1.2")).toBeInTheDocument();
	});

	it("handles unit click", async () => {
		const mockOnUnitClick = jest.fn();
		mockFetchUnits.mockResolvedValueOnce({
			units: mockUnits,
			totalUnits: 3,
		});

		render(
			<UnitsHealthDashboard isVisible={true} onUnitClick={mockOnUnitClick} />,
		);

		await waitFor(() => {
			expect(screen.getByText("unit-1")).toBeInTheDocument();
		});

		const unit1Button = screen.getByRole("button", {
			name: /View details for unit-1/,
		});
		await userEvent.click(unit1Button);

		expect(mockOnUnitClick).toHaveBeenCalledWith("unit-1");
	});

	it("shows empty state when no units", async () => {
		mockFetchUnits.mockResolvedValueOnce({
			units: [],
			totalUnits: 0,
		});

		render(<UnitsHealthDashboard isVisible={true} />);

		await waitFor(() => {
			expect(
				screen.getByText(
					"No units found. Start by submitting sensor readings.",
				),
			).toBeInTheDocument();
		});
	});

	it("handles API errors", async () => {
		mockFetchUnits.mockRejectedValueOnce(new Error("Network error"));

		render(<UnitsHealthDashboard isVisible={true} />);

		await waitFor(() => {
			expect(screen.getByText("Network error")).toBeInTheDocument();
		});
	});

	it("handles refresh", async () => {
		mockFetchUnits
			.mockResolvedValueOnce({ units: mockUnits, totalUnits: 3 })
			.mockResolvedValueOnce({
				units: [
					...mockUnits,
					{
						unitId: "unit-4",
						healthStatus: "healthy",
						totalReadings: 5,
						alertsCount: 0,
						lastReading: null,
					},
				],
				totalUnits: 4,
			});

		render(<UnitsHealthDashboard isVisible={true} />);

		await waitFor(() => {
			expect(screen.getByText("unit-1")).toBeInTheDocument();
		});

		const refreshButton = screen.getByRole("button", { name: "Refresh Units" });
		await userEvent.click(refreshButton);

		await waitFor(() => {
			expect(screen.getByText("unit-4")).toBeInTheDocument();
		});

		expect(mockFetchUnits).toHaveBeenCalledTimes(2);
	});

	it("handles close when onClose is provided", async () => {
		const mockOnClose = jest.fn();
		mockFetchUnits.mockResolvedValueOnce({ units: mockUnits, totalUnits: 3 });

		render(<UnitsHealthDashboard isVisible={true} onClose={mockOnClose} />);

		await waitFor(() => {
			expect(screen.getByText("unit-1")).toBeInTheDocument();
		});

		const closeButton = screen.getByRole("button", { name: "Close" });
		await userEvent.click(closeButton);

		expect(mockOnClose).toHaveBeenCalled();
	});

	it("handles pagination with many units", async () => {
		// Create 12 units to test pagination (more than 9 per page)
		const manyUnits = Array.from({ length: 12 }, (_, i) => ({
			unitId: `unit-${i + 1}`,
			healthStatus: "healthy" as const,
			totalReadings: 10,
			alertsCount: 0,
			lastReading: null,
		}));

		mockFetchUnits.mockResolvedValueOnce({
			units: manyUnits,
			totalUnits: 12,
		});

		render(<UnitsHealthDashboard isVisible={true} />);

		await waitFor(() => {
			expect(screen.getByText("unit-1")).toBeInTheDocument();
		});

		// Should show first 9 units
		expect(screen.getByText("unit-1")).toBeInTheDocument();
		expect(screen.getByText("unit-9")).toBeInTheDocument();
		expect(screen.queryByText("unit-10")).not.toBeInTheDocument();

		// Check pagination info
		expect(screen.getByText("Showing 1-9 of 12 units")).toBeInTheDocument();

		// Navigate to page 2
		const nextButton = screen.getByRole("button", { name: "Next page" });
		await userEvent.click(nextButton);

		// Should show remaining units
		expect(screen.queryByText("unit-1")).not.toBeInTheDocument();
		expect(screen.getByText("unit-10")).toBeInTheDocument();
		expect(screen.getByText("unit-12")).toBeInTheDocument();
		expect(screen.getByText("Showing 10-12 of 12 units")).toBeInTheDocument();
	});

	it("applies correct styling based on health status", async () => {
		mockFetchUnits.mockResolvedValueOnce({
			units: mockUnits,
			totalUnits: 3,
		});

		render(<UnitsHealthDashboard isVisible={true} />);

		await waitFor(() => {
			expect(screen.getByText("unit-1")).toBeInTheDocument();
		});

		// Check unit cards have correct classes
		const unit1Button = screen.getByRole("button", {
			name: /View details for unit-1/,
		});
		const unit2Button = screen.getByRole("button", {
			name: /View details for unit-2/,
		});
		const unit3Button = screen.getByRole("button", {
			name: /View details for unit-3/,
		});

		expect(unit1Button).toHaveClass(
			"bg-green-100",
			"border-green-300",
			"text-green-900",
		);
		expect(unit2Button).toHaveClass(
			"bg-yellow-100",
			"border-yellow-300",
			"text-yellow-900",
		);
		expect(unit3Button).toHaveClass(
			"bg-red-100",
			"border-red-300",
			"text-red-900",
		);
	});
});
