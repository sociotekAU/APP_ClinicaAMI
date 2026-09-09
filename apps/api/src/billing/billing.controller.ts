import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { ApiSuccess, AuthUser, BillingOptions, CashSummary, InvoiceDetail, InvoiceListItem, PaginatedResponse } from "@ami/contracts";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import { RequirePermission } from "../authorization/decorators/require-permission.decorator";
import { PermissionGuard } from "../authorization/guards/permission.guard";
import { BillingService } from "./billing.service";
import { InvoiceAnnulDto, InvoiceInputDto } from "./dto/billing-input.dto";
import { CashSummaryQueryDto, ListInvoicesDto } from "./dto/list-billing.dto";

@Controller("billing")
@UseGuards(AccessTokenGuard, PermissionGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("options") @RequirePermission("facturacion", "read")
  async options(): Promise<ApiSuccess<BillingOptions>> { return this.success(await this.billing.options()); }

  @Get("invoices") @RequirePermission("facturacion", "read")
  async invoices(@Query() query: ListInvoicesDto): Promise<PaginatedResponse<InvoiceListItem>> { return this.paginated(await this.billing.listInvoices(query)); }

  @Get("invoices/:id") @RequirePermission("facturacion", "read")
  async invoice(@Param("id", ParseIntPipe) id: number): Promise<ApiSuccess<InvoiceDetail>> { return this.success(await this.billing.invoiceDetail(id)); }

  @Post("invoices") @RequirePermission("facturacion", "write")
  async createInvoice(@Body() input: InvoiceInputDto, @CurrentUser() user: AuthUser): Promise<ApiSuccess<InvoiceDetail>> { return this.success(await this.billing.createInvoice(input, user)); }

  @Patch("invoices/:id/annul") @RequirePermission("facturacion", "write")
  async annulInvoice(@Param("id", ParseIntPipe) id: number, @Body() input: InvoiceAnnulDto): Promise<ApiSuccess<InvoiceDetail>> { return this.success(await this.billing.annulInvoice(id, input.reason)); }

  @Get("cash-summary") @RequirePermission("facturacion", "read")
  async cashSummary(@Query() query: CashSummaryQueryDto): Promise<ApiSuccess<CashSummary>> { return this.success(await this.billing.cashSummary(query.date)); }

  private success<T>(data: T): ApiSuccess<T> { return { data, meta: { timestamp: new Date().toISOString() } }; }
  private paginated<T>(result: { items: T[]; pagination: PaginatedResponse<T>["pagination"] }): PaginatedResponse<T> { return { data: result.items, pagination: result.pagination, meta: { timestamp: new Date().toISOString() } }; }
}
