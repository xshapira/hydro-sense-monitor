import { useState } from "react"
import type { ClassificationStatus, SensorReading } from "../../lib/api"
import { api } from "../../lib/api"
import { Button } from "./button"

export function RandomReadingGenerator() {
  const [lastReading, setLastReading] = useState<SensorReading | null>(null)
  const [classification, setClassification] = useState<ClassificationStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateRandomReading = (): SensorReading => {
    // pH 4-9: typical hydroponic range (not full 0-14) to generate realistic test data
    const pH = Number((Math.random() * 5 + 4).toFixed(1))

    // Temp 15-30°C: greenhouse conditions, not the full -10 to 60°C backend range
    const temp = Number((Math.random() * 15 + 15).toFixed(1))

    // EC 0.5-3.0: covers lettuce (0.8) to tomatoes (3.0) nutrient needs
    const ec = Number((Math.random() * 2.5 + 0.5).toFixed(1))

    return { pH, temp, ec }
  }

  const sendRandomReading = async () => {
    setLoading(true)
    setError(null)

    const reading = generateRandomReading()
    setLastReading(reading)

    try {
      // Generate a unique unit ID for testing
      const unitId = `unit-${Math.floor(Math.random() * 1000)}`

      const response = await api.submitSensorReading({
        unitId,
        timestamp: new Date().toISOString(),
        readings: reading,
      })

      setClassification(response)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to send reading")
      }
      setClassification(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Button
          onClick={sendRandomReading}
          disabled={loading}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-medium cursor-pointer transition-colors duration-200 ease-in-out"
        >
          {loading ? "Sending..." : "Generate Random Reading"}
        </Button>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {lastReading && classification && (
        <div className="space-y-6 mt-6">
          <div>
            <h4 className="text-base font-medium text-gray-700 mb-4">Generated Reading</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">pH</span>
                <span className="font-medium text-gray-900 text-sm">{lastReading.pH}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Temp</span>
                <span className="font-medium text-gray-900 text-sm">{lastReading.temp}°C</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">EC</span>
                <span className="font-medium text-gray-900 text-sm">{lastReading.ec} mS/cm</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-base font-medium text-gray-700 mb-3">Classification Result</h4>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">Status: {classification.status}</span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  classification.classification === "Healthy"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {classification.classification}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
