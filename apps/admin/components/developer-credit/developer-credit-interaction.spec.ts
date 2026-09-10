import { describe, expect, it } from "vitest";

import {
  LONG_PRESS_DURATION_MS,
  movedBeyondLongPressTolerance,
} from "./developer-credit-interaction";
import { SOCIOTEC_CREDIT } from "./developer-credit.config";

describe("developer credit", () => {
  it("uses the approved long-press duration and internal route", () => {
    expect(LONG_PRESS_DURATION_MS).toBe(800);
    expect(SOCIOTEC_CREDIT.route).toBe("/desarrollado-por");
  });

  it("cancels a long press when the pointer moves beyond tolerance", () => {
    expect(movedBeyondLongPressTolerance({ x: 10, y: 10 }, { x: 15, y: 15 })).toBe(false);
    expect(movedBeyondLongPressTolerance({ x: 10, y: 10 }, { x: 30, y: 10 })).toBe(true);
  });

  it("keeps the approved public contact links", () => {
    expect(SOCIOTEC_CREDIT.phoneHref).toBe("tel:+50257697924");
    expect(SOCIOTEC_CREDIT.websiteUrl).toMatch(/^https:\/\//);
    expect(SOCIOTEC_CREDIT.facebookUrl).toMatch(/^https:\/\//);
  });
});
