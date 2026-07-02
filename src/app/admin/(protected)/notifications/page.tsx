"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

type Notification = {
  id: string;
  title: string;
  message: string;
  channel: string;
  createdAt: string;
  user: {
    id: string;
    userId: string;
    name: string;
    email: string;
  };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const CHANNEL_OPTIONS = [
  { value: "", label: "All Channels" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "BOTH", label: "Both" },
];

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    channel: "",
    startDate: "",
    endDate: "",
  });

  function load(page = 1) {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", "50");
    if (filters.search) params.set("search", filters.search);
    if (filters.channel) params.set("channel", filters.channel);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);

    fetch(`/api/admin/notifications?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setNotifications(d.notifications || []);
        setPagination(d.pagination);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function applyFilters() {
    load(1);
  }

  function getChannelBadge(channel: string) {
    switch (channel) {
      case "EMAIL":
        return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">Email</span>;
      case "WHATSAPP":
        return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">WhatsApp</span>;
      case "BOTH":
        return <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">Both</span>;
      default:
        return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">{channel}</span>;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification Logs</h1>
        <p className="mt-1 text-gray-600">
          View all sent notifications and emails to track communication history
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <h2 className="mb-4 font-semibold">Filters</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            placeholder="Search title/message..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
          <Select
            options={CHANNEL_OPTIONS}
            value={filters.channel}
            onChange={(e) => handleFilterChange("channel", e.target.value)}
          />
          <Input
            type="date"
            label="From Date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange("startDate", e.target.value)}
          />
          <Input
            type="date"
            label="To Date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
          />
          <div className="flex items-end">
            <Button onClick={applyFilters} className="w-full">
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="card overflow-x-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">
            Notifications {pagination && `(${pagination.total} total)`}
          </h2>
        </div>

        {loading ? (
          <p className="py-8 text-center text-gray-500">Loading...</p>
        ) : notifications.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No notifications found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 pr-4">Date & Time</th>
                <th className="pb-3 pr-4">User</th>
                <th className="pb-3 pr-4">Title</th>
                <th className="pb-3 pr-4">Channel</th>
                <th className="pb-3">Message</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    {new Date(n.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="py-3 pr-4">
                    <div>
                      <p className="font-medium">{n.user.name}</p>
                      <p className="text-xs text-gray-500">{n.user.email}</p>
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-medium">{n.title}</td>
                  <td className="py-3 pr-4">{getChannelBadge(n.channel)}</td>
                  <td className="max-w-xs truncate py-3 text-gray-600">{n.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => load(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => load(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
