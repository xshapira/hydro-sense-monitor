/** @type {import('jest').Config} */
export default {
	preset: "ts-jest",
	testEnvironment: "jsdom",
	rootDir: ".",
	extensionsToTreatAsEsm: [".ts", ".tsx"],
	moduleNameMapper: {
		"^~/(.*)$": "<rootDir>/app/$1",
		"\\.(css|scss|sass)$": "identity-obj-proxy",
	},
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
