/** @type {import('jest').Config} */
export default {
	preset: "ts-jest",
	testEnvironment: "jsdom",
	rootDir: ".",
	extensionsToTreatAsEsm: [".ts", ".tsx"],
	globals: {
		"import.meta": {
			env: {
				VITE_API_URL: "http://127.0.0.1:8000/api/v1",
				VITE_SHOW_DEV_TOOLS: "true",
			},
		},
	},
	moduleNameMapper: {
		"^~/(.*)$": "<rootDir>/app/$1",
		"\\.(css|scss|sass)$": "identity-obj-proxy",
	},
	setupFiles: ["<rootDir>/tests/__mocks__/vite-env.ts"],
	setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
	testMatch: ["<rootDir>/tests/**/*.test.(ts|tsx|js)"],
	transform: {
		"^.+\\.(ts|tsx|js|jsx)$": [
			"ts-jest",
			{
				useESM: true,
				tsconfig: {
					jsx: "react-jsx",
				},
			},
		],
	},
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	collectCoverageFrom: [
		"app/**/*.{ts,tsx}",
		"!app/**/*.d.ts",
		"!app/root.tsx",
		"!app/routes.ts",
	],
};
