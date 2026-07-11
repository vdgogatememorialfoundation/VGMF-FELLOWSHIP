"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";

type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    email: string;
    profile: { name: string };
  };
  recipient: {
    id: string;
    email: string;
    profile: { name: string };
  };
  application?: {
    id: string;
    applicationNumber: string;
  };
  replies: Message[];
};

type Props = {
  userId: string;
  userRole: string;
  showApplicationFilter?: boolean;
};

export function InboxView({ userId, userRole, showApplicationFilter = false }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyLoading, setReplyLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");

  function loadMessages() {
    setLoading(true);
    fetch(`/api/inbox?folder=${activeTab}&role=${userRole}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages || []);
        setUnreadCount(d.unreadCount || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadMessages();
  }, [activeTab]);

  async function selectMessage(msg: Message) {
    setSelectedMessage(msg);
    
    if (!msg.isRead && msg.recipientId === userId) {
      await fetch(`/api/inbox/${msg.id}`, { method: "PATCH" });
      loadMessages();
    }
    
    // Load full message with replies
    const res = await fetch(`/api/inbox/${msg.id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.message) {
        setSelectedMessage(data.message);
      }
    }
  }

  async function sendReply() {
    if (!replyText.trim() || !selectedMessage) return;
    
    setReplyLoading(true);
    try {
      const res = await fetch(`/api/inbox/${selectedMessage.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText }),
      });
      
      if (res.ok) {
        setReplyText("");
        const updatedRes = await fetch(`/api/inbox/${selectedMessage.id}`);
        const updatedData = await updatedRes.json();
        if (updatedData.message) {
          setSelectedMessage(updatedData.message);
        }
        setActiveTab("sent");
      }
    } catch (error) {
      console.error(error);
    }
    setReplyLoading(false);
  }

  function getOtherParty(msg: Message) {
    return msg.senderId === userId ? msg.recipient : msg.sender;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => { setActiveTab("inbox"); setSelectedMessage(null); }}
          className={`pb-2 px-1 font-medium ${
            activeTab === "inbox"
              ? "border-b-2 border-primary-600 text-primary-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Inbox {unreadCount > 0 && <span className="ml-1 text-xs">({unreadCount})</span>}
        </button>
        <button
          onClick={() => { setActiveTab("sent"); setSelectedMessage(null); }}
          className={`pb-2 px-1 font-medium ${
            activeTab === "sent"
              ? "border-b-2 border-primary-600 text-primary-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Sent
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Message List */}
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {loading ? (
              <p className="p-4 text-center text-gray-500">Loading...</p>
            ) : messages.length === 0 ? (
              <p className="p-4 text-center text-gray-500">
                {activeTab === "inbox" ? "No messages" : "No sent messages"}
              </p>
            ) : (
              messages.map((msg) => {
                const otherParty = getOtherParty(msg);
                return (
                  <button
                    key={msg.id}
                    onClick={() => selectMessage(msg)}
                    className={`w-full p-4 text-left hover:bg-gray-50 ${
                      selectedMessage?.id === msg.id ? "bg-primary-50" : ""
                    } ${!msg.isRead && msg.recipientId === userId ? "bg-blue-50/50" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {msg.subject}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activeTab === "inbox" ? "From: " : "To: "}
                          {otherParty.profile?.name || otherParty.email}
                        </p>
                        {msg.application && (
                          <p className="text-xs text-primary-600">
                            App: {msg.application.applicationNumber}
                          </p>
                        )}
                        <p className="mt-1 line-clamp-1 text-xs text-gray-600">
                          {msg.body.substring(0, 80)}...
                        </p>
                      </div>
                      <div className="ml-2 flex flex-col items-end">
                        {!msg.isRead && msg.recipientId === userId && (
                          <span className="mb-1 h-2 w-2 rounded-full bg-primary-600"></span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className="card">
          {selectedMessage ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-semibold text-gray-900">{selectedMessage.subject}</h2>
                <p className="text-sm text-gray-500">
                  {activeTab === "inbox" ? "From: " : "To: "}
                  {getOtherParty(selectedMessage).profile?.name || getOtherParty(selectedMessage).email}
                  {" "}
                  <span className="text-gray-400">
                    {new Date(selectedMessage.createdAt).toLocaleString()}
                  </span>
                </p>
                {selectedMessage.application && (
                  <p className="text-sm text-primary-600">
                    Application: {selectedMessage.application.applicationNumber}
                  </p>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[400px]">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{selectedMessage.body}</p>
                </div>
                
                {selectedMessage.replies?.map((reply) => (
                  <div
                    key={reply.id}
                    className={`rounded-lg p-4 ${
                      reply.senderId === userId
                        ? "bg-primary-50 ml-8"
                        : "bg-gray-50 mr-8"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">
                        {reply.sender.profile?.name || reply.sender.email}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(reply.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{reply.body}</p>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    onClick={sendReply}
                    loading={replyLoading}
                    disabled={!replyText.trim()}
                  >
                    Send Reply
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-500">
              Select a message to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
