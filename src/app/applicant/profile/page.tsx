"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { RESEARCH_AREAS, BUDGET_MAX, MANDATORY_DOCUMENTS, OPTIONAL_DOCUMENTS, formatCurrency } from "@/lib/utils";

function ApplicantProfileContent() {
  const [profile, setProfile] = useState({
    name: "",
    dob: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
  });
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile({
            name: data.profile.name || "",
            dob: data.profile.dob ? data.profile.dob.split("T")[0] : "",
            gender: data.profile.gender || "",
            address: data.profile.address || "",
            city: data.profile.city || "",
            state: data.profile.state || "",
            country: data.profile.country || "India",
            pincode: data.profile.pincode || "",
          });
        }
        setUserId(data.userId || "");
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    const data = await res.json();
    setLoading(false);
    setMessage(res.ok ? "Profile updated successfully!" : data.error);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        <p className="mt-1 text-gray-600">User ID: {userId}</p>
      </div>

      {message && (
        <div className={`rounded-lg p-3 text-sm ${message.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="card space-y-4">
        <Input label="Full Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
        <Input label="Date of Birth" type="date" value={profile.dob} onChange={(e) => setProfile({ ...profile, dob: e.target.value })} />
        <Select
          label="Gender"
          value={profile.gender}
          onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
          options={[
            { value: "MALE", label: "Male" },
            { value: "FEMALE", label: "Female" },
            { value: "OTHER", label: "Other" },
            { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
          ]}
        />
        <Textarea label="Address" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="City" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
          <Input label="State" value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Country" value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} />
          <Input label="Pincode" value={profile.pincode} onChange={(e) => setProfile({ ...profile, pincode: e.target.value })} />
        </div>
        <Button type="submit" loading={loading}>Save Profile</Button>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return <ApplicantProfileContent />;
}
