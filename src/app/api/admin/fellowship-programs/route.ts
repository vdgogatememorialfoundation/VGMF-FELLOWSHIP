import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

const ALLOWED_ROLES = new Set(["ADMIN", "STAFF", "COADMIN"]);

// GET - List fellowship programs
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const programs = await prisma.fellowshipProgram.findMany({
      include: {
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      programs: programs.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        year: p.year,
        isActive: p.isActive,
        applicantCount: p._count.applications,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching programs:", error);
    return NextResponse.json({ error: "Failed to fetch programs" }, { status: 500 });
  }
}

// POST - Create fellowship program
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, year } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const program = await prisma.fellowshipProgram.create({
      data: {
        name,
        description,
        year,
      },
    });

    return NextResponse.json({ success: true, program });
  } catch (error) {
    console.error("Error creating program:", error);
    return NextResponse.json({ error: "Failed to create program" }, { status: 500 });
  }
}
