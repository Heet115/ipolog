import { NextRequest, NextResponse } from "next/server"
import { upstoxProvider } from "@/lib/ipo"
import type { IPOQueryParams } from "@/lib/ipo/types"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get("status") as IPOQueryParams["status"]
    const issueTypeParam = searchParams.get(
      "issue_type"
    ) as IPOQueryParams["issueType"]
    const pageParam = searchParams.get("page")
    const recordsParam = searchParams.get("records")
    const queryParam = searchParams.get("q")?.toLowerCase().trim()

    const params: IPOQueryParams = {
      status:
        statusParam === "upcoming" ||
        statusParam === "closed" ||
        statusParam === "listed"
          ? statusParam
          : "open",
      issueType:
        issueTypeParam === "regular" || issueTypeParam === "sme"
          ? issueTypeParam
          : undefined,
      pageNumber: pageParam ? parseInt(pageParam, 10) || 1 : 1,
      records: recordsParam ? parseInt(recordsParam, 10) || 30 : 30,
    }

    const result = await upstoxProvider.getIPOs(params)

    let ipos = result.ipos
    if (queryParam) {
      ipos = ipos.filter((ipo) => {
        const nameMatch = ipo.name.toLowerCase().includes(queryParam)
        const symbolMatch = ipo.symbol?.toLowerCase().includes(queryParam)
        const companyMatch = ipo.companyName?.toLowerCase().includes(queryParam)
        const isinMatch = ipo.isin?.toLowerCase().includes(queryParam)
        return Boolean(nameMatch || symbolMatch || companyMatch || isinMatch)
      })
    }

    return NextResponse.json({
      success: true,
      data: ipos,
      meta: {
        page: result.pageNumber,
        totalPages: result.totalPages,
        totalRecords: result.totalRecords,
      },
    })
  } catch (error: unknown) {
    console.error("Error fetching available IPOs:", error)
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load IPO data right now. Please try again later."

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
