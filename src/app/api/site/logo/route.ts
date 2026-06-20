import { NextResponse } from "next/server";
import { getSiteAsset } from "@/lib/site-assets";

export async function GET() {
  const asset = await getSiteAsset("logo");

  if (!asset) {
    return NextResponse.json({ error: "Logo not found" }, { status: 404 });
  }

  return new NextResponse(asset.data, {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=300, must-revalidate",
    },
  });
}
