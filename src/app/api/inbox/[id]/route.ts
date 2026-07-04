import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET - Get single message with replies
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const message = await prisma.inboxMessage.findUnique({
      where: { id },
      include: {
        sender: {
          include: {
            profile: { select: { name: true } },
          },
        },
        recipient: {
          include: {
            profile: { select: { name: true } },
          },
        },
        application: {
          select: {
            id: true,
            applicationNumber: true,
          },
        },
        replies: {
          include: {
            sender: {
              include: {
                profile: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check if user has access to this message
    if (message.senderId !== user.id && message.recipientId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Mark as read if user is recipient
    if (message.recipientId === user.id && !message.isRead) {
      await prisma.inboxMessage.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
      });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Get message error:", error);
    return NextResponse.json({ error: "Failed to get message" }, { status: 500 });
  }
}

// POST - Reply to a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { body } = await request.json();

    if (!body?.trim()) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    // Get original message
    const originalMessage = await prisma.inboxMessage.findUnique({
      where: { id },
      include: {
        replies: true,
      },
    });

    if (!originalMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check if user has access to reply
    if (originalMessage.senderId !== user.id && originalMessage.recipientId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Determine recipient (the other person)
    const recipientId = originalMessage.senderId === user.id
      ? originalMessage.recipientId
      : originalMessage.senderId;

    // Create reply
    const reply = await prisma.inboxMessage.create({
      data: {
        senderId: user.id,
        recipientId,
        subject: `Re: ${originalMessage.subject}`,
        body,
        applicationId: originalMessage.applicationId,
        parentMessageId: originalMessage.parentMessageId || originalMessage.id,
      },
      include: {
        sender: {
          include: {
            profile: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({ message: reply });
  } catch (error) {
    console.error("Reply error:", error);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}

// PATCH - Mark message as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const message = await prisma.inboxMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.recipientId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.inboxMessage.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark read error:", error);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}
