import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { InvoiceAnnulDto, InvoiceInputDto } from "./billing-input.dto";
import { CashSummaryQueryDto, ListInvoicesDto } from "./list-billing.dto";

describe("billing DTOs", () => {
  it("transforma paginación y valida los filtros de facturas", async () => {
    const query = plainToInstance(ListInvoicesDto, { page: "2", pageSize: "20", status: "anulada", sortBy: "total", sortDirection: "desc" });
    expect(await validate(query)).toHaveLength(0);
    expect(query).toMatchObject({ page: 2, pageSize: 20, status: "anulada", sortBy: "total" });
  });

  it("valida cada concepto y exige al menos un detalle", async () => {
    const empty = plainToInstance(InvoiceInputDto, { patientId: 1, paymentMethod: "efectivo", lines: [] });
    const invalidLine = plainToInstance(InvoiceInputDto, { patientId: 1, paymentMethod: "efectivo", lines: [{ concept: "x", quantity: 0, unitPrice: -1 }] });
    expect((await validate(empty)).map((error) => error.property)).toContain("lines");
    expect((await validate(invalidLine, { forbidUnknownValues: true }))[0]?.children?.[0]?.children?.length).toBeGreaterThan(0);
  });

  it("rechaza motivos breves y fechas de caja inválidas", async () => {
    const annul = plainToInstance(InvoiceAnnulDto, { reason: "no" });
    const date = plainToInstance(CashSummaryQueryDto, { date: "09/09/2026" });
    expect((await validate(annul)).map((error) => error.property)).toContain("reason");
    expect((await validate(date)).map((error) => error.property)).toContain("date");
  });
});
