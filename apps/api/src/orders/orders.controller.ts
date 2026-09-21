import { Body, Controller, Get, Param, Post, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/strategies/jwt.strategy";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { SendOtpDto } from "./dto/send-otp.dto";
import { ConfirmPaymentDto } from "./dto/confirm-payment.dto";
import { RefundOrderDto } from "./dto/refund-order.dto";
import { ChangePaymentCountryDto } from "./dto/change-payment-country.dto";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.orders.listMine(user.id);
  }

  @Roles(UserRole.ADMIN)
  @Get("admin")
  listAdmin() {
    return this.orders.listAdmin();
  }

  @Roles(UserRole.ADMIN)
  @Get("admin/export.csv")
  async exportCsv(@Res() res: Response) {
    const csv = await this.orders.exportOrdersCsv();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="commandes-${Date.now()}.csv"`);
    res.send(csv);
  }

  /** Public tracking endpoint for guest and authenticated orders via secret trackingToken. */
  @Public()
  @Get("tracking/:token")
  getTracking(@Param("token") token: string) {
    return this.orders.getByTrackingToken(token);
  }

  /** Refill requested via secret trackingToken — checks completion and drop conditions. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("tracking/:token/refill")
  refillByTracking(@Param("token") token: string) {
    return this.orders.requestRefillByTracking(token);
  }

  /** Claim an order to associate it with an authenticated account. */
  @Public()
  @Post("tracking/:token/claim")
  claimByTracking(
    @Param("token") token: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.orders.claimByTracking(token, user?.id);
  }

  /** Manual recovery for orders stuck in RETRY_SUBMIT/SUBMIT_FAILED — no-ops if already submitted. */
  @Roles(UserRole.ADMIN)
  @Post(":id/submit-to-provider")
  submitToProvider(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.ensureSubmittedToProvider(id, user.id);
  }

  @Get(":id")
  getOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.orders.getOneMine(user.id, id);
  }

  /** Reopens the payment step for an unpaid, non-expired order without creating a duplicate. */
  @Public()
  @Get(":id/payment/resume")
  resumePayment(@CurrentUser() user: AuthenticatedUser | undefined, @Param("id") id: string) {
    return this.orders.getPaymentResume(user?.id, id);
  }

  // Each attempt can hit the real Yengapay API — cap how fast one account can spam it.
  // Supports unauthenticated/guest order creation.
  @Public()
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post()
  create(@CurrentUser() user: AuthenticatedUser | undefined, @Body() dto: CreateOrderDto) {
    return this.orders.create(user?.id, dto);
  }

  /** Opens the provider-hosted checkout only after the customer chose card/PayPal. */
  @Public()
  @Post(":id/payment/checkout")
  checkoutPayment(@CurrentUser() user: AuthenticatedUser | undefined, @Param("id") id: string) {
    return this.orders.createHostedCheckout(user?.id, id);
  }

  /** Opens the provider-hosted Cryptomus invoice after the customer chooses crypto. */
  @Public()
  @Post(":id/payment/crypto")
  cryptoPayment(@CurrentUser() user: AuthenticatedUser | undefined, @Param("id") id: string) {
    return this.orders.createCryptomusPayment(user?.id, id);
  }

  @Public()
  @Post(":id/payment/change-country")
  changePaymentCountry(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
    @Body() dto: ChangePaymentCountryDto,
  ) {
    return this.orders.changePaymentCountry(user?.id, id, dto.paymentCountryCode);
  }

  @Public()
  @Post(":id/payment/send-otp")
  sendOtp(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
    @Body() dto: SendOtpDto,
  ) {
    return this.orders.sendOtp(user?.id, id, dto);
  }

  @Public()
  @Post(":id/payment/confirm")
  confirmPayment(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param("id") id: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.orders.confirmPayment(user?.id, id, dto);
  }

  @Post(":id/cancel")
  requestCancel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.orders.requestCancel(user.id, id);
  }

  @Post(":id/refill")
  requestRefill(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.orders.requestRefill(user.id, id);
  }

  @Roles(UserRole.ADMIN)
  @Post(":id/refund")
  adminRefund(
    @Param("id") id: string,
    @Body() dto: RefundOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.adminRefund(id, dto, user.id);
  }
}
