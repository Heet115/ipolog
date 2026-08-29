import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase/firestore"
import { verifyServerAuth } from "@/lib/firebase/server-auth"
import { upstoxProvider } from "@/lib/ipo"
import {
  createIpo,
  findIpoByExternalId,
  getIpoById,
} from "@/lib/firebase/ipos"
import { inputValueToTimestamp } from "@/lib/utils/ipo"

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user from Firebase token
    const user = await verifyServerAuth(request)
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: You must be logged in to import IPOs.",
        },
        { status: 401 }
      )
    }

    // 2. Validate request payload
    const body = await request.json().catch(() => ({}))
    const externalId =
      typeof body.externalId === "string" ? body.externalId.trim() : ""
    const provider =
      typeof body.provider === "string" && body.provider.trim()
        ? body.provider.trim()
        : "upstox"

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External IPO ID is required.",
        },
        { status: 400 }
      )
    }

    // 3. Duplicate prevention: Check if already imported
    const existingIpo = await findIpoByExternalId(user.uid, provider, externalId)
    if (existingIpo) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        created: false,
        ipo: existingIpo,
        message: `${existingIpo.name} is already in your IPO tracker.`,
      })
    }

    // 4. Fetch detailed IPO information from Upstox provider
    const externalIpo = await upstoxProvider.getIPOById(externalId)
    if (!externalIpo) {
      return NextResponse.json(
        {
          success: false,
          error: `IPO with ID "${externalId}" was not found on Upstox.`,
        },
        { status: 404 }
      )
    }

    // 5. Create IPO in the user's Firestore collection
    const openDate = externalIpo.openDate
      ? inputValueToTimestamp(externalIpo.openDate)
      : undefined
    const closeDate = externalIpo.closeDate
      ? inputValueToTimestamp(externalIpo.closeDate)
      : undefined
    const allotmentDate = externalIpo.allotmentDate
      ? inputValueToTimestamp(externalIpo.allotmentDate)
      : undefined
    const listingDate = externalIpo.listingDate
      ? inputValueToTimestamp(externalIpo.listingDate)
      : undefined

    const ipoId = await createIpo(user.uid, {
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
      listingPrice: externalIpo.listingPrice,
      source: "api",
      provider: "upstox",
      externalId: externalIpo.externalId,
      lastSyncedAt: Timestamp.now(),
    })

    const createdIpo = await getIpoById(user.uid, ipoId)

    return NextResponse.json({
      success: true,
      alreadyExists: false,
      created: true,
      ipo: createdIpo,
      message: `${externalIpo.name} imported successfully.`,
    })
  } catch (error: unknown) {
    console.error("Error importing IPO:", error)
    const message =
      error instanceof Error
        ? error.message
        : "Failed to import IPO. Please try again later."

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
