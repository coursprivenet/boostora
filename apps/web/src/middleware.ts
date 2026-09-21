import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect legacy /services route to /catalogue
  if (pathname === "/services" || pathname.startsWith("/services/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/services/, "/catalogue");
    return NextResponse.redirect(url, 308);
  }

  // If visiting homepage on a mobile device, redirect directly to the catalog
  if (pathname === "/") {
    const userAgent = request.headers.get("user-agent") || "";
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
        userAgent,
      );

    if (isMobile) {
      const url = request.nextUrl.clone();
      url.pathname = "/catalogue";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/services", "/services/:path*"],
};
