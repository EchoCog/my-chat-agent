import { describe, it, expect, vi } from "vitest";
import { tools, executions } from "../src/tools";

// Mock the agents module
vi.mock("agents", () => ({
  getCurrentAgent: vi.fn(() => ({
    agent: {
      schedule: vi.fn(),
      getSchedules: vi.fn(() => []),
      cancelSchedule: vi.fn()
    }
  }))
}));

describe("Tools Functionality", () => {
  describe("Tool Definitions", () => {
    it("should have all expected tools defined", () => {
      expect(tools).toHaveProperty("getWeatherInformation");
      expect(tools).toHaveProperty("getLocalTime");
      expect(tools).toHaveProperty("scheduleTask");
      expect(tools).toHaveProperty("getScheduledTasks");
      expect(tools).toHaveProperty("cancelScheduledTask");
    });

    it("should have weather tool without execute function (requires confirmation)", () => {
      const weatherTool = tools.getWeatherInformation;
      expect(weatherTool.description).toBe(
        "show the weather in a given city to the user"
      );
      // Tool should not have execute function, requiring confirmation
      expect(weatherTool.execute).toBeUndefined();
    });

    it("should have local time tool with execute function (auto-executing)", () => {
      const timeTool = tools.getLocalTime;
      expect(timeTool.description).toBe(
        "get the local time for a specified location"
      );
      expect(timeTool.execute).toBeDefined();
    });
  });

  describe("Auto-executing Tools", () => {
    it("should execute getLocalTime tool", async () => {
      const result = await tools.getLocalTime.execute!({
        location: "New York"
      });
      expect(result).toBe("10am");
    });

    it("should execute getScheduledTasks tool", async () => {
      const result = await tools.getScheduledTasks.execute!({});
      expect(result).toBe("No scheduled tasks found.");
    });

    it("should execute cancelScheduledTask tool", async () => {
      const result = await tools.cancelScheduledTask.execute!({
        taskId: "test-task-1"
      });
      expect(result).toBe("Task test-task-1 has been successfully canceled.");
    });
  });

  describe("Schedule Tool", () => {
    it("should handle scheduled type", async () => {
      const scheduleData = {
        when: {
          type: "scheduled" as const,
          date: new Date("2024-12-31T23:59:59Z")
        },
        description: "New Year task"
      };

      const result = await tools.scheduleTask.execute!(scheduleData);
      expect(result).toContain('Task scheduled for type "scheduled"');
    });

    it("should handle delayed type", async () => {
      const scheduleData = {
        when: {
          type: "delayed" as const,
          delayInSeconds: 3600
        },
        description: "Delayed task"
      };

      const result = await tools.scheduleTask.execute!(scheduleData);
      expect(result).toContain('Task scheduled for type "delayed"');
    });

    it("should handle cron type", async () => {
      const scheduleData = {
        when: {
          type: "cron" as const,
          cron: "0 9 * * *"
        },
        description: "Daily task"
      };

      const result = await tools.scheduleTask.execute!(scheduleData);
      expect(result).toContain('Task scheduled for type "cron"');
    });

    it("should handle no-schedule type", async () => {
      const scheduleData = {
        when: {
          type: "no-schedule" as const
        },
        description: "Invalid task"
      };

      const result = await tools.scheduleTask.execute!(scheduleData);
      expect(result).toBe("Not a valid schedule input");
    });
  });

  describe("Confirmation-required Tool Executions", () => {
    it("should have execution for weather tool", () => {
      expect(executions).toHaveProperty("getWeatherInformation");
      expect(typeof executions.getWeatherInformation).toBe("function");
    });

    it("should execute weather information", async () => {
      const result = await executions.getWeatherInformation({ city: "London" });
      expect(result).toBe("The weather in London is sunny");
    });
  });

  describe("Tool Parameters Validation", () => {
    it("should validate weather tool parameters", () => {
      const weatherTool = tools.getWeatherInformation;
      expect(weatherTool.parameters).toBeDefined();

      // Test parameter schema
      const validParams = { city: "Tokyo" };
      expect(() => weatherTool.parameters.parse(validParams)).not.toThrow();

      // Test invalid parameters
      expect(() => weatherTool.parameters.parse({})).toThrow();
    });

    it("should validate schedule tool parameters", () => {
      const scheduleTool = tools.scheduleTask;
      expect(scheduleTool.parameters).toBeDefined();

      const validParams = {
        when: {
          type: "delayed",
          delayInSeconds: 300
        },
        description: "Test task"
      };
      expect(() => scheduleTool.parameters.parse(validParams)).not.toThrow();
    });
  });
});
