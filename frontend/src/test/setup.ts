import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

class MockEventSource {
  addEventListener() {}
  close() {}
}

vi.stubGlobal("EventSource", MockEventSource);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
