import prisma from "./db";

export const MAX_NOTICE_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function getNoticeAttachmentUrl(noticeId: string): string {
  return `/api/notices/${noticeId}/attachment`;
}

export function hasNoticeAttachment(notice: {
  attachmentData?: string | null;
}): boolean {
  return Boolean(notice.attachmentData);
}

export async function parseNoticeAttachment(file: File) {
  if (!file || file.size === 0) {
    throw new Error("No file selected");
  }

  if (file.size > MAX_NOTICE_ATTACHMENT_BYTES) {
    throw new Error("Attachment must be 5 MB or smaller");
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_ATTACHMENT_TYPES.has(mimeType)) {
    throw new Error("Unsupported file type. Use PDF, Word, or image files.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    attachmentFileName: file.name,
    attachmentMimeType: mimeType,
    attachmentData: buffer.toString("base64"),
  };
}

export async function getNoticeAttachment(noticeId: string) {
  const notice = await prisma.notice.findUnique({
    where: { id: noticeId },
    select: {
      attachmentData: true,
      attachmentMimeType: true,
      attachmentFileName: true,
      isActive: true,
      expiresAt: true,
    },
  });

  if (!notice?.attachmentData) return null;

  const now = new Date();
  if (
    !notice.isActive ||
    (notice.expiresAt && notice.expiresAt <= now)
  ) {
    return null;
  }

  return {
    data: Buffer.from(notice.attachmentData, "base64"),
    mimeType: notice.attachmentMimeType || "application/octet-stream",
    fileName: notice.attachmentFileName || "notice-attachment",
  };
}

export function formatNoticeForPublic<
  T extends {
    id: string;
    title: string;
    content: string;
    category: string;
    linkUrl?: string | null;
    linkLabel?: string | null;
    attachmentFileName?: string | null;
    attachmentData?: string | null;
    priority: number;
    publishedAt: Date;
    expiresAt?: Date | null;
  },
>(notice: T) {
  return {
    id: notice.id,
    title: notice.title,
    content: notice.content,
    category: notice.category,
    linkUrl: notice.linkUrl,
    linkLabel: notice.linkLabel,
    attachmentFileName: notice.attachmentFileName,
    hasAttachment: hasNoticeAttachment(notice),
    attachmentUrl: hasNoticeAttachment(notice)
      ? getNoticeAttachmentUrl(notice.id)
      : null,
    priority: notice.priority,
    publishedAt: notice.publishedAt.toISOString(),
    expiresAt: notice.expiresAt?.toISOString() ?? null,
  };
}

export function formatNoticeForAdmin<
  T extends {
    id: string;
    attachmentData?: string | null;
    attachmentFileName?: string | null;
  },
>(notice: T) {
  const rest = { ...notice };
  delete (rest as { attachmentData?: string | null }).attachmentData;
  return {
    ...rest,
    hasAttachment: hasNoticeAttachment(notice),
    attachmentUrl: hasNoticeAttachment(notice)
      ? getNoticeAttachmentUrl(notice.id)
      : null,
  };
}
