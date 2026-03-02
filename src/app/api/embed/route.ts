import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Returns a JavaScript snippet that sites can embed to show a booking widget
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get("slug")
    const theme = searchParams.get("theme") || "dark"
    const primaryColor = searchParams.get("color") || "#6366f1"

    if (!slug) {
        return new NextResponse("// Error: slug parameter required", {
            headers: { "Content-Type": "application/javascript" },
        })
    }

    // Determine the base URL from the request
    const proto = request.headers.get("x-forwarded-proto") || "https"
    const host = request.headers.get("host") || "localhost:3000"
    const baseUrl = `${proto}://${host}`

    const script = `
(function() {
    'use strict';

    var CALLY_BASE = '${baseUrl}';
    var CALLY_SLUG = '${slug}';
    var CALLY_THEME = '${theme}';
    var CALLY_COLOR = '${primaryColor}';

    // Find the embed container
    var container = document.getElementById('cally-booking') || document.currentScript.parentElement;
    if (!container) return;

    // Create the booking button
    var btn = document.createElement('button');
    btn.textContent = 'Book a Meeting';
    btn.style.cssText = 'background:' + CALLY_COLOR + ';color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;font-family:system-ui,sans-serif;transition:opacity 0.2s;';
    btn.onmouseover = function() { btn.style.opacity = '0.9'; };
    btn.onmouseout = function() { btn.style.opacity = '1'; };
    container.appendChild(btn);

    // Create modal overlay
    var overlay = document.createElement('div');
    overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:99999;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:' + (CALLY_THEME === 'dark' ? '#0f172a' : '#ffffff') + ';border-radius:16px;width:90vw;max-width:500px;max-height:90vh;overflow:hidden;position:relative;box-shadow:0 25px 50px rgba(0,0,0,0.3);';

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'position:absolute;top:12px;right:16px;background:none;border:none;font-size:28px;color:' + (CALLY_THEME === 'dark' ? '#94a3b8' : '#64748b') + ';cursor:pointer;z-index:10;line-height:1;';

    // Iframe
    var iframe = document.createElement('iframe');
    iframe.src = CALLY_BASE + '/book/' + CALLY_SLUG;
    iframe.style.cssText = 'width:100%;height:600px;border:none;';
    iframe.allow = 'payment';

    modal.appendChild(closeBtn);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    btn.addEventListener('click', function() {
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });

    closeBtn.addEventListener('click', function() {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    });

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    });

    // Listen for messages from the iframe
    window.addEventListener('message', function(e) {
        if (e.origin !== CALLY_BASE) return;
        if (e.data && e.data.type === 'cally-booking-complete') {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
            // Dispatch event for the host page
            var event = new CustomEvent('cally:booked', { detail: e.data.appointment });
            document.dispatchEvent(event);
        }
    });
})();
`

    return new NextResponse(script, {
        headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
        },
    })
}
