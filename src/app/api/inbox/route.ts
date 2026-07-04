import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET - Get user's inbox messages
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const folder = searchParams.get("folder") || "inbox"; // inbox or sent

  try {
    let where: Record<string, unknown> = {};

    if (folder === "inbox") {
      where = {
        recipientId: user.id,
        parentMessageId: null,
      };
    } else if (folder === "sent") {
      where = {
        senderId: user.id,
        parentMessageId: null,
      };
    }

    const [messages, total] = await Promise.all([
      prisma.inboxMessage.findMany({
        where,
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
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inboxMessage.count({ where }),
    ]);

    // Get unread count
    const unreadCount = await prisma.inboxMessage.count({
      where: {
        recipientId: user.id,
        isRead: false,
        parentMessageId: null,
      },
    });

    return NextResponse.json({
      messages,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Inbox error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST - Send a new message
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { recipientId, subject, body, applicationId } = await request.json();

    if (!recipientId || !subject || !body) {
      return NextResponse.json(
        { error: "Recipient, subject, and body are required" },
        { status: 400 }
      );
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    const message = await prisma.inboxMessage.create({
      data: {
        senderId: user.id,
        recipientId,
        subject,
        body,
        applicationId,
      },
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
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
