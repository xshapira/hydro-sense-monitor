import { jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlertFetcher } from "~/common/components/alert-fetcher";
import { api } from "~/lib/api";

// Manual mocking approach for ESM compatibility
const mockFetchAlerts = jest.fn() as jest.MockedFunction<
	typeof api.fetchAlerts
>;
const mockSubmitSensorReading = jest.fn() as jest.MockedFunction<
	typeof api.submitSensorReading
>;
const mockFetchUnits = jest.fn() as jest.MockedFunction<typeof api.fetchUnits>;

// Override the imported api functions with mocks
Object.assign(api, {
	fetchAlerts: mockFetchAlerts,
	submitSensorReading: mockSubmitSensorReading,
	fetchUnits: mockFetchUnits,
});

describe("AlertFetcher Component", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("renders input and button", () => {
		render(<AlertFetcher />);

		expect(screen.getByPlaceholderText("Unit ID")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Fetch Alerts" }),
		).toBeInTheDocument();
	});

	it("shows error when submitting empty unit ID", async () => {
		render(<AlertFetcher />);

		const button = screen.getByRole("button", { name: "Fetch Alerts" });
		await userEvent.click(button);

		expect(screen.getByText("Please enter a unit ID")).toBeInTheDocument();
		expect(mockFetchAlerts).not.toHaveBeenCalled();
	});

	it("fetches and displays alerts successfully", async () => {
		const mockAlerts = [
			{
				unitId: "unit-123",
				timestamp: "2025-05-24T12:00:00Z",
				readings: { pH: 8.5, temp: 22.1, ec: 1.2 },
				classification: "Needs Attention" as const,
			},
			{
				unitId: "unit-123",
				timestamp: "2025-05-24T11:00:00Z",
				readings: { pH: 4.0, temp: 21.5, ec: 1.1 },
				classification: "Needs Attention" as const,
			},
		];

		mockFetchAlerts.mockResolvedValueOnce({
			unitId: "unit-123",
			alerts: mockAlerts,
			unitExists: true,
			totalReadings: 5,
		});

		render(<AlertFetcher />);

		const input = screen.getByPlaceholderText("Unit ID");
		await userEvent.type(input, "unit-123");

		const button = screen.getByRole("button", { name: "Fetch Alerts" });
		await userEvent.click(button);

		await waitFor(() => {
			expect(
				screen.getByText("Recent Alerts for unit-123"),
			).toBeInTheDocument();
		});

		// Check table headers
		expect(screen.getByText("pH")).toBeInTheDocument();
		expect(screen.getByText("Temperature (°C)")).toBeInTheDocument();
		expect(screen.getByText("EC (mS/cm)")).toBeInTheDocument();
		expect(screen.getByText("Status")).toBeInTheDocument();

		// Check alert data
		expect(screen.getByText("8.5")).toBeInTheDocument();
		expect(screen.getByText("22.1")).toBeInTheDocument();
		expect(screen.getByText("1.2")).toBeInTheDocument();
		expect(screen.getAllByText("Needs Attention")).toHaveLength(2);
	});

	it("shows green message when unit exists but has no alerts", async () => {
		mockFetchAlerts.mockResolvedValueOnce({
			unitId: "unit-456",
			alerts: [],
			unitExists: true,
			totalReadings: 3,
		});

		render(<AlertFetcher />);

		const input = screen.getByPlaceholderText("Unit ID");
		await userEvent.type(input, "unit-456");

		const button = screen.getByRole("button", { name: "Fetch Alerts" });
		await userEvent.click(button);

		await waitFor(() => {
			expect(
				screen.getByText(
					'No alerts found for unit "unit-456". This unit has no issues.',
				),
			).toBeInTheDocument();
		});

		// Check that it's displayed with green styling
		const messageContainer = screen.getByText(
			'No alerts found for unit "unit-456". This unit has no issues.',
		).parentElement;
		expect(messageContainer).toHaveClass("bg-green-50");
	});

	it("shows red message when unit doesn't exist", async () => {
		mockFetchAlerts.mockResolvedValueOnce({
			unitId: "unit-nonexistent",
			alerts: [],
			unitExists: false,
			totalReadings: 0,
		});

		render(<AlertFetcher />);

		const input = screen.getByPlaceholderText("Unit ID");
		await userEvent.type(input, "unit-nonexistent");

		const button = screen.getByRole("button", { name: "Fetch Alerts" });
		await userEvent.click(button);

		await waitFor(() => {
			expect(
				screen.getByText(
					'No alerts found for unit "unit-nonexistent". This unit doesn\'t exist.',
				),
			).toBeInTheDocument();
		});

		// Check that it's displayed with red styling
		const messageContainer = screen.getByText(
			'No alerts found for unit "unit-nonexistent". This unit doesn\'t exist.',
		).parentElement;
		expect(messageContainer).toHaveClass("bg-red-50");
	});

	it("handles API errors gracefully", async () => {
		mockFetchAlerts.mockRejectedValueOnce(new Error("Network error"));

		render(<AlertFetcher />);

		const input = screen.getByPlaceholderText("Unit ID");
		await userEvent.type(input, "unit-789");

		const button = screen.getByRole("button", { name: "Fetch Alerts" });
		await userEvent.click(button);

		await waitFor(() => {
			expect(screen.getByText("Network error")).toBeInTheDocument();
		});
	});

	it("shows loading state while fetching", async () => {
		mockFetchAlerts.mockImplementation(
			() =>
				new Promise((resolve) =>
					setTimeout(
						() =>
							resolve({
								unitId: "unit-123",
								alerts: [],
								unitExists: true,
								totalReadings: 2,
							}),
						100,
					),
				),
		);

		render(<AlertFetcher />);

		const input = screen.getByPlaceholderText("Unit ID");
		await userEvent.type(input, "unit-123");

		const button = screen.getByRole("button", { name: "Fetch Alerts" });
		await userEvent.click(button);

		expect(screen.getByText("Loading...")).toBeInTheDocument();
		expect(button).toBeDisabled();

		await waitFor(() => {
			expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
		});
	});

	it("prefills unit ID when provided", () => {
		render(<AlertFetcher prefilledUnitId="unit-prefilled" />);

		const input = screen.getByPlaceholderText("Unit ID") as HTMLInputElement;
		expect(input.value).toBe("unit-prefilled");
	});

	it("allows fetching alerts by pressing Enter", async () => {
		mockFetchAlerts.mockResolvedValueOnce({
			unitId: "unit-123",
			alerts: [],
			unitExists: false,
			totalReadings: 0,
		});

		render(<AlertFetcher />);

		const input = screen.getByPlaceholderText("Unit ID");
		await userEvent.type(input, "unit-123");

		fireEvent.keyDown(input, { key: "Enter" });

		await waitFor(() => {
			expect(mockFetchAlerts).toHaveBeenCalledWith("unit-123");
		});
	});
});
