import { NextRequest, NextResponse } from "next/server";
import { lookupPincode } from "@/lib/pincode";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pincode: string }> }
) {
  const { pincode } = await params;
  const result = await lookupPincode(pincode);

  if (!result) {
    return NextResponse.json(
      { error: "Pincode not found. Please enter city and state manually." },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
