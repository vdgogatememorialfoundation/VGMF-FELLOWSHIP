export interface PincodeLookupResult {
  city: string;
  state: string;
  country: string;
  district?: string;
}

export async function lookupPincode(
  pincode: string
): Promise<PincodeLookupResult | null> {
  const normalized = pincode.replace(/\D/g, "");
  if (normalized.length !== 6) return null;

  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${normalized}`,
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as Array<{
      Status?: string;
      PostOffice?: Array<{
        District?: string;
        State?: string;
        Country?: string;
        Block?: string;
        Name?: string;
      }>;
    }>;

    const entry = payload[0];
    if (!entry || entry.Status !== "Success" || !entry.PostOffice?.length) {
      return null;
    }

    const office = entry.PostOffice[0];
    const city = office.District || office.Block || office.Name || "";
    const state = office.State || "";
    const country = office.Country || "India";

    if (!city || !state) return null;

    return { city, state, country, district: office.District };
  } catch (error) {
    console.error("Pincode lookup failed:", error);
    return null;
  }
}
