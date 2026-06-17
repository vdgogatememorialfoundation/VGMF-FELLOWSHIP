import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings, pages, notices, forms] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.cmsPage.findMany({ orderBy: { slug: "asc" } }),
    prisma.notice.findMany({ orderBy: { priority: "desc" } }),
    prisma.formTemplate.findMany({
      include: { fields: { orderBy: { order: "asc" } } },
    }),
  ]);

  return NextResponse.json({ settings, pages, notices, forms });
}

export async function PUT(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { section, data } = body;

  if (section === "settings") {
    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });
    return NextResponse.json({ settings });
  }

  if (section === "page") {
    const page = await prisma.cmsPage.upsert({
      where: { slug: data.slug },
      update: {
        title: data.title,
        content: data.content,
        isPublished: data.isPublished ?? true,
      },
      create: {
        slug: data.slug,
        title: data.title,
        content: data.content,
        isPublished: data.isPublished ?? true,
      },
    });
    return NextResponse.json({ page });
  }

  if (section === "notice") {
    if (data.id) {
      const notice = await prisma.notice.update({
        where: { id: data.id },
        data,
      });
      return NextResponse.json({ notice });
    }
    const notice = await prisma.notice.create({ data });
    return NextResponse.json({ notice });
  }

  if (section === "form-template") {
    const template = await prisma.formTemplate.upsert({
      where: { slug: data.slug },
      update: {
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
      },
      create: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        isActive: data.isActive ?? true,
      },
    });
    return NextResponse.json({ template });
  }

  if (section === "form-field") {
    if (data.id) {
      const field = await prisma.formField.update({
        where: { id: data.id },
        data,
      });
      return NextResponse.json({ field });
    }
    const field = await prisma.formField.create({ data });
    return NextResponse.json({ field });
  }

  return NextResponse.json({ error: "Invalid section" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  if (type === "notice") {
    await prisma.notice.delete({ where: { id } });
  } else if (type === "form-field") {
    await prisma.formField.delete({ where: { id } });
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("logo") as File;

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "site");
  await mkdir(uploadDir, { recursive: true });

  const fileName = `logo_${Date.now()}_${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, fileName), buffer);

  const logoUrl = `/uploads/site/${fileName}`;

  const settings = await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: { logoUrl },
    create: { id: "default", siteName: "VGMF Fellowship Portal 2026", logoUrl },
  });

  return NextResponse.json({ settings, logoUrl });
}
