// NOTE: Next.js 16 deprecated the `middleware` file convention in favor of `proxy`.
// However, next-intl (as of v4) still requires the middleware convention for locale
// routing/detection. We keep this file until next-intl ships a proxy-compatible adapter.
// Tracking: https://github.com/amannn/next-intl/issues
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|static|favicon|icon-|logo-|manifest\\.json|sw\\.js|share|.*\\..*).*)",
};
