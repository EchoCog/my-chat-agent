import { describe, it, expect, vi } from "vitest";
import { processToolCalls } from "../src/utils";
import { APPROVAL } from "../src/shared";

// Mock the AI SDK modules
vi.mock("ai", () => ({
  convertToCoreMessages: vi.fn((messages) => messages)
}));

vi.mock("@ai-sdk/ui-utils", () => ({
  formatDataStreamPart: vi.fn((type, data) => ({ type, data }))
}));

describe("Utils Functionality", () => {
  describe("processToolCalls", () => {
    it("should process messages without tool calls", async () => {
      const mockDataStream = {
        write: vi.fn(),
        close: vi.fn()
      };

      const messages = [
        {
          id: "1",
          role: "user" as const,
          content: "Hello",
          createdAt: new Date()
        },
        {
          id: "2",
          role: "assistant" as const,
          content: "Hi there!",
          createdAt: new Date()
        }
      ];

      const tools = {};
      const executions = {};

      const result = await processToolCalls({
        messages,
        dataStream: mockDataStream,
        tools,
        executions
      });

      expect(result).toEqual(messages);
    });

    it("should handle messages with approved tool calls", async () => {
      const mockDataStream = {
        write: vi.fn(),
        close: vi.fn()
      };

      const messages = [
        {
          id: "1",
          role: "user" as const,
          content: "What's the weather in Paris?",
          createdAt: new Date()
        },
        {
          id: "2",
          role: "assistant" as const,
          content: "",
          createdAt: new Date(),
          parts: [
            {
              type: "tool-invocation" as const,
              toolInvocation: {
                toolCallId: "call-1",
                toolName: "getWeatherInformation",
                args: { city: "Paris" },
                state: "result" as const,
                result: APPROVAL.YES
              }
            }
          ]
        }
      ];

      const tools = {
        getWeatherInformation: {
          description: "Get weather info",
          parameters: {}
        }
      };

      const executions = {
        getWeatherInformation: vi.fn().mockResolvedValue("Sunny in Paris")
      };

      const result = await processToolCalls({
        messages,
        dataStream: mockDataStream,
        tools,
        executions
      });

      expect(executions.getWeatherInformation).toHaveBeenCalledWith(
        { city: "Paris" },
        expect.objectContaining({
          messages: expect.any(Array),
          toolCallId: "call-1"
        })
      );
      expect(mockDataStream.write).toHaveBeenCalled();

      // Should transform the tool call result
      const transformedMessage = result.find((m) => m.id === "2");
      expect(transformedMessage?.parts?.[0].toolInvocation.result).toBe(
        "Sunny in Paris"
      );
    });

    it("should handle denied tool calls", async () => {
      const mockDataStream = {
        write: vi.fn(),
        close: vi.fn()
      };

      const messages = [
        {
          id: "1",
          role: "assistant" as const,
          content: "",
          createdAt: new Date(),
          parts: [
            {
              type: "tool-invocation" as const,
              toolInvocation: {
                toolCallId: "call-1",
                toolName: "getWeatherInformation",
                args: { city: "London" },
                state: "result" as const,
                result: APPROVAL.NO
              }
            }
          ]
        }
      ];

      const tools = {
        getWeatherInformation: {
          description: "Get weather info",
          parameters: {}
        }
      };

      const executions = {
        getWeatherInformation: vi.fn()
      };

      const result = await processToolCalls({
        messages,
        dataStream: mockDataStream,
        tools,
        executions
      });

      // Execution should not be called for denied tools
      expect(executions.getWeatherInformation).not.toHaveBeenCalled();
      expect(mockDataStream.write).toHaveBeenCalled();

      // Should have error message for denied tool
      const transformedMessage = result.find((m) => m.id === "1");
      expect(transformedMessage?.parts?.[0].toolInvocation.result).toBe(
        "Error: User denied access to tool execution"
      );
    });

    it("should skip tool calls without result state", async () => {
      const mockDataStream = {
        write: vi.fn(),
        close: vi.fn()
      };

      const messages = [
        {
          id: "1",
          role: "assistant" as const,
          content: "",
          createdAt: new Date(),
          parts: [
            {
              type: "tool-invocation" as const,
              toolInvocation: {
                toolCallId: "call-1",
                toolName: "getWeatherInformation",
                args: { city: "London" },
                state: "call" as const
              }
            }
          ]
        }
      ];

      const tools = {
        getWeatherInformation: {
          description: "Get weather info",
          parameters: {}
        }
      };

      const executions = {
        getWeatherInformation: vi.fn()
      };

      const result = await processToolCalls({
        messages,
        dataStream: mockDataStream,
        tools,
        executions
      });

      // Execution should not be called for unconfirmed tools
      expect(executions.getWeatherInformation).not.toHaveBeenCalled();
      expect(mockDataStream.write).not.toHaveBeenCalled();
      expect(result).toEqual(messages);
    });

    it("should handle messages without parts", async () => {
      const mockDataStream = {
        write: vi.fn(),
        close: vi.fn()
      };

      const messages = [
        {
          id: "1",
          role: "user" as const,
          content: "Hello",
          createdAt: new Date()
        }
      ];

      const tools = {};
      const executions = {};

      const result = await processToolCalls({
        messages,
        dataStream: mockDataStream,
        tools,
        executions
      });

      expect(result).toEqual(messages);
      expect(mockDataStream.write).not.toHaveBeenCalled();
    });
  });
});
