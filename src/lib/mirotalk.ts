import { getIntegrationConfig } from "./integrations";

interface MiroTalkRoom {
  room: string;
  uuid: string;
  created: string;
}

interface CreateRoomOptions {
  room: string;
  attendee?: string;
  duration?: number;
}

export async function isMiroTalkConfigured(): Promise<boolean> {
  const config = await getIntegrationConfig();
  return !!(config.mirotalkEnabled && config.mirotalkUrl && config.mirotalkApiKey);
}

export async function createMiroTalkRoom(
  options: CreateRoomOptions
): Promise<{ success: boolean; room?: MiroTalkRoom; error?: string }> {
  const config = await getIntegrationConfig();
  
  if (!config.mirotalkEnabled || !config.mirotalkUrl || !config.mirotalkApiKey) {
    return { success: false, error: "MiroTalk is not configured" };
  }

  try {
    const response = await fetch(`${config.mirotalkUrl}/api/v1/room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.mirotalkApiKey}`,
      },
      body: JSON.stringify({
        room: options.room,
        attendee: options.attendee || "guest",
        duration: options.duration || 60, // Default 60 minutes
        properties: {
          maxParticipants: 10,
          enableScreenSharing: true,
          enableChat: true,
          enableRecord: false,
          welcomeMessage: "Welcome to the VGMF Fellowship Interview",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("MiroTalk API error:", error);
      return { success: false, error: `MiroTalk API error: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      room: {
        room: data.room,
        uuid: data.uuid,
        created: data.created,
      },
    };
  } catch (error) {
    console.error("MiroTalk connection error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect to MiroTalk",
    };
  }
}

export async function getMiroTalkRoom(roomId: string): Promise<{ success: boolean; room?: MiroTalkRoom; error?: string }> {
  const config = await getIntegrationConfig();
  
  if (!config.mirotalkEnabled || !config.mirotalkUrl || !config.mirotalkApiKey) {
    return { success: false, error: "MiroTalk is not configured" };
  }

  try {
    const response = await fetch(`${config.mirotalkUrl}/api/v1/room/${roomId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.mirotalkApiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Room not found" };
      }
      return { success: false, error: `MiroTalk API error: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      room: {
        room: data.room,
        uuid: data.uuid,
        created: data.created,
      },
    };
  } catch (error) {
    console.error("MiroTalk connection error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect to MiroTalk",
    };
  }
}

export async function deleteMiroTalkRoom(roomId: string): Promise<{ success: boolean; error?: string }> {
  const config = await getIntegrationConfig();
  
  if (!config.mirotalkEnabled || !config.mirotalkUrl || !config.mirotalkApiKey) {
    return { success: false, error: "MiroTalk is not configured" };
  }

  try {
    const response = await fetch(`${config.mirotalkUrl}/api/v1/room/${roomId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${config.mirotalkApiKey}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      return { success: false, error: `MiroTalk API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error("MiroTalk connection error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect to MiroTalk",
    };
  }
}

export function generateMeetingRoomId(applicationId: string, interviewId?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const appShort = applicationId.slice(-6).toLowerCase();
  return `vgmf-${appShort}-${timestamp}-${random}`;
}

export function getMiroTalkJoinUrl(roomId: string, name: string, config?: { mirotalkUrl?: string }): string {
  const baseUrl = config?.mirotalkUrl || process.env.MIROTALK_URL || "https://mirotalk.up.railway.app";
  const encodedName = encodeURIComponent(name);
  return `${baseUrl}/join?room=${roomId}&name=${encodedName}`;
}

export function isMeetingLinkAccessible(
  scheduledDate: Date,
  scheduledTime: string,
  accessMinutes: number = 15
): { accessible: boolean; minutesUntilAccess: number; meetingStartTime: Date } {
  const [hours, minutes] = scheduledTime.split(":").map(Number);
  const meetingStartTime = new Date(scheduledDate);
  meetingStartTime.setHours(hours, minutes, 0, 0);
  
  const now = new Date();
  const accessTime = new Date(meetingStartTime);
  accessTime.setMinutes(accessTime.getMinutes() - accessMinutes);
  
  const minutesUntilAccess = Math.ceil((accessTime.getTime() - now.getTime()) / (1000 * 60));
  const accessible = minutesUntilAccess <= 0;
  
  return {
    accessible,
    minutesUntilAccess: Math.max(0, minutesUntilAccess),
    meetingStartTime,
  };
}
