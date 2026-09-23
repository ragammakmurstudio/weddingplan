import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (isProtected && !isLoggedIn) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname === "/" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/dashboard/:path*", "/admin/:path*", "/login", "/register"],
};
