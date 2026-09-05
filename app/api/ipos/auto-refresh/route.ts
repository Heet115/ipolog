import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase/firestore"
import { verifyServerAuth } from "@/lib/firebase/server-auth"
import { upstoxProvider } from "@/lib/ipo"
import { getIpos, syncIpoPublicData } from "@/lib/firebase/ipos"
import { isIpoSyncStale, inputValueToTimestamp } from "@/lib/utils/ipo"

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user from Firebase token
    const user = await verifyServerAuth(request)
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: You must be logged in to auto-refresh IPOs.",
        },
        { status: 401 }
      )
    }

    // 2. Parse options
    const body = await request.json().catch(() => ({}))
    const force = Boolean(body.force)
    const maxAgeHours =
      typeof body.maxAgeHours === "number" && body.maxAgeHours > 0
        ? body.maxAgeHours
        : 24
    const specificIpoId =
      typeof body.ipoId === "string" && body.ipoId.trim()
        ? body.ipoId.trim()
        : undefined

    // 3. Fetch all active IPOs
    const allIpos = await getIpos(user.uid, false)

    // 4. Identify imported IPOs that need a 24-hour sync
    let targetIpos = allIpos.filter((ipo) => Boolean(ipo.externalId))

    if (specificIpoId) {
      targetIpos = targetIpos.filter((ipo) => ipo.id === specificIpoId)
    }

    if (!force) {
      targetIpos = targetIpos.filter((ipo) => isIpoSyncStale(ipo, maxAgeHours))
    }

    if (targetIpos.length === 0) {
      return NextResponse.json({
        success: true,
        refreshedCount: 0,
        totalChecked: allIpos.length,
        message:
          "All imported IPO data is fresh (synced within the last 24 hours).",
      })
    }

    // Limit concurrency to maximum 10 IPOs per batch to respect API limits
    const batchToProcess = targetIpos.slice(0, 10)
    const refreshedIpos: Array<{ id: string; name: string; symbol?: string }> =
      []
    const errors: Array<{ id: string; name: string; error: string }> = []

    for (const ipo of batchToProcess) {
      try {
        if (!ipo.externalId) continue

        const externalIpo = await upstoxProvider.getIPOById(ipo.externalId)
        if (!externalIpo) {
          errors.push({
            id: ipo.id,
            name: ipo.name,
            error: "IPO not found on Upstox provider.",
          })
          continue
        }

        const openDate = externalIpo.openDate
          ? inputValueToTimestamp(externalIpo.openDate)
          : ipo.openDate
        const closeDate = externalIpo.closeDate
          ? inputValueToTimestamp(externalIpo.closeDate)
          : ipo.closeDate
        const allotmentDate = externalIpo.allotmentDate
          ? inputValueToTimestamp(externalIpo.allotmentDate)
          : ipo.allotmentDate
        const listingDate = externalIpo.listingDate
          ? inputValueToTimestamp(externalIpo.listingDate)
          : ipo.listingDate

        await syncIpoPublicData(user.uid, ipo.id, {
          name: externalIpo.name,
          companyName: externalIpo.companyName || "",
          symbol: externalIpo.symbol,
          isin: externalIpo.isin,
          type: externalIpo.type,
          issuePrice: externalIpo.issuePrice,
          priceBandMin: externalIpo.priceBandMin,
          priceBandMax: externalIpo.priceBandMax,
          lotSize: externalIpo.lotSize,
          issueSize: externalIpo.issueSize,
          openDate,
          closeDate,
          allotmentDate,
          listingDate,
          listingPrice: externalIpo.listingPrice || ipo.listingPrice,
          registrar: externalIpo.registrarName || ipo.registrar,
          registrarUrl: externalIpo.registrarUrl || ipo.registrarUrl,
          lastSyncedAt: Timestamp.now(),
        })

        refreshedIpos.push({
          id: ipo.id,
          name: ipo.name,
          symbol: externalIpo.symbol,
        })
      } catch (itemErr: unknown) {
        console.error(
          `Failed to auto-refresh IPO ${ipo.id} (${ipo.name}):`,
          itemErr
        )
        errors.push({
          id: ipo.id,
          name: ipo.name,
          error:
            itemErr instanceof Error ? itemErr.message : "Unknown sync failure",
        })
      }
    }

    return NextResponse.json({
      success: true,
      refreshedCount: refreshedIpos.length,
      staleFound: targetIpos.length,
      refreshedIpos,
      errors: errors.length > 0 ? errors : undefined,
      message: `Auto-refreshed ${refreshedIpos.length} IPO(s) with 24-hour updates.`,
    })
  } catch (error: unknown) {
    console.error("Auto-refresh route failed:", error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to auto-refresh imported IPOs.",
      },
      { status: 500 }
    )
  }
}
