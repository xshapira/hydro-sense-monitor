import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement } from "react";

// Custom render function that can include providers if needed
const customRender = (
	ui: ReactElement,
	options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { ...options });

// Re-export everything
export * from "@testing-library/react";
export { customRender as render };
