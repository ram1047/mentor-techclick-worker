import test from "node:test";
import assert from "node:assert/strict";
import { mentorShare, parseApply, parseSeat, slugify, PLATFORM_CUT } from "../src/validate.js";

test("mentor keeps 80 percent", () => {
  assert.equal(PLATFORM_CUT, 0.2);
  assert.equal(mentorShare(3500), 2800);
  assert.equal(mentorShare(12000), 9600);
});

test("slug keeps a readable name", () => {
  assert.equal(slugify("Ram Dixit"), "ram-dixit");
});

test("seat form rejects a short goal", () => {
  const result = parseSeat({
    mentor_slug: "ram-dixit",
    name: "Asha Rao",
    email: "asha@example.com",
    phone: "+91 98765 43210",
    plan: "weekly",
    goal: "help",
  });
  assert.equal(result.error.includes("stuck"), true);
});

test("seat form accepts a real request", () => {
  const result = parseSeat({
    mentor_slug: "ram-dixit",
    name: "Asha Rao",
    email: "Asha@Example.com",
    phone: "+91 98765 43210",
    plan: "monthly",
    goal: "Prisma Access remote network tunnel is up but traffic is not returning.",
  });
  assert.equal(result.value.email, "asha@example.com");
  assert.equal(result.value.phone, "919876543210");
  assert.equal(result.value.plan, "monthly");
});

test("apply form requires UPI and a real track", () => {
  const missing = parseApply({
    name: "Neha Shah",
    email: "neha@example.com",
    phone: "9876543210",
    tracks: ["Not a track"],
    years: 8,
    weekly_inr: 4000,
    monthly_inr: 14000,
    bio: "I have run FortiGate firewalls for enterprise branches, including SD-WAN, IPsec, and HA cutovers.",
    payout_upi: "neha@okaxis",
  });
  assert.equal(missing.error.includes("track"), true);

  const ok = parseApply({
    name: "Neha Shah",
    email: "neha@example.com",
    phone: "9876543210",
    tracks: ["FortiGate"],
    years: 8,
    weekly_inr: 4000,
    monthly_inr: 14000,
    bio: "I have run FortiGate firewalls for enterprise branches, including SD-WAN, IPsec, and HA cutovers for eight years.",
    linkedin: "https://www.linkedin.com/in/example",
    payout_upi: "neha@okaxis",
  });
  assert.equal(ok.value.payout_upi, "neha@okaxis");
  assert.deepEqual(ok.value.tracks, ["FortiGate"]);
});

test("honeypot short-circuits storage", () => {
  const result = parseSeat({ tc_leave_blank: "http://spam", mentor_slug: "ram-dixit" });
  assert.equal(result.honeypot, true);
});
