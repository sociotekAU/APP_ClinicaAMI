import { describe, expect, it } from "vitest";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("reports the API as available", () => {
    expect(new HealthService().getStatus()).toEqual({
      service: "ami-api",
      status: "ok",
    });
  });
});
