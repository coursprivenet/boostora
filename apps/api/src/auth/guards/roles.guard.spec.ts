import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";
import { RolesGuard } from "./roles.guard";

function makeContext(user: { role: UserRole } | undefined): ExecutionContext {
  return {
    getHandler: () => ({}) as never,
    getClass: () => ({}) as never,
    switchToHttp: () => ({ getRequest: () => ({ user }) }) as never,
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  function guardWithRequiredRoles(roles: UserRole[] | undefined) {
    const reflector = { getAllAndOverride: () => roles } as unknown as Reflector;
    return new RolesGuard(reflector);
  }

  it("allows any authenticated user when no @Roles() is set", () => {
    const guard = guardWithRequiredRoles(undefined);
    expect(guard.canActivate(makeContext({ role: UserRole.CLIENT }))).toBe(true);
  });

  it("allows a user whose role is in the required list", () => {
    const guard = guardWithRequiredRoles([UserRole.ADMIN]);
    expect(guard.canActivate(makeContext({ role: UserRole.ADMIN }))).toBe(true);
  });

  it("rejects a user whose role is not in the required list", () => {
    const guard = guardWithRequiredRoles([UserRole.ADMIN]);
    expect(() => guard.canActivate(makeContext({ role: UserRole.CLIENT }))).toThrow(
      ForbiddenException,
    );
  });

  it("rejects when there is no user on the request at all", () => {
    const guard = guardWithRequiredRoles([UserRole.ADMIN]);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });
});
