/**
 * Techclick Mentor Desk — mentor.techclick.in
 * Run locally: npm run dev    Ship: npm run deploy
 */
import {
  PLATFORM_CUT,
  TRACKS,
  mentorShare,
  parseApply,
  parseSeat,
  slugify,
  cleanRate,
} from "./validate.js";

const PAGES = {
  "/": {
    title: "Techclick Mentor Desk — pick a networking mentor",
    description:
      "Networking and security engineers pick a mentor and pay weekly or monthly. Mentors keep 80 percent of the seat. Apply to teach and earn.",
  },
  "/mentors": {
    title: "Mentors on the Techclick desk",
    description: "Browse live networking mentors. Choose a weekly seat or a monthly seat.",
  },
  "/enroll": {
    title: "Enroll with a Techclick mentor",
    description: "Students pick a mentor, then choose a weekly seat or a monthly seat. Techclick confirms before payment.",
  },
  "/join": {
    title: "Become a Techclick mentor and earn",
    description:
      "Teach Zscaler, Palo Alto, FortiGate, F5, Cisco, or the track you already run. Set a weekly price and a monthly price. You keep 80 percent.",
  },
  "/how": {
    title: "How Mentor Desk pay works",
    description:
      "A mentee requests a week or a month. Techclick confirms payment. The mentor receives 80 percent. Techclick keeps 20 percent.",
  },
  "/desk": {
    title: "Mentor Desk — private",
    description: "Private desk for Techclick.",
    robots: "noindex, nofollow",
  },
};

function json(data, status = 200, extra = {}) {
  const headers = new Headers(extra);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  securityHeaders(headers);
  return new Response(JSON.stringify(data), { status, headers });
}

function securityHeaders(headers) {
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-frame-options", "DENY");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set(
    "content-security-policy",
    "default-src 'self'; img-src 'self' data:; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
  );
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function referenceOf(id) {
  return String(id).replace(/-/g, "").slice(0, 8).toUpperCase();
}

async function notifyDesk(env, payload) {
  try {
    if (!env.MENTOR_MAIL || typeof env.MENTOR_MAIL.alert !== "function") return false;
    const result = await env.MENTOR_MAIL.alert(payload);
    return Boolean(result && result.ok);
  } catch (error) {
    console.error(JSON.stringify({
      message: "desk mail failed",
      error: error instanceof Error ? error.message : "mail",
    }));
    return false;
  }
}

function publicMentor(row) {
  let tracks = [];
  let offers = [];
  try {
    const parsed = JSON.parse(row.tracks);
    if (Array.isArray(parsed)) tracks = parsed;
  } catch {
    tracks = [];
  }
  try {
    const parsedOffers = JSON.parse(row.offers || "[]");
    if (Array.isArray(parsedOffers)) offers = parsedOffers;
  } catch {
    offers = [];
  }
  return {
    slug: row.slug,
    name: row.name,
    headline: row.headline,
    bio: row.bio,
    tracks,
    years: row.years,
    city: row.city,
    languages: row.languages,
    weekly_inr: row.weekly_inr,
    monthly_inr: row.monthly_inr,
    weekly_includes: row.weekly_includes,
    monthly_includes: row.monthly_includes,
    weekly_share_inr: mentorShare(row.weekly_inr),
    monthly_share_inr: mentorShare(row.monthly_inr),
    seats: row.seats,
    verified: row.verified === 1,
    founding: row.is_founding === 1,
    offers,
    rating_out_of: Number(row.rating_out_of || 0),
    rating_count: Number(row.rating_count || 0),
    students_trained: Number(row.students_trained || 0),
    interviews_taken: Number(row.interviews_taken || 0),
    interviews_given: Number(row.interviews_given || 0),
  };
}

async function readJson(request) {
  const claimed = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(claimed) && claimed > 20000) return { error: "That form is too long." };
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) return { error: "Send the form as JSON." };
  let raw = "";
  try {
    raw = await request.text();
  } catch (error) {
    console.error(JSON.stringify({ message: "body read failed", error: error instanceof Error ? error.message : "read" }));
    return { error: "Could not read the form." };
  }
  if (raw.length > 20000) return { error: "That form is too long." };
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return { error: "Form was empty." };
    return { data };
  } catch {
    return { error: "Form was not valid." };
  }
}

function originAllowed(request, url) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === url.origin;
}

async function deskAuthorized(request, env) {
  const provided = request.headers.get("x-desk-key") || "";
  const expected = env.DESK_KEY || "";
  const enc = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(provided)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(left, right);
}

async function requireDesk(request, env) {
  if (!env.DESK_KEY || env.DESK_KEY.length < 16) {
    return json({ ok: false, error: "Desk key is not turned on yet." }, 503);
  }
  if (!(await deskAuthorized(request, env))) {
    return json({ ok: false, error: "That desk key is not right." }, 401);
  }
  return null;
}

async function handleApi(request, env, url) {
  if (!originAllowed(request, url)) return json({ ok: false, error: "This form only works on the Mentor Desk site." }, 403);
  const path = url.pathname;

  if (request.method === "GET" && path === "/api/health") {
    return json({ ok: true, service: "mentor-desk" });
  }

  if (request.method === "GET" && path === "/api/catalog") {
    return json({
      ok: true,
      cut: PLATFORM_CUT,
      tracks: TRACKS,
      support_whatsapp: env.SUPPORT_WHATSAPP,
      support_email: env.SUPPORT_EMAIL,
      public_url: env.PUBLIC_URL,
    });
  }

  if (request.method === "GET" && path === "/api/mentors") {
    const rows = await env.DB.prepare(
      "SELECT * FROM mentors WHERE status = 'live' AND show_profile = 1 ORDER BY is_founding DESC, name ASC",
    ).all();
    return json({ ok: true, mentors: (rows.results || []).map(publicMentor) });
  }

  const mentorMatch = path.match(/^\/api\/mentors\/([a-z0-9-]{2,60})$/);
  if (request.method === "GET" && mentorMatch) {
    const row = await env.DB.prepare(
      "SELECT * FROM mentors WHERE slug = ? AND status = 'live' AND show_profile = 1",
    ).bind(mentorMatch[1]).first();
    if (!row) return json({ ok: false, error: "That mentor is not showing a public profile." }, 404);
    const open = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM seat_requests WHERE mentor_id = ? AND status IN ('requested','confirmed','paid')",
    ).bind(row.id).first();
    const card = publicMentor(row);
    card.seats_left = Math.max(0, row.seats - Number(open?.n || 0));
    return json({ ok: true, mentor: card });
  }

  if (request.method === "POST" && path === "/api/requests") {
    const body = await readJson(request);
    if (body.error) return json({ ok: false, error: body.error }, 400);
    const parsed = parseSeat(body.data);
    if (parsed.honeypot) return json({ ok: true, reference: "RECEIVED", message: "Request received." });
    if (parsed.error) return json({ ok: false, error: parsed.error }, 400);
    const seat = parsed.value;
    const mentor = await env.DB.prepare(
      "SELECT * FROM mentors WHERE slug = ? AND status = 'live' AND show_profile = 1",
    ).bind(seat.mentor_slug).first();
    if (!mentor) return json({ ok: false, error: "Pick a mentor who is showing a public profile." }, 404);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM seat_requests WHERE email = ? AND created_at > ?",
    ).bind(seat.email, hourAgo).first();
    if (Number(recent?.n || 0) >= 3) {
      return json({ ok: false, error: "Too many requests from this email in the last hour. Wait, or message Techclick on WhatsApp." }, 429);
    }
    const existing = await env.DB.prepare(
      "SELECT id FROM seat_requests WHERE email = ? AND mentor_id = ? AND status IN ('requested','confirmed')",
    ).bind(seat.email, mentor.id).first();
    if (existing) {
      return json({
        ok: false,
        error: `You already have an open request with this mentor. Reference ${referenceOf(existing.id)}.`,
        reference: referenceOf(existing.id),
      }, 409);
    }
    const open = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM seat_requests WHERE mentor_id = ? AND status IN ('requested','confirmed','paid')",
    ).bind(mentor.id).first();
    if (Number(open?.n || 0) >= mentor.seats) {
      return json({ ok: false, error: "This mentor has no open seat right now. Pick another mentor, or message Techclick on WhatsApp." }, 409);
    }
    const amount = seat.plan === "weekly" ? mentor.weekly_inr : mentor.monthly_inr;
    const share = mentorShare(amount);
    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO seat_requests
        (id, mentor_id, name, email, phone, goal, plan, amount_inr, mentor_share_inr, status, payout_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', 'pending', ?)`,
    ).bind(id, mentor.id, seat.name, seat.email, seat.phone, seat.goal, seat.plan, amount, share, new Date().toISOString()).run();
    const reference = referenceOf(id);
    const mailed = await notifyDesk(env, {
      subject: `Mentor Desk request ${reference}`,
      intro: "A student submitted a mentor seat request.",
      replyEmail: seat.email,
      replyName: seat.name,
      lines: [
        { label: "Reference", value: reference },
        { label: "Student", value: seat.name },
        { label: "Email", value: seat.email },
        { label: "WhatsApp", value: seat.phone },
        { label: "Mentor", value: mentor.name },
        { label: "Seat", value: seat.plan },
        { label: "Amount", value: `INR ${amount}` },
        { label: "Mentor share", value: `INR ${share}` },
        { label: "Stuck on", value: seat.goal },
      ],
    });
    if (mailed) {
      await env.DB.prepare("UPDATE seat_requests SET email_sent = 1 WHERE id = ?").bind(id).run();
    }
    console.log(JSON.stringify({ event: "seat_request", reference, plan: seat.plan, mailed }));
    return json({
      ok: true,
      reference,
      plan: seat.plan,
      amount_inr: amount,
      mentor_share_inr: share,
      platform_share_inr: amount - share,
      mentor_name: mentor.name,
      mailed,
      message: "Request received. Techclick will confirm on email or WhatsApp and send the payment step.",
    }, 201);
  }

  if (request.method === "POST" && path === "/api/apply") {
    const body = await readJson(request);
    if (body.error) return json({ ok: false, error: body.error }, 400);
    const parsed = parseApply(body.data);
    if (parsed.honeypot) return json({ ok: true, reference: "RECEIVED", message: "Application received." });
    if (parsed.error) return json({ ok: false, error: parsed.error }, 400);
    const app = parsed.value;
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM mentor_applications WHERE email = ? AND created_at > ?",
    ).bind(app.email, hourAgo).first();
    if (Number(recent?.n || 0) >= 2) {
      return json({ ok: false, error: "You already applied recently. Techclick will review the application you sent." }, 429);
    }
    const pending = await env.DB.prepare(
      "SELECT id FROM mentor_applications WHERE email = ? AND status = 'pending'",
    ).bind(app.email).first();
    if (pending) {
      return json({
        ok: false,
        error: `Your application is already in review. Reference ${referenceOf(pending.id)}.`,
        reference: referenceOf(pending.id),
      }, 409);
    }
    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO mentor_applications
        (id, name, email, phone, tracks, years, weekly_inr, monthly_inr, bio, linkedin, payout_upi, status, mentor_slug, show_profile, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)`,
    ).bind(
      id, app.name, app.email, app.phone, JSON.stringify(app.tracks), app.years,
      app.weekly_inr, app.monthly_inr, app.bio, app.linkedin, app.payout_upi, app.show_profile, new Date().toISOString(),
    ).run();
    const reference = referenceOf(id);
    const mailed = await notifyDesk(env, {
      subject: `Mentor application ${reference}`,
      intro: "Someone applied to mentor on the desk.",
      replyEmail: app.email,
      replyName: app.name,
      lines: [
        { label: "Reference", value: reference },
        { label: "Name", value: app.name },
        { label: "Email", value: app.email },
        { label: "WhatsApp", value: app.phone },
        { label: "Tracks", value: app.tracks.join(", ") },
        { label: "Years", value: String(app.years) },
        { label: "Weekly price", value: `INR ${app.weekly_inr}` },
        { label: "Monthly price", value: `INR ${app.monthly_inr}` },
        { label: "Profile", value: app.show_profile ? "Show" : "Hidden" },
        { label: "UPI", value: app.payout_upi },
        { label: "Bio", value: app.bio },
      ],
    });
    if (mailed) {
      await env.DB.prepare("UPDATE mentor_applications SET email_sent = 1 WHERE id = ?").bind(id).run();
    }
    console.log(JSON.stringify({ event: "mentor_application", reference, mailed }));
    return json({
      ok: true,
      reference: referenceOf(id),
      weekly_share_inr: mentorShare(app.weekly_inr),
      monthly_share_inr: mentorShare(app.monthly_inr),
      show_profile: app.show_profile,
      message: app.show_profile
        ? "Application received. If Techclick approves it, students can see your profile and pick you."
        : "Application received. If Techclick approves it, your profile stays hidden until you choose to show it.",
    }, 201);
  }

  if (path.startsWith("/api/desk")) {
    const denied = await requireDesk(request, env);
    if (denied) return denied;
    return handleDesk(request, env, path);
  }

  return json({ ok: false, error: "Not found." }, 404);
}

async function handleDesk(request, env, path) {
  if (request.method === "GET" && path === "/api/desk/board") {
    const [applications, requests, mentors] = await Promise.all([
      env.DB.prepare("SELECT * FROM mentor_applications ORDER BY created_at DESC LIMIT 100").all(),
      env.DB.prepare(
        `SELECT r.*, m.name AS mentor_name, m.slug AS mentor_slug, m.is_founding
         FROM seat_requests r JOIN mentors m ON m.id = r.mentor_id
         ORDER BY r.created_at DESC LIMIT 100`,
      ).all(),
      env.DB.prepare("SELECT id, slug, name, status, weekly_inr, monthly_inr, seats, is_founding, show_profile FROM mentors ORDER BY is_founding DESC, name").all(),
    ]);
    return json({
      ok: true,
      applications: applications.results || [],
      requests: (requests.results || []).map((row) => ({ ...row, reference: referenceOf(row.id) })),
      mentors: mentors.results || [],
    });
  }

  if (request.method !== "POST") return json({ ok: false, error: "Not found." }, 404);
  const body = await readJson(request);
  if (body.error) return json({ ok: false, error: body.error }, 400);
  const data = body.data;

  if (path === "/api/desk/application") {
    const id = String(data.id || "");
    const action = data.action === "approve" || data.action === "decline" ? data.action : "";
    if (!/^[0-9a-f-]{36}$/i.test(id) || !action) return json({ ok: false, error: "Pick an application and an action." }, 400);
    const app = await env.DB.prepare("SELECT * FROM mentor_applications WHERE id = ?").bind(id).first();
    if (!app || app.status !== "pending") return json({ ok: false, error: "That application is already handled." }, 409);
    if (action === "decline") {
      const result = await env.DB.prepare(
        "UPDATE mentor_applications SET status = 'declined' WHERE id = ? AND status = 'pending'",
      ).bind(id).run();
      if (!result.meta?.changes) return json({ ok: false, error: "That application is already handled." }, 409);
      return json({ ok: true });
    }
    let slug = slugify(app.name);
    for (let n = 2; n < 40; n += 1) {
      const taken = await env.DB.prepare("SELECT id FROM mentors WHERE slug = ?").bind(slug).first();
      if (!taken) break;
      slug = `${slugify(app.name)}-${n}`;
    }
    let trackLabel = "Networking";
    try {
      const parsedTracks = JSON.parse(app.tracks);
      if (Array.isArray(parsedTracks) && parsedTracks.length) trackLabel = parsedTracks.slice(0, 3).join(", ");
    } catch {
      trackLabel = "Networking";
    }
    const mentorId = crypto.randomUUID();
    const weeklyIncludes = "One 60-minute working call on the issue the mentee brings, plus written replies for 7 days on that same issue.";
    const monthlyIncludes = "Four 60-minute working calls in the month, plus written replies on the issues the mentee brings that month.";
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO mentors
          (id, slug, name, headline, bio, tracks, years, city, languages, weekly_inr, monthly_inr,
           weekly_includes, monthly_includes, seats, status, verified, is_founding, show_profile, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Live online, India', 'Hindi and English', ?, ?, ?, ?, 3, 'live', 1, 0, ?, ?)`,
      ).bind(
        mentorId, slug, app.name, `${app.years} years · ${trackLabel}`,
        app.bio, app.tracks, app.years, app.weekly_inr, app.monthly_inr, weeklyIncludes, monthlyIncludes,
        Number(app.show_profile) === 1 ? 1 : 0, new Date().toISOString(),
      ),
      env.DB.prepare(
        "UPDATE mentor_applications SET status = 'approved', mentor_slug = ? WHERE id = ? AND status = 'pending'",
      ).bind(slug, id),
    ]);
    console.log(JSON.stringify({ event: "mentor_approved", slug }));
    return json({ ok: true, slug });
  }

  if (path === "/api/desk/request") {
    const id = String(data.id || "");
    const allowed = ["requested", "confirmed", "paid", "closed"];
    const status = allowed.includes(data.status) ? data.status : "";
    if (!/^[0-9a-f-]{36}$/i.test(id) || !status) return json({ ok: false, error: "Pick a request and a status." }, 400);
    const payout = data.payout_status === "sent" ? "sent" : data.payout_status === "pending" ? "pending" : "";
    const result = payout
      ? await env.DB.prepare("UPDATE seat_requests SET status = ?, payout_status = ? WHERE id = ?").bind(status, payout, id).run()
      : await env.DB.prepare("UPDATE seat_requests SET status = ? WHERE id = ?").bind(status, id).run();
    if (!result.meta?.changes) return json({ ok: false, error: "That request was not found." }, 404);
    return json({ ok: true });
  }

  if (path === "/api/desk/price") {
    const id = String(data.id || "");
    const weekly = cleanRate(data.weekly_inr);
    const monthly = cleanRate(data.monthly_inr);
    if (!/^[0-9a-z-]{2,80}$/i.test(id) || !weekly || !monthly || monthly < weekly) {
      return json({ ok: false, error: "Set a weekly price and a monthly price. Monthly should be at least the weekly price." }, 400);
    }
    const result = await env.DB.prepare(
      "UPDATE mentors SET weekly_inr = ?, monthly_inr = ? WHERE id = ?",
    ).bind(weekly, monthly, id).run();
    if (!result.meta?.changes) return json({ ok: false, error: "That mentor was not found." }, 404);
    return json({ ok: true, weekly_share_inr: mentorShare(weekly), monthly_share_inr: mentorShare(monthly) });
  }

  if (path === "/api/desk/visibility") {
    const id = String(data.id || "");
    const show = data.show_profile === 1 || data.show_profile === true || data.show_profile === "1" ? 1 : 0;
    if (!/^[0-9a-z-]{2,80}$/i.test(id)) return json({ ok: false, error: "Pick a mentor." }, 400);
    const result = await env.DB.prepare("UPDATE mentors SET show_profile = ? WHERE id = ?").bind(show, id).run();
    if (!result.meta?.changes) return json({ ok: false, error: "That mentor was not found." }, 404);
    return json({ ok: true, show_profile: show });
  }

  if (path === "/api/desk/availability") {
    const id = String(data.id || "");
    const status = data.status === "live" || data.status === "paused" ? data.status : "";
    if (!/^[0-9a-z-]{2,80}$/i.test(id) || !status) return json({ ok: false, error: "Pick live or paused." }, 400);
    const result = await env.DB.prepare(
      "UPDATE mentors SET status = ? WHERE id = ? AND status IN ('live','paused')",
    ).bind(status, id).run();
    if (!result.meta?.changes) return json({ ok: false, error: "That mentor cannot be switched." }, 409);
    return json({ ok: true });
  }

  return json({ ok: false, error: "Not found." }, 404);
}

async function pageFor(url, env) {
  if (PAGES[url.pathname]) return { ...PAGES[url.pathname], status: 200, canonical: url.origin + url.pathname };
  const match = url.pathname.match(/^\/m\/([a-z0-9-]{2,60})$/);
  if (match) {
    const row = await env.DB.prepare(
      "SELECT name, headline FROM mentors WHERE slug = ? AND status = 'live' AND show_profile = 1",
    ).bind(match[1]).first();
    if (!row) {
      return {
        title: "Mentor not on the desk",
        description: "That mentor page is not live.",
        robots: "noindex, nofollow",
        status: 404,
        canonical: url.origin + "/mentors",
      };
    }
    return {
      title: `${row.name} — mentor on Techclick`,
      description: row.headline,
      status: 200,
      canonical: url.origin + url.pathname,
    };
  }
  return {
    title: "Page not on Mentor Desk",
    description: "That page is not on the Techclick Mentor Desk.",
    robots: "noindex, nofollow",
    status: 404,
    canonical: url.origin + "/",
  };
}

async function htmlResponse(env, url) {
  const assetUrl = new URL(url.href);
  assetUrl.pathname = "/index.html";
  assetUrl.search = "";
  const asset = await env.ASSETS.fetch(assetUrl);
  if (!asset.ok) return json({ ok: false, error: "Desk page did not load." }, 502);
  const meta = await pageFor(url, env);
  let html = await asset.text();
  html = html
    .replaceAll("{{TITLE}}", escapeHtml(meta.title))
    .replaceAll("{{DESCRIPTION}}", escapeHtml(meta.description))
    .replaceAll("{{CANONICAL}}", escapeHtml(meta.canonical))
    .replaceAll("{{ROBOTS}}", escapeHtml(meta.robots || "index, follow"))
    .replaceAll("{{ORIGIN}}", escapeHtml(url.origin));
  const headers = new Headers();
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-cache");
  securityHeaders(headers);
  return new Response(html, { status: meta.status, headers });
}

async function assetResponse(url, env) {
  const assetUrl = new URL(url.href);
  assetUrl.search = "";
  const asset = await env.ASSETS.fetch(assetUrl);
  const headers = new Headers(asset.headers);
  securityHeaders(headers);
  if (asset.ok) headers.set("cache-control", "public, max-age=300");
  return new Response(asset.body, { status: asset.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/m/ram-dixit" || url.pathname === "/api/mentors/ram-dixit") {
        url.pathname = url.pathname.replace("ram-dixit", "techclick-expert");
        return Response.redirect(url.toString(), 308);
      }
      if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
        url.pathname = url.pathname.replace(/\/+$/, "");
        return Response.redirect(url.toString(), 308);
      }
      if (request.method === "GET" && url.pathname === "/index.html") {
        return Response.redirect(new URL("/", url.origin).toString(), 308);
      }
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env, url);
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json({ ok: false, error: "Not found." }, 404);
      }
      if (/\.(css|js|svg|png|jpg|jpeg|webp|txt|xml|ico|webmanifest)$/.test(url.pathname)) {
        return await assetResponse(url, env);
      }
      return await htmlResponse(env, url);
    } catch (error) {
      console.error(JSON.stringify({
        message: "request failed",
        path: url.pathname,
        error: error instanceof Error ? error.message : "unknown",
      }));
      return json({ ok: false, error: "The desk hit a problem. Try again, or message Techclick on WhatsApp." }, 500);
    }
  },
};
