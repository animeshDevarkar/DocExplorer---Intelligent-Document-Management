import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    // Check for both local and secure cookie names
    const sessionCookie = request.cookies.get("better-auth.session_token") || 
                          request.cookies.get("__Secure-better-auth.session_token");
    
    if (!sessionCookie) {
        return NextResponse.redirect(new URL("/login", request.url));
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/document/:path*", "/compare"],
};
