import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  canAccessApplicationDocument,
  getFellowshipDocumentFile,
} from "@/lib/upload-files";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;
  const file = await getFellowshipDocumentFile(documentId);

  if (!file) {
    return NextResponse.json(
      { error: "File not found. Please upload the document again." },
      { status: 404 }
    );
  }

  const allowed = await canAccessApplicationDocument(user, file.applicationUserId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
