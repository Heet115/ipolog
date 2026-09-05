import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase/firestore"
import { verifyServerAuth } from "@/lib/firebase/server-auth"
import { upstoxProvider } from "@/lib/ipo"
import { getIpoById, syncIpoPublicData } from "@/lib/firebase/ipos"
import { inputValueToTimestamp } from "@/lib/utils/ipo"

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user from Firebase token
    const user = await verifyServerAuth(request)
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: You must be logged in to sync IPO data.",
        },
        { status: 401 }
      )
    }

    const params = await props.params
    const ipoId = params.id

    if (!ipoId) {
      return NextResponse.json(
        {
          success: false,
          error: "IPO ID parameter is required.",
        },
        { status: 400 }
      )
    }

    // 2. Fetch existing IPO from user's Firestore collection
    const existingIpo = await getIpoById(user.uid, ipoId)
    if (!existingIpo) {
      return NextResponse.json(
        {
          success: false,
          error: "IPO not found in your tracker.",
        },
        { status: 404 }
      )
    }

    if (existingIpo.userId !== user.uid) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You do not have access to this IPO.",
        },
        { status: 403 }
      )
    }

    // 3. Ensure IPO was imported from an external API provider
    if (!existingIpo.externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "Manual IPOs cannot be refreshed from an external provider.",
        },
        { status: 400 }
      )
    }

    // 4. Fetch fresh details from Upstox provider
    const externalIpo = await upstoxProvider.getIPOById(existingIpo.externalId)
    if (!externalIpo) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not retrieve latest data for "${existingIpo.name}" from Upstox.`,
        },
        { status: 404 }
      )
    }

    // 5. Update only public IPO fields without altering applications, notes, or user accounts
    const openDate = externalIpo.openDate
      ? inputValueToTimestamp(externalIpo.openDate)
      : existingIpo.openDate
    const closeDate = externalIpo.closeDate
      ? inputValueToTimestamp(externalIpo.closeDate)
      : existingIpo.closeDate
    const allotmentDate = externalIpo.allotmentDate
      ? inputValueToTimestamp(externalIpo.allotmentDate)
      : existingIpo.allotmentDate
    const listingDate = externalIpo.listingDate
      ? inputValueToTimestamp(externalIpo.listingDate)
      : existingIpo.listingDate

    await syncIpoPublicData(user.uid, ipoId, {
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
      listingPrice: externalIpo.listingPrice || existingIpo.listingPrice,
      registrar: externalIpo.registrarName || existingIpo.registrar,
      registrarUrl: externalIpo.registrarUrl || existingIpo.registrarUrl,
      lastSyncedAt: Timestamp.now(),
    })

    const updatedIpo = await getIpoById(user.uid, ipoId)

    return NextResponse.json({
      success: true,
      ipo: updatedIpo,
      message: `${updatedIpo?.name || "IPO"} data refreshed successfully from Upstox.`,
    })
  } catch (error: unknown) {
    console.error("Error syncing IPO:", error)
    const message =
      error instanceof Error
        ? error.message
        : "Failed to refresh IPO data. Please try again later."

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
