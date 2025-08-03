import { useEffect, useState } from "react"
import type { Alert, AlertsResponse } from "../../lib/api"
import { api } from "../../lib/api"
import { Button } from "./button"
import { Input } from "./input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table"

interface AlertFetcherProps {
  prefilledUnitId?: string
}

export function AlertFetcher({ prefilledUnitId }: AlertFetcherProps) {
  const [unitId, setUnitId] = useState("")
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [alertsResponse, setAlertsResponse] = useState<AlertsResponse | null>(null)

  // Update unitId when prefilledUnitId changes
  useEffect(() => {
    if (prefilledUnitId) {
      setUnitId(prefilledUnitId)
    }
  }, [prefilledUnitId])

  const fetchAlerts = async () => {
    if (!unitId.trim()) {
      setError("Please enter a unit ID")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await api.fetchAlerts(unitId)
      setAlerts(response.alerts)
      setAlertsResponse(response)
      setHasSearched(true)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to fetch alerts")
      }
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    const seconds = date.getSeconds().toString().padStart(2, "0")

    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col gap-4">
          <Input
            type="text"
            placeholder="Unit ID"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                fetchAlerts()
              }
            }}
            className="w-full h-12 text-base text-gray-900 placeholder:text-gray-500 focus-visible:border-emerald-300 focus-visible:ring-emerald-200"
          />
          <Button
            onClick={fetchAlerts}
            disabled={loading}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-medium cursor-pointer transition-colors duration-200 ease-in-out"
          >
            {loading ? "Loading..." : "Fetch Alerts"}
          </Button>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {hasSearched && alerts.length === 0 && !error && alertsResponse && (
        <div
          className={`mt-6 p-4 rounded-lg ${
            alertsResponse.unitExists ? "bg-green-50" : "bg-red-50"
          }`}
        >
          <p
            className={`text-sm text-center ${
              alertsResponse.unitExists ? "text-green-600" : "text-red-600"
            }`}
          >
            {alertsResponse.unitExists
              ? `No alerts found for unit "${unitId}". This unit has no issues.`
              : `No alerts found for unit "${unitId}". This unit doesn't exist.`}
          </p>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="mt-6">
          <h4 className="text-base font-medium text-gray-700 mb-3">Recent Alerts for {unitId}</h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm whitespace-nowrap text-gray-700 font-medium">
                      Timestamp
                    </TableHead>
                    <TableHead className="text-sm text-gray-700 font-medium">pH</TableHead>
                    <TableHead className="text-sm text-gray-700 font-medium">
                      Temperature (°C)
                    </TableHead>
                    <TableHead className="text-sm text-gray-700 font-medium">EC (mS/cm)</TableHead>
                    <TableHead className="text-sm text-gray-700 font-medium">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert, index) => (
                    <TableRow key={`${alert.unitId}-${alert.timestamp}-${index}`}>
                      <TableCell className="text-sm text-gray-900">
                        {formatTimestamp(alert.timestamp)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-900">{alert.readings.pH}</TableCell>
                      <TableCell className="text-sm text-gray-900">{alert.readings.temp}</TableCell>
                      <TableCell className="text-sm text-gray-900">{alert.readings.ec}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            alert.classification === "Healthy"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {alert.classification}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
