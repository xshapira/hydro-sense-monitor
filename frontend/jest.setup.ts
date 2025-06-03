// Jest setup file
import "@testing-library/jest-dom";

// Simple fetch polyfill for Jest environment
if (!global.fetch) {
	global.fetch = async () => {
		throw new Error("fetch should be mocked in tests");
	};
}
