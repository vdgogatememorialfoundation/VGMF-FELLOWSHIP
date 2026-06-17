import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { profileSchema } from "@/lib/validations";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({ profile, userId: user.userId });
}

export async function PUT(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        name: data.name,
        dob: data.dob ? new Date(data.dob) : undefined,
        gender: data.gender,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        pincode: data.pincode,
      },
      create: {
        userId: user.id,
        name: data.name,
        dob: data.dob ? new Date(data.dob) : undefined,
        gender: data.gender,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country || "India",
        pincode: data.pincode,
      },
    });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
