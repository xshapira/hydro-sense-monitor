import { jest } from "@jest/globals"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { api } from "~/lib/api"
import Home from "~/routes/home"

// Manual mocking approach for ESM compatibility
const mockFetchUnits = jest.fn() as jest.MockedFunction<typeof api.fetchUnits>
const mockFetchAlerts = jest.fn() as jest.MockedFunction<typeof api.fetchAlerts>
const mockSubmitSensorReading = jest.fn() as jest.MockedFunction<typeof api.submitSensorReading>

// Override the imported api functions with mocks
Object.assign(api, {
  fetchUnits: mockFetchUnits,
  fetchAlerts: mockFetchAlerts,
  submitSensorReading: mockSubmitSensorReading,
})

// Mock import.meta.env
const mockEnv = {
  VITE_SHOW_DEV_TOOLS: "false",
}

Object.defineProperty(import.meta, "env", {
  value: mockEnv,
  writable: true,
  configurable: true,
})

describe("Home Page Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEnv.VITE_SHOW_DEV_TOOLS = "false"
    // Reset all mocks to have no implementations
    mockFetchUnits.mockReset()
    mockFetchAlerts.mockReset()
    mockSubmitSensorReading.mockReset()
  })

  it("renders main components", () => {
    render(<Home />)

    // Check header
    expect(screen.getByText("HydroSense Monitor")).toBeInTheDocument()

    // Check sections
    expect(screen.getByText("Units Overview")).toBeInTheDocument()
    expect(screen.getByText("Fetch Unit Alerts")).toBeInTheDocument()

    // Check buttons
    expect(screen.getByRole("button", { name: "View All Units" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Fetch Alerts" })).toBeInTheDocument()
  })

  it("opens units dashboard modal when View All Units is clicked", async () => {
    mockFetchUnits.mockResolvedValueOnce({
      units: [
        {
          unitId: "unit-1",
          healthStatus: "healthy",
          totalReadings: 10,
          alertsCount: 0,
          lastReading: null,
        },
      ],
      totalUnits: 1,
    })

    render(<Home />)

    const viewUnitsButton = screen.getByRole("button", {
      name: "View All Units",
    })
    await userEvent.click(viewUnitsButton)

    await waitFor(() => {
      expect(screen.getByText("All Units Health Status")).toBeInTheDocument()
      expect(screen.getByText("unit-1")).toBeInTheDocument()
    })
  })

  it("prefills unit ID in alert fetcher when unit is clicked in dashboard", async () => {
    mockFetchUnits.mockResolvedValueOnce({
      units: [
        {
          unitId: "unit-123",
          healthStatus: "warning",
          totalReadings: 5,
          alertsCount: 2,
          lastReading: null,
        },
      ],
      totalUnits: 1,
    })

    mockFetchAlerts.mockResolvedValueOnce({
      unitId: "unit-123",
      alerts: [],
      unitExists: true,
      totalReadings: 5,
    })

    render(<Home />)

    // Open units dashboard
    const viewUnitsButton = screen.getByRole("button", {
      name: "View All Units",
    })
    await userEvent.click(viewUnitsButton)

    await waitFor(() => {
      expect(screen.getByText("unit-123")).toBeInTheDocument()
    })

    // Click on unit
    const unitButton = screen.getByRole("button", {
      name: /View details for unit-123/,
    })
    await userEvent.click(unitButton)

    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByText("All Units Health Status")).not.toBeInTheDocument()
    })

    // Check unit ID is prefilled in alert fetcher
    const unitInput = screen.getByPlaceholderText("Unit ID") as HTMLInputElement
    expect(unitInput.value).toBe("unit-123")
  })

  it("closes modal when close button is clicked", async () => {
    mockFetchUnits.mockResolvedValueOnce({
      units: [],
      totalUnits: 0,
    })

    render(<Home />)

    const viewUnitsButton = screen.getByRole("button", {
      name: "View All Units",
    })
    await userEvent.click(viewUnitsButton)

    await waitFor(() => {
      expect(screen.getByText("All Units Health Status")).toBeInTheDocument()
    })

    const closeButton = screen.getByRole("button", { name: "Close" })
    await userEvent.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText("All Units Health Status")).not.toBeInTheDocument()
    })
  })

  it("shows random reading generator when dev tools are enabled", () => {
    render(<Home showDevTools={true} />)

    expect(screen.getByText("Test Sensor Classification")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Generate Random Reading" })).toBeInTheDocument()
  })

  it("hides random reading generator when dev tools are disabled", () => {
    render(<Home showDevTools={false} />)

    expect(screen.queryByText("Test Sensor Classification")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Generate Random Reading" }),
    ).not.toBeInTheDocument()
  })

  it("fetches alerts when user enters unit ID and clicks Fetch Alerts", async () => {
    const mockAlerts = [
      {
        unitId: "unit-456",
        timestamp: "2025-05-24T12:00:00Z",
        readings: { pH: 8.5, temp: 22.1, ec: 1.2 },
        classification: "Needs Attention" as const,
      },
    ]

    mockFetchAlerts.mockResolvedValueOnce({
      unitId: "unit-456",
      alerts: mockAlerts,
      unitExists: true,
      totalReadings: 8,
    })

    render(<Home />)

    const unitInput = screen.getByPlaceholderText("Unit ID")
    await userEvent.type(unitInput, "unit-456")

    const fetchButton = screen.getByRole("button", { name: "Fetch Alerts" })
    await userEvent.click(fetchButton)

    await waitFor(() => {
      expect(screen.getByText("Recent Alerts for unit-456")).toBeInTheDocument()
      expect(screen.getByText("8.5")).toBeInTheDocument() // pH value
    })
  })

  it("handles error when fetching alerts fails", async () => {
    mockFetchAlerts.mockRejectedValueOnce(new Error("Network error"))

    render(<Home />)

    const unitInput = screen.getByPlaceholderText("Unit ID")
    await userEvent.type(unitInput, "unit-789")

    const fetchButton = screen.getByRole("button", { name: "Fetch Alerts" })
    await userEvent.click(fetchButton)

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument()
    })
  })
})
