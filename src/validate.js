/** Form checks for Mentor Desk. Run: node --test */

export const TRACKS = [
  "Zscaler ZIA",
  "Zscaler ZPA",
  "Palo Alto NGFW",
  "Prisma Access",
  "FortiGate",
  "F5 BIG-IP",
  "Cisco ISE",
  "Cisco FMC",
  "Check Point",
  "Cloudflare",
  "Cloudflare WAF",
  "Barracuda WAF",
  "Akamai",
  "Cybersecurity",
  "Cloud security",
  "Penetration testing",
  "Azure security",
  "AWS security",
  "SOC / SIEM",
  "Network troubleshooting",
];

export const PLANS = ["weekly", "monthly"];
export const PLATFORM_CUT = 0.2;
export const MIN_RATE = 500;
export const MAX_RATE = 100000;

export function mentorShare(amount) {
  const n = Number(amount);
  if (!Number.isInteger(n) || n < 0) return 0;
  return Math.round(n * (1 - PLATFORM_CUT));
}

export function slugify(name) {
  const s = String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "mentor";
}

function clipped(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

export function cleanEmail(value) {
  const s = clipped(value, 120).toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(s)) return "";
  return s;
}

export function cleanPhone(value) {
  const digits = clipped(value, 24).replace(/[^\d]/g, "");
  if (digits.length < 8 || digits.length > 15) return "";
  return digits;
}

export function cleanName(value) {
  const s = clipped(value, 80).replace(/\s+/g, " ");
  if (s.length < 2 || /[<>]/.test(s)) return "";
  return s;
}

export function cleanText(value, min, max) {
  const s = clipped(value, max).replace(/\s+/g, " ");
  if (s.length < min || /[<>]/.test(s)) return "";
  return s;
}

export function cleanTracks(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    const track = String(item || "").trim();
    if (TRACKS.includes(track) && !out.includes(track)) out.push(track);
  }
  return out.slice(0, 6);
}

export function cleanRate(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < MIN_RATE || n > MAX_RATE) return 0;
  return n;
}

export function cleanYears(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 40) return 0;
  return n;
}

export function cleanUrl(value) {
  const s = clipped(value, 200);
  if (!s) return "";
  try {
    const url = new URL(s);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function cleanUpi(value) {
  const s = clipped(value, 80).replace(/\s+/g, "");
  if (!s) return null;
  if (!/^[\w.\-@]{3,80}$/.test(s)) return null;
  return s;
}

export function isHoneypot(body) {
  return Boolean(String(body?.tc_leave_blank || "").trim());
}

export function cleanShowProfile(value) {
  if (value === true || value === 1 || value === "1" || value === "true" || value === "yes" || value === "on") return 1;
  if (value === false || value === 0 || value === "0" || value === "false" || value === "no" || value === "off") return 0;
  return 1;
}

export function parseSeat(body) {
  if (!body || typeof body !== "object") return { error: "Form was empty." };
  if (isHoneypot(body)) return { honeypot: true };
  const mentorSlug = String(body.mentor_slug || "");
  if (!/^[a-z0-9-]{2,60}$/.test(mentorSlug)) return { error: "Pick a mentor from the list." };
  const name = cleanName(body.name);
  const email = cleanEmail(body.email);
  const phone = cleanPhone(body.phone);
  const goal = cleanText(body.goal, 20, 800);
  const plan = PLANS.includes(body.plan) ? body.plan : "";
  if (!name) return { error: "Add your name." };
  if (!email) return { error: "Add a real email." };
  if (!phone) return { error: "Add a WhatsApp number with country code." };
  if (!plan) return { error: "Pick weekly or monthly." };
  if (!goal) return { error: "Tell the mentor what you are stuck on, in a sentence or two." };
  return { value: { mentor_slug: mentorSlug, name, email, phone, goal, plan } };
}

export function parseApply(body) {
  if (!body || typeof body !== "object") return { error: "Form was empty." };
  if (isHoneypot(body)) return { honeypot: true };
  const name = cleanName(body.name);
  const email = cleanEmail(body.email);
  const phone = cleanPhone(body.phone);
  const tracks = cleanTracks(body.tracks);
  const years = cleanYears(body.years);
  const weekly = cleanRate(body.weekly_inr);
  const monthly = cleanRate(body.monthly_inr);
  const bio = cleanText(body.bio, 80, 1200);
  const linkedin = cleanUrl(body.linkedin);
  const payout = cleanUpi(body.payout_upi);
  const showProfile = cleanShowProfile(body.show_profile);
  if (!name) return { error: "Add your name." };
  if (!email) return { error: "Add a real email." };
  if (!phone) return { error: "Add a WhatsApp number with country code." };
  if (!tracks.length) return { error: "Pick at least one track you can teach." };
  if (!years) return { error: "Add how many years you have done this work." };
  if (!weekly) return { error: "Set a weekly price between ₹500 and ₹1,00,000." };
  if (!monthly) return { error: "Set a monthly price between ₹500 and ₹1,00,000." };
  if (monthly < weekly) return { error: "Monthly price should be at least the weekly price." };
  if (!bio) return { error: "Write a short bio, at least a few sentences, with no HTML." };
  if (linkedin === null) return { error: "LinkedIn link must start with https, or leave it blank." };
  if (!payout) return { error: "Add the UPI id where Techclick should send your share." };
  return {
    value: {
      name, email, phone, tracks, years, weekly_inr: weekly, monthly_inr: monthly,
      bio, linkedin: linkedin || "", payout_upi: payout, show_profile: showProfile,
    },
  };
}
