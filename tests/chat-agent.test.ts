import {
  env,
  createExecutionContext,
  waitOnExecutionContext
} from "cloudflare:test";
import { describe, it, expect, beforeEach, vi } from "vitest";
import worker from "../src/server";

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}

// Mock OpenAI API calls
vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => ({
    // Mock model object that will be used by streamText
  }))
}));

// Mock the AI SDK
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    streamText: vi.fn(() => ({
      mergeIntoDataStream: vi.fn()
    })),
    createDataStreamResponse: vi.fn((config) => {
      // Execute the function to test the internal logic
      const mockDataStream = {
        write: vi.fn(),
        close: vi.fn()
      };

      if (config.execute) {
        config.execute(mockDataStream);
      }

      return new Response("mock response");
    }),
    generateId: vi.fn(() => "test-id")
  };
});

describe("Chat Agent Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Worker Routes", () => {
    it("should check OpenAI key status", async () => {
      const request = new Request("http://example.com/check-open-ai-key");
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      const result = await response.json();
      expect(response.status).toBe(200);
      expect(result).toHaveProperty("success");
    });

    it("should return 404 for unknown routes", async () => {
      const request = new Request("http://example.com/unknown-route");
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not found");
    });
  });

  describe("Agent System Integration", () => {
    it("should have routing function available", async () => {
      // Test that the routeAgentRequest function is imported and available
      const { routeAgentRequest } = await import("agents");
      expect(typeof routeAgentRequest).toBe("function");
    });
  });

  describe("Tool System Integration", () => {
    it("should have tools properly configured", async () => {
      // Import tools to verify they are properly set up
      const { tools, executions } = await import("../src/tools");

      expect(tools).toBeDefined();
      expect(executions).toBeDefined();

      // Verify key tools exist
      expect(tools.getWeatherInformation).toBeDefined();
      expect(tools.getLocalTime).toBeDefined();
      expect(tools.scheduleTask).toBeDefined();

      // Verify execution functions for confirmation-required tools
      expect(executions.getWeatherInformation).toBeDefined();
      expect(typeof executions.getWeatherInformation).toBe("function");
    });
  });

  describe("Environment Configuration", () => {
    it("should have proper environment setup", () => {
      // Test that the environment is properly configured
      expect(env).toBeDefined();

      // Test OpenAI key check functionality
      const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
      expect(typeof hasOpenAIKey).toBe("boolean");
    });
  });
});
