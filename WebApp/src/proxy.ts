import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_TOKEN = process.env.JWT_TOKEN;
const JWT_SECRET = JWT_TOKEN ? new TextEncoder().encode(JWT_TOKEN) : null;
const ENABLE_LOCAL_BYPASS = process.env.LOCAL_BYPASS === "true";

const roleAccess: Record<string, string[]> = {
  "/AdminUI": ["admin"],
  "/UsersUI": ["student", "faculty"],
  "/RAStaffUI": ["ra", "staff"],
};

const authPages = ["/Login", "/signup", "/forgot-password"];

const normalizeRole = (role: string) => role.toLowerCase();
const redirectToLogin = (request: NextRequest) =>
  NextResponse.redirect(new URL("/Login", request.url));
const clearAuthCookie = (response: NextResponse) => {
  response.cookies.set("auth_token", "", { path: "/", maxAge: 0 });
  return response;
};

const getDashboardPath = (role: string) => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "admin") return "/AdminUI/AdminDashBoard";
  if (normalizedRole === "student" || normalizedRole === "faculty") {
    return "/UsersUI/UsersDashBoard/Features/UserCollection";
  }
  return "/RAStaffUI/RAStaffDashBoard";
};

const decodeJwtPayloadRole = (token: string): string | undefined => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return undefined;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalizedPayload.length % 4;
    const paddedPayload = padding
      ? normalizedPayload + "=".repeat(4 - padding)
      : normalizedPayload;

    const decoded = atob(paddedPayload);
    const parsed = JSON.parse(decoded) as { role?: string };
    return parsed?.role ? normalizeRole(parsed.role) : undefined;
  } catch {
    return undefined;
  }
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLandingPage = pathname === "/";

  // Normalize common lowercase URL typed in browser to the actual route casing.
  if (pathname === "/adminui/admindashboard") {
    return NextResponse.redirect(
      new URL("/AdminUI/AdminDashBoard", request.url)
    );
  }

  const isLocalHost =
    request.nextUrl.hostname === "localhost" ||
    request.nextUrl.hostname === "127.0.0.1";
  const shouldBypassAdminAuth =
    ENABLE_LOCAL_BYPASS &&
    process.env.NODE_ENV !== "production" &&
    isLocalHost

  // Allow direct Admin UI access for local-only visual testing when explicitly enabled.
  if (shouldBypassAdminAuth) {
    return NextResponse.next();
  }

  const matchedPath = Object.keys(roleAccess).find((path) =>
    pathname.startsWith(path)
  );

  const isSignupPage = pathname === "/signup" || pathname.startsWith("/signup/");

  const isResetPasswordPage =
    pathname === "/forgot-password/reset" ||
    pathname.startsWith("/forgot-password/reset/");

  const isAuthPage = authPages.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (!matchedPath && !isAuthPage) return NextResponse.next();

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    if (matchedPath) {
      return redirectToLogin(request);
    }
    return NextResponse.next();
  }

  if (!JWT_SECRET) {
    const fallbackRole = decodeJwtPayloadRole(token);

    if (isLandingPage && fallbackRole) {
      return NextResponse.redirect(new URL(getDashboardPath(fallbackRole), request.url));
    }

    if (isAuthPage && !isResetPasswordPage && !isSignupPage && fallbackRole) {
      return NextResponse.redirect(new URL(getDashboardPath(fallbackRole), request.url));
    }

    if (matchedPath) {
      const allowedRoles = roleAccess[matchedPath];
      if (!fallbackRole || !allowedRoles.includes(fallbackRole)) {
        return redirectToLogin(request);
      }
    }

    return NextResponse.next();
  }

  try {
    const { payload } = await jwtVerify(
      token,
      JWT_SECRET
    );

    const rawRole = payload.role as string | undefined;
    const role = rawRole ? normalizeRole(rawRole) : undefined;

    if (isLandingPage && role) {
      return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
    }

    if (isAuthPage && !isResetPasswordPage && !isSignupPage && role) {
      return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
    }

    if (matchedPath) {
      const allowedRoles = roleAccess[matchedPath];
      if (!role || !allowedRoles.includes(role)) {
        return redirectToLogin(request);
      }
    }

    return NextResponse.next();
  } catch {
    const response = matchedPath
      ? redirectToLogin(request)
      : NextResponse.next();
    return clearAuthCookie(response);
  }
}

export const config = {
  matcher: [
    "/",
    "/AdminUI/:path*",
    "/adminui/:path*",
    "/UsersUI/:path*",
    "/RAStaffUI/:path*",
    "/Login",
    "/signup/:path*",
    "/forgot-password/:path*",
  ],
};
