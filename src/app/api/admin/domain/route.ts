import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createAuditLog, getClientIp } from "@/lib/audit"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { writeFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"

// GET domain settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const role = (session.user as { role: string }).role
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const settings = await prisma.settings.findFirst()
    return NextResponse.json({
      fqdn: settings?.fqdn || null,
      sslMode: settings?.sslMode || "auto",
      sslCertPath: settings?.sslCertPath || null,
      sslKeyPath: settings?.sslKeyPath || null,
    })
  } catch (error) {
    console.error("Error fetching domain settings:", error)
    return NextResponse.json({ error: "Failed to fetch domain settings" }, { status: 500 })
  }
}

// PUT update domain settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const role = (session.user as { role: string }).role
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const userId = (session.user as { id: string }).id

    const rl = rateLimit(userId, "admin")
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: getRateLimitHeaders(rl) })
    }

    const body = await request.json()
    const { fqdn, sslMode } = body

    // Validate FQDN format
    if (fqdn && !/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(fqdn)) {
      return NextResponse.json({ error: "Invalid domain format. Example: cal.example.com" }, { status: 400 })
    }

    let settings = await prisma.settings.findFirst()
    if (!settings) settings = await prisma.settings.create({ data: {} })

    const updateData: Record<string, unknown> = {}
    if (fqdn !== undefined) updateData.fqdn = fqdn || null
    if (sslMode && ["auto", "custom", "none"].includes(sslMode)) updateData.sslMode = sslMode

    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: updateData,
    })

    // Write Caddyfile if caddy is available
    try {
      await updateCaddyConfig(updated.fqdn, updated.sslMode, updated.sslCertPath, updated.sslKeyPath)
    } catch (e) {
      console.warn("[domain] Could not update Caddy config:", e)
    }

    await createAuditLog({
      action: "SETTING_CHANGE",
      entity: "Domain",
      entityId: settings.id,
      details: { fqdn, sslMode },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      userId,
    })

    return NextResponse.json({
      fqdn: updated.fqdn,
      sslMode: updated.sslMode,
      message: "Domain settings updated. Changes may require a service restart to take full effect.",
    })
  } catch (error) {
    console.error("Error updating domain settings:", error)
    return NextResponse.json({ error: "Failed to update domain settings" }, { status: 500 })
  }
}

// POST upload SSL certificate
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const role = (session.user as { role: string }).role
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const userId = (session.user as { id: string }).id

    const formData = await request.formData()
    const certFile = formData.get("cert") as File
    const keyFile = formData.get("key") as File

    if (!certFile || !keyFile) {
      return NextResponse.json({ error: "Both certificate and key files are required" }, { status: 400 })
    }

    // Validate file sizes (max 100KB each)
    if (certFile.size > 100 * 1024 || keyFile.size > 100 * 1024) {
      return NextResponse.json({ error: "Certificate files must be under 100KB" }, { status: 400 })
    }

    const certContent = await certFile.text()
    const keyContent = await keyFile.text()

    // Basic PEM validation
    if (!certContent.includes("-----BEGIN CERTIFICATE-----")) {
      return NextResponse.json({ error: "Invalid certificate file format" }, { status: 400 })
    }
    if (!keyContent.includes("-----BEGIN") || !keyContent.includes("PRIVATE KEY-----")) {
      return NextResponse.json({ error: "Invalid private key file format" }, { status: 400 })
    }

    // Save to ssl directory
    const sslDir = join(process.cwd(), "ssl")
    if (!existsSync(sslDir)) mkdirSync(sslDir, { recursive: true })

    const certPath = join(sslDir, "cert.pem")
    const keyPath = join(sslDir, "key.pem")

    writeFileSync(certPath, certContent, { mode: 0o644 })
    writeFileSync(keyPath, keyContent, { mode: 0o600 })

    // Update settings
    let settings = await prisma.settings.findFirst()
    if (!settings) settings = await prisma.settings.create({ data: {} })

    await prisma.settings.update({
      where: { id: settings.id },
      data: {
        sslCertPath: certPath,
        sslKeyPath: keyPath,
        sslMode: "custom",
      },
    })

    // Update Caddy config
    try {
      await updateCaddyConfig(settings.fqdn, "custom", certPath, keyPath)
    } catch (e) {
      console.warn("[domain] Could not update Caddy config:", e)
    }

    await createAuditLog({
      action: "SETTING_CHANGE",
      entity: "SSL",
      details: { action: "ssl_cert_uploaded" },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      userId,
    })

    return NextResponse.json({ message: "SSL certificate uploaded successfully" })
  } catch (error) {
    console.error("Error uploading SSL cert:", error)
    return NextResponse.json({ error: "Failed to upload SSL certificate" }, { status: 500 })
  }
}

// Helper: update Caddy reverse proxy config
async function updateCaddyConfig(
  fqdn: string | null,
  sslMode: string,
  certPath: string | null,
  keyPath: string | null
) {
  if (!fqdn) return

  const port = process.env.PORT || "3000"
  let caddyConfig = ""

  if (sslMode === "custom" && certPath && keyPath) {
    caddyConfig = `${fqdn} {
    tls ${certPath} ${keyPath}
    reverse_proxy localhost:${port} {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    encode gzip zstd
    header { -Server }
    log {
        output file /var/log/caddy/cally-access.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}`
  } else if (sslMode === "none") {
    caddyConfig = `http://${fqdn} {
    reverse_proxy localhost:${port} {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    encode gzip zstd
    header { -Server }
}`
  } else {
    // Auto SSL via Let's Encrypt
    caddyConfig = `${fqdn} {
    reverse_proxy localhost:${port} {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    encode gzip zstd
    header { -Server }
    log {
        output file /var/log/caddy/cally-access.log {
            roll_size 10mb
            roll_keep 5
        }
    }
}`
  }

  try {
    const caddyfilePath = "/etc/caddy/Caddyfile"
    writeFileSync(caddyfilePath, caddyConfig)
    // Reload Caddy
    const { execSync } = require("child_process")
    execSync("systemctl reload caddy", { timeout: 5000 })
  } catch (e) {
    // May not have permission — that's OK
    console.warn("[caddy] Config update attempted but may need manual restart:", e)
  }
}
