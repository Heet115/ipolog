import { NextRequest, NextResponse } from "next/server"
import { upstoxProvider } from "@/lib/ipo"

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const id = params.id

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "IPO ID parameter is required",
        },
        { status: 400 }
      )
    }

    const ipo = await upstoxProvider.getIPOById(id)

    if (!ipo) {
      return NextResponse.json(
        {
          success: false,
          error: "IPO not found",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: ipo,
    })
  } catch (error: unknown) {
    console.error("Error fetching IPO details:", error)
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load IPO details right now. Please try again later."

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
