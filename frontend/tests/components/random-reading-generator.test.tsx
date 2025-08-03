import { jest } from "@jest/globals"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RandomReadingGenerator } from "~/common/components/random-reading-generator"
import { api } from "~/lib/api"

// Manual mocking approach for ESM compatibility
const mockSubmitSensorReading = jest.fn() as jest.MockedFunction<typeof api.submitSensorReading>
const mockFetchAlerts = jest.fn() as jest.MockedFunction<typeof api.fetchAlerts>
const mockFetchUnits = jest.fn() as jest.MockedFunction<typeof api.fetchUnits>

// Override the imported api functions with mocks
Object.assign(api, {
  submitSensorReading: mockSubmitSensorReading,
  fetchAlerts: mockFetchAlerts,
  fetchUnits: mockFetchUnits,
})

// Mock Math.random for predictable tests
const mockMath = Object.create(global.Math)
mockMath.random = jest.fn()
global.Math = mockMath

describe("RandomReadingGenerator Component", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(Math.random as jest.Mock).mockReturnValue(0.5)
  })

  it("renders generate button", () => {
    render(<RandomReadingGenerator />)

    expect(screen.getByRole("button", { name: "Generate Random Reading" })).toBeInTheDocument()
  })

  it("generates and displays a healthy reading", async () => {
    // Mock Math.random to generate specific values
    ;(Math.random as jest.Mock)
      .mockReturnValueOnce(0.3) // pH: 4 + 0.3*5 = 5.5
      .mockReturnValueOnce(0.5) // temp: 15 + 0.5*15 = 22.5
      .mockReturnValueOnce(0.4) // ec: 0.5 + 0.4*2.5 = 1.5
      .mockReturnValueOnce(0.123) // unit ID

    mockSubmitSensorReading.mockResolvedValueOnce({
      status: "OK",
      classification: "Healthy",
    })

    render(<RandomReadingGenerator />)

    const button = screen.getByRole("button", {
      name: "Generate Random Reading",
    })
    await userEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText("Generated Reading")).toBeInTheDocument()
    })

    // Check displayed values
    expect(screen.getByText("5.5")).toBeInTheDocument()
    expect(screen.getByText("22.5°C")).toBeInTheDocument()
    expect(screen.getByText("1.5 mS/cm")).toBeInTheDocument()

    // Check classification
    expect(screen.getByText("Status: OK")).toBeInTheDocument()
    expect(screen.getByText("Healthy")).toBeInTheDocument()

    // Verify API was called correctly
    expect(mockSubmitSensorReading).toHaveBeenCalledWith({
      unitId: "unit-123",
      timestamp: expect.any(String),
      readings: { pH: 5.5, temp: 22.5, ec: 1.5 },
    })
  })

  it("generates and displays a needs attention reading", async () => {
    // Mock Math.random to generate values outside healthy range
    ;(Math.random as jest.Mock)
      .mockReturnValueOnce(0.8) // pH: 4 + 0.8*5 = 8.0 (needs attention)
      .mockReturnValueOnce(0.4) // temp: 15 + 0.4*15 = 21
      .mockReturnValueOnce(0.6) // ec: 0.5 + 0.6*2.5 = 2.0
      .mockReturnValueOnce(0.456) // unit ID

    mockSubmitSensorReading.mockResolvedValueOnce({
      status: "OK",
      classification: "Needs Attention",
    })

    render(<RandomReadingGenerator />)

    const button = screen.getByRole("button", {
      name: "Generate Random Reading",
    })
    await userEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText("Classification Result")).toBeInTheDocument()
    })

    // Check classification is displayed with correct styling
    const classificationElement = screen.getByText("Needs Attention")
    expect(classificationElement).toHaveClass("bg-red-100", "text-red-700")
  })

  it("shows loading state while sending", async () => {
    mockSubmitSensorReading.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ status: "OK", classification: "Healthy" }), 100),
        ),
    )

    render(<RandomReadingGenerator />)

    const button = screen.getByRole("button", {
      name: "Generate Random Reading",
    })
    await userEvent.click(button)

    expect(screen.getByText("Sending...")).toBeInTheDocument()
    expect(button).toBeDisabled()

    await waitFor(() => {
      expect(screen.queryByText("Sending...")).not.toBeInTheDocument()
    })
  })

  it("handles API errors", async () => {
    mockSubmitSensorReading.mockRejectedValueOnce(new Error("API Error"))

    render(<RandomReadingGenerator />)

    const button = screen.getByRole("button", {
      name: "Generate Random Reading",
    })
    await userEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText("API Error")).toBeInTheDocument()
    })

    // Should not display any results
    expect(screen.queryByText("Generated Reading")).not.toBeInTheDocument()
    expect(screen.queryByText("Classification Result")).not.toBeInTheDocument()
  })

  it("generates values within expected ranges", async () => {
    // Test multiple random values to ensure ranges are correct
    const randomValues = [0, 0.25, 0.5, 0.75, 1]

    for (const value of randomValues) {
      ;(Math.random as jest.Mock)
        .mockReturnValueOnce(value) // pH
        .mockReturnValueOnce(value) // temp
        .mockReturnValueOnce(value) // ec
        .mockReturnValueOnce(0.5) // unit ID

      mockSubmitSensorReading.mockResolvedValueOnce({
        status: "OK",
        classification: "Healthy",
      })

      const { unmount } = render(<RandomReadingGenerator />)

      const button = screen.getByRole("button", {
        name: "Generate Random Reading",
      })
      await userEvent.click(button)

      await waitFor(() => {
        expect(mockSubmitSensorReading).toHaveBeenCalled()
      })

      const lastCall = mockSubmitSensorReading.mock.calls[
        mockSubmitSensorReading.mock.calls.length - 1
      ][0] as Parameters<typeof mockSubmitSensorReading>[0]
      const { pH, temp, ec } = lastCall.readings

      // Check ranges
      expect(pH).toBeGreaterThanOrEqual(4)
      expect(pH).toBeLessThanOrEqual(9)
      expect(temp).toBeGreaterThanOrEqual(15)
      expect(temp).toBeLessThanOrEqual(30)
      expect(ec).toBeGreaterThanOrEqual(0.5)
      expect(ec).toBeLessThanOrEqual(3.0)

      unmount()
    }
  })
})
