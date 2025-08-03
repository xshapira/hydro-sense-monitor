import { render, screen } from "@testing-library/react"
import { Button } from "~/common/components/button"

describe("Button Component", () => {
  it("renders button with text", () => {
    render(<Button>Click me</Button>)

    const button = screen.getByRole("button", { name: "Click me" })
    expect(button).toBeInTheDocument()
  })
})
