/**
 * Mentor Desk pages. Served by the worker at mentor.techclick.in.
 */
const FALLBACK = {
  cut: 0.2,
  tracks: ["Zscaler ZIA", "Zscaler ZPA", "Palo Alto NGFW", "Prisma Access", "FortiGate", "F5 BIG-IP", "Cisco ISE", "Cisco FMC", "Check Point", "Cloudflare", "SOC / SIEM", "Network troubleshooting"],
  support_whatsapp: "919277229456",
  support_email: "support@techclick.in",
  public_url: location.origin,
};

let catalog = FALLBACK;
let mentors = [];
let loadError = "";
let renderGen = 0;

const app = document.querySelector("#app");

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue;
    if (key === "class") node.className = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, String(value));
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function inr(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(amount) || 0);
}

function shareAmount(amount) {
  return Math.round(Number(amount) * (1 - Number(catalog.cut || 0.2)));
}

function wa(text) {
  return `https://wa.me/${catalog.support_whatsapp}?text=${encodeURIComponent(text)}`;
}

function groupText() {
  return `Techclick Mentor Desk is open worldwide.\n\nTechclick Expert — cybersecurity, cloud security, pen testing, Azure, AWS, and WAF (Cloudflare, Barracuda, Akamai). 5 out of 5 by 129 students. 700 students trained. Job support and online interview practice.\n\nStudents pick a mentor. Mentors keep 80% and earn every week.\n\n${catalog.public_url || location.origin}`;
}

function go(href) {
  const next = new URL(href, location.origin);
  if (next.pathname + next.search !== location.pathname + location.search) {
    history.pushState({}, "", next.pathname + next.search);
  }
  render();
  window.scrollTo(0, 0);
}

function pathMentor() {
  const match = location.pathname.match(/^\/m\/([a-z0-9-]{2,60})$/);
  return match ? match[1] : "";
}

async function loadPublic() {
  try {
    const [catRes, menRes] = await Promise.all([fetch("/api/catalog"), fetch("/api/mentors")]);
    if (!catRes.ok || !menRes.ok) throw new Error("list");
    catalog = await catRes.json();
    const body = await menRes.json();
    mentors = body.mentors || [];
    loadError = "";
  } catch {
    loadError = "The mentor list did not load. Refresh, or message Techclick on WhatsApp.";
  }
}

function nav(current) {
  const item = (href, label, extra = "") => el("a", { href, class: extra, "aria-current": current === href ? "page" : null, onclick: (event) => { event.preventDefault(); go(href); } }, [label]);
  return el("header", { class: "nav" }, [
    el("a", { class: "brand", href: "/", onclick: (event) => { event.preventDefault(); go("/"); } }, [
      el("img", { src: "/images/logo.png", alt: "Techclick" }),
      el("b", {}, ["Mentor Desk"]),
    ]),
    el("nav", { class: "links", "aria-label": "Desk" }, [
      item("/enroll", "Enroll", "keep"),
      item("/mentors", "Mentors"),
      item("/how", "How pay works"),
      item("/join", "Become a mentor", "btn copper"),
    ]),
  ]);
}

function footer() {
  return el("footer", { class: "footer" }, [
    el("div", { class: "wrap" }, [
      el("img", { src: "/images/logo-white.png", alt: "Techclick" }),
      el("p", {}, [
        "Desk time is one mentor with one person. Full batch courses stay on ",
        el("a", { href: "https://ai.techclick.in/trainings" }, ["ai.techclick.in/trainings"]),
        ". Support: ",
        el("a", { href: `mailto:${catalog.support_email}` }, [catalog.support_email]),
      ]),
    ]),
  ]);
}

function dock() {
  if (location.pathname === "/desk" || location.pathname === "/" || location.pathname === "/enroll") return null;
  const href = "/enroll";
  const label = "Enroll and pick a mentor";
  return el("div", { class: "dock" }, [
    el("a", { class: "btn", href, onclick: (event) => { event.preventDefault(); go(href); } }, [label]),
  ]);
}

function chatButton() {
  return el("a", {
    class: "wa-chat",
    href: wa("Hello Techclick, I have a question about Mentor Desk."),
    target: "_blank",
    rel: "noopener",
    "aria-label": "Chat with Techclick on WhatsApp",
  }, ["WhatsApp"]);
}

function shell(current, nodes) {
  const parts = [nav(current), el("main", { id: "main", class: "wrap" }, nodes), footer(), chatButton()];
  const bar = dock();
  if (bar) parts.push(bar);
  app.replaceChildren(...parts);
}

function chips(tracks, limit) {
  const shown = typeof limit === "number" ? tracks.slice(0, limit) : tracks;
  return el("div", { class: "chips" }, shown.map((track) => el("span", { class: "chip" }, [track])));
}

function stars(count) {
  const n = Math.max(0, Math.min(5, Number(count) || 0));
  return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
}

function proof(mentor) {
  if (!mentor.rating_count && !mentor.students_trained) return null;
  return el("div", {}, [
    mentor.rating_count ? el("p", { class: "stars" }, [`${stars(mentor.rating_out_of)}  ${mentor.rating_out_of} out of 5 by ${mentor.rating_count} students`]) : null,
    el("div", { class: "stats" }, [
      stat(mentor.students_trained, "Students trained"),
      stat(mentor.interviews_taken, "Interviews taken"),
      stat(mentor.interviews_given, "Interviews given"),
      stat(mentor.rating_count, "Student ratings"),
    ].filter(Boolean)),
    (mentor.offers || []).length ? el("div", { class: "chips" }, mentor.offers.map((offer) => el("span", { class: "chip" }, [offer]))) : null,
  ]);
}

function stat(value, label) {
  if (!value) return null;
  return el("div", { class: "stat" }, [el("b", {}, [String(value)]), el("span", {}, [label])]);
}

function mentorCard(mentor) {
  const blob = `${mentor.name} ${mentor.headline} ${(mentor.tracks || []).join(" ")}`.toLowerCase();
  return el("article", { class: "card", "data-blob": blob }, [
    mentor.founding ? el("span", { class: "badge" }, ["Founding mentor"]) : el("span", { class: "badge" }, ["Techclick verified"]),
    el("h3", {}, [mentor.name]),
    el("p", {}, [mentor.headline]),
    el("p", { class: "meta" }, [`${mentor.years} years`, mentor.city, mentor.languages]),
    proof(mentor),
    chips(mentor.tracks || [], 8),
    el("div", { class: "price-pair" }, [
      el("div", {}, [el("b", {}, [inr(mentor.weekly_inr)]), el("span", { class: "small muted" }, ["week · mentor gets ", inr(mentor.weekly_share_inr)])]),
      el("div", {}, [el("b", {}, [inr(mentor.monthly_inr)]), el("span", { class: "small muted" }, ["month · mentor gets ", inr(mentor.monthly_share_inr)])]),
    ]),
    el("div", { class: "actions" }, [
      el("a", { class: "btn", href: `/enroll?mentor=${mentor.slug}`, onclick: (event) => { event.preventDefault(); go(`/enroll?mentor=${mentor.slug}`); } }, ["Enroll with this mentor"]),
      el("a", { class: "text-btn", href: `/m/${mentor.slug}`, onclick: (event) => { event.preventDefault(); go(`/m/${mentor.slug}`); } }, ["See profile"]),
    ]),
  ]);
}

function pasteBox() {
  return el("section", { class: "paste" }, [
    el("h2", {}, ["Message you can paste in a group"]),
    el("p", { class: "muted" }, ["WhatsApp, Telegram, or LinkedIn. People land on this site."]),
    el("pre", { id: "group-text" }, [groupText()]),
    el("button", { class: "btn", type: "button", onclick: copyGroup }, ["Copy group message"]),
  ]);
}

async function copyGroup(event) {
  const button = event.currentTarget;
  try {
    await navigator.clipboard.writeText(groupText());
    button.textContent = "Copied";
  } catch {
    button.textContent = "Select the message and copy it";
  }
}

function renderHome() {
  const featured = mentors[0];
  const openTracks = catalog.tracks.filter((track) => !mentors.some((mentor) => (mentor.tracks || []).includes(track)));
  shell("/", [
    el("section", { class: "hero" }, [
      el("div", {}, [
        el("p", { class: "kicker" }, ["Techclick Mentor Desk"]),
        el("h1", {}, ["Choose the person who already runs the box."]),
        el("p", { class: "lede" }, ["Networking and security people pick a mentor. You pay for a week or a month. The mentor keeps 80 percent of that seat. Techclick keeps 20 percent and confirms the payment."]),
        el("div", { class: "row" }, [
          el("a", { class: "btn", href: "/enroll", onclick: (event) => { event.preventDefault(); go("/enroll"); } }, ["Enroll and pick a mentor"]),
          el("a", { class: "btn ghost", href: "/join", onclick: (event) => { event.preventDefault(); go("/join"); } }, ["I want to mentor and earn"]),
        ]),
      ]),
      featured ? ticket(featured, "weekly") : el("div", { class: "notice error" }, [loadError || "No mentor is live yet. Apply and be the first name on the desk."]),
    ]),
    el("section", { class: "section" }, [
      el("p", { class: "kicker" }, ["Money path"]),
      el("h2", {}, ["Week or month. The split is on the card."]),
      el("div", { class: "money" }, [
        step("1", "You request a seat", "Pick the mentor and say what you are stuck on. Nothing is charged on this page."),
        step("2", "Techclick confirms", "You get the payment step on email or WhatsApp. The mentor is not paid before that."),
        step("3", "Mentor receives 80%", featured ? `On a ${inr(featured.weekly_inr)} week, the mentor receives ${inr(featured.weekly_share_inr)}. Techclick keeps ${inr(featured.weekly_inr - featured.weekly_share_inr)}.` : "The mentor receives 80 percent after the seat is marked paid."),
      ]),
    ]),
    el("section", { class: "section" }, [
      el("p", { class: "kicker" }, ["On the desk now"]),
      el("h2", {}, [mentors.length === 1 ? "One mentor is live." : `${mentors.length} mentors are live.`]),
      loadError ? el("p", { class: "notice error" }, [loadError]) : null,
      el("div", { class: "grid", id: "mentor-list" }, mentors.map(mentorCard)),
    ]),
    openTracks.length ? el("section", { class: "section" }, [
      el("p", { class: "kicker" }, ["Open tracks"]),
      el("h2", {}, ["These tracks have no mentor yet."]),
      el("p", { class: "muted" }, ["If you can teach one, apply. Your card goes live after Techclick reviews it."]),
      el("div", { class: "filters" }, openTracks.map((track) => el("a", {
        class: "track",
        href: `/join?track=${encodeURIComponent(track)}`,
        onclick: (event) => { event.preventDefault(); go(`/join?track=${encodeURIComponent(track)}`); },
      }, [track]))),
    ]) : null,
    pasteBox(),
  ]);
  document.title = "Techclick Mentor Desk — pick a networking mentor";
}

function step(n, title, copy) {
  return el("article", { class: "step" }, [el("span", {}, [n]), el("strong", {}, [title]), el("p", {}, [copy])]);
}

function ticket(mentor, plan) {
  const box = el("aside", { class: "ticket" });
  const draw = (active) => {
    const amount = active === "weekly" ? mentor.weekly_inr : mentor.monthly_inr;
    const share = active === "weekly" ? mentor.weekly_share_inr : mentor.monthly_share_inr;
    const includes = active === "weekly" ? mentor.weekly_includes : mentor.monthly_includes;
    box.replaceChildren(
      el("p", { class: "kicker" }, [active === "weekly" ? "Seat · weekly" : "Seat · monthly"]),
      el("h2", {}, [mentor.name]),
      mentor.rating_count ? el("p", { class: "stars" }, [`${stars(mentor.rating_out_of)}  ${mentor.rating_out_of}/5 · ${mentor.rating_count} students · ${mentor.students_trained} trained`]) : null,
      chips(mentor.tracks || [], 6),
      el("div", { class: "plan-switch" }, [
        el("button", { class: "text-btn", type: "button", "aria-pressed": active === "weekly" ? "true" : "false", onclick: () => draw("weekly") }, ["Weekly"]),
        el("button", { class: "text-btn", type: "button", "aria-pressed": active === "monthly" ? "true" : "false", onclick: () => draw("monthly") }, ["Monthly"]),
      ]),
      el("p", { class: "ticket-price" }, [inr(amount)]),
      el("p", { class: "share-line" }, [`Mentor receives ${inr(share)}`]),
      el("p", {}, [includes]),
      el("div", { class: "row" }, [
        el("a", { class: "btn copper", href: `/m/${mentor.slug}?plan=${active}`, onclick: (event) => { event.preventDefault(); go(`/m/${mentor.slug}?plan=${active}`); } }, ["Request this seat"]),
      ]),
    );
  };
  draw(plan);
  return box;
}

function renderMentors() {
  const params = new URLSearchParams(location.search);
  const track = params.get("track") || "";
  const shown = track ? mentors.filter((mentor) => (mentor.tracks || []).includes(track)) : mentors;
  shell("/mentors", [
    el("section", { class: "section" }, [
      el("p", { class: "kicker" }, ["Directory"]),
      el("h1", {}, ["Mentors taking seats"]),
      el("p", { class: "lede" }, ["Pick the track you are stuck on. Prices are the weekly seat and the monthly seat. The mentor line is what they earn."]),
      el("div", { class: "filters" }, [
        el("button", { class: track ? "track" : "track on", type: "button", onclick: () => go("/mentors") }, ["All"]),
        ...catalog.tracks.map((name) => el("button", {
          class: track === name ? "track on" : "track",
          type: "button",
          onclick: () => go(`/mentors?track=${encodeURIComponent(name)}`),
        }, [name])),
      ]),
      el("div", { class: "search" }, [
        el("input", { id: "q", type: "search", placeholder: "Search a name or a box, such as ZPA or FortiGate", "aria-label": "Search mentors" }),
      ]),
      loadError ? el("p", { class: "notice error" }, [loadError]) : null,
      shown.length ? el("div", { class: "grid", id: "mentor-list" }, shown.map(mentorCard)) : el("p", { class: "notice" }, ["No mentor is live on this track yet. ", el("a", { href: `/join?track=${encodeURIComponent(track)}`, onclick: (event) => { event.preventDefault(); go(`/join?track=${encodeURIComponent(track)}`); } }, ["Apply to teach it."])]),
    ]),
  ]);
  const input = document.querySelector("#q");
  input?.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    for (const card of document.querySelectorAll("#mentor-list [data-blob]")) {
      card.hidden = Boolean(q) && !card.dataset.blob.includes(q);
    }
  });
  document.title = "Mentors on the Techclick desk";
}

async function renderProfile() {
  const gen = renderGen;
  const slug = pathMentor();
  shell("/mentors", [el("p", { class: "section" }, ["Opening the mentor page..."])]);
  let mentor = null;
  let error = "";
  try {
    const res = await fetch(`/api/mentors/${slug}`);
    const body = await res.json();
    if (!res.ok) error = body.error || "That mentor is not on the desk.";
    else mentor = body.mentor;
  } catch {
    error = "The mentor page did not load.";
  }
  if (gen !== renderGen) return;
  if (!mentor) {
    shell("/mentors", [
      el("section", { class: "section" }, [
        el("h1", {}, ["That mentor is not on the desk"]),
        el("p", { class: "lede" }, [error]),
        el("div", { class: "row" }, [el("a", { class: "btn", href: "/mentors", onclick: (event) => { event.preventDefault(); go("/mentors"); } }, ["Back to mentors"])]),
      ]),
    ]);
    document.title = "Mentor not on the desk";
    return;
  }
  const plan = new URLSearchParams(location.search).get("plan") === "monthly" ? "monthly" : "weekly";
  shell("/mentors", [
    el("section", { class: "section profile" }, [
      el("div", {}, [
        mentor.founding ? el("span", { class: "badge" }, ["Founding mentor"]) : el("span", { class: "badge" }, ["Techclick verified"]),
        el("h1", {}, [mentor.name]),
        el("p", { class: "lede" }, [mentor.headline]),
        el("p", { class: "meta" }, [`${mentor.years} years`, mentor.city, mentor.languages, mentor.seats_left === 0 ? "No open seat" : `${mentor.seats_left} open seats`]),
        proof(mentor),
        chips(mentor.tracks || []),
        el("p", { style: "margin-top:14px" }, [mentor.bio]),
      ]),
      seatForm(mentor, plan),
    ]),
  ]);
  document.title = `${mentor.name} — mentor on Techclick`;
}

function seatForm(mentor, plan) {
  const form = el("form", { class: "sheet form" });
  const status = el("div");
  const weekly = el("input", { type: "radio", name: "plan", value: "weekly", checked: plan === "weekly" ? "checked" : null });
  const monthly = el("input", { type: "radio", name: "plan", value: "monthly", checked: plan === "monthly" ? "checked" : null });
  if (plan !== "weekly") weekly.removeAttribute("checked");
  if (plan !== "monthly") monthly.removeAttribute("checked");
  weekly.checked = plan === "weekly";
  monthly.checked = plan === "monthly";
  const summary = el("p", { class: "calc" }, []);
  const paint = () => {
    const active = form.querySelector("input[name=plan]:checked")?.value || "weekly";
    const amount = active === "weekly" ? mentor.weekly_inr : mentor.monthly_inr;
    const share = active === "weekly" ? mentor.weekly_share_inr : mentor.monthly_share_inr;
    const includes = active === "weekly" ? mentor.weekly_includes : mentor.monthly_includes;
    summary.replaceChildren(
      document.createTextNode(`${inr(amount)} for this ${active === "weekly" ? "week" : "month"}. Mentor receives ${inr(share)}. Techclick keeps ${inr(amount - share)}. ${includes}`),
    );
  };
  form.addEventListener("change", paint);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.replaceChildren();
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    const data = Object.fromEntries(new FormData(form).entries());
    data.mentor_slug = mentor.slug;
    data.tracks = undefined;
    try {
      const res = await fetch("/api/requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Request did not save.");
      form.replaceChildren(
        el("h2", {}, ["Seat request received"]),
        el("p", {}, [`Reference ${body.reference}. ${body.message}`]),
        el("p", { class: "calc" }, [`You asked for ${inr(body.amount_inr)}. ${body.mentor_name} receives ${inr(body.mentor_share_inr)} after Techclick marks the seat paid.`]),
        el("a", { class: "btn", href: wa(`Mentor Desk request ${body.reference}. I want the payment step.`), target: "_blank", rel: "noopener" }, ["Message Techclick on WhatsApp"]),
      );
    } catch (error) {
      status.replaceChildren(el("p", { class: "notice error" }, [error.message]));
      button.disabled = false;
    }
  });
  form.append(
    el("h2", {}, ["Request a seat"]),
    el("p", { class: "muted small" }, ["Techclick confirms before any payment. Do not send a card number in the form."]),
    el("fieldset", { class: "form", style: "border:0;padding:0" }, [
      el("legend", { class: "small" }, ["Seat length"]),
      el("label", { class: "choice" }, [weekly, `Weekly · ${inr(mentor.weekly_inr)}`]),
      el("label", { class: "choice" }, [monthly, `Monthly · ${inr(mentor.monthly_inr)}`]),
    ]),
    summary,
    field("Your name", "name", "text", "As you want the mentor to call you"),
    field("Email", "email", "email", "you@company.com"),
    field("WhatsApp", "phone", "tel", "+91 98xxx xxxxx"),
    el("label", {}, ["What are you stuck on?", el("textarea", { name: "goal", required: "required", minlength: "20", maxlength: "800", placeholder: "Example: ZPA app segment is up, but users still hit the private app through the old VPN." })]),
    el("label", { class: "honeypot", "aria-hidden": "true" }, ["Leave blank", el("input", { name: "tc_leave_blank", tabindex: "-1", autocomplete: "off" })]),
    status,
    el("button", { class: "btn copper", type: "submit" }, [mentor.seats_left === 0 ? "Ask anyway — seat may be full" : "Request this seat"]),
  );
  paint();
  return form;
}

function field(label, name, type, placeholder) {
  return el("label", {}, [label, el("input", { name, type, required: "required", placeholder, autocomplete: name === "name" ? "name" : name })]);
}

function renderEnroll() {
  const preset = new URLSearchParams(location.search).get("mentor") || "";
  const form = el("form", { class: "form sheet" });
  const status = el("div");
  const summary = el("p", { class: "calc" }, ["Pick a mentor to see the week and month price."]);
  const mentorSelect = el("select", { name: "mentor_slug", required: "required", "aria-label": "Mentor" }, [
    el("option", { value: "" }, ["Choose a mentor"]),
    ...mentors.map((mentor) => el("option", { value: mentor.slug }, [
      `${mentor.name} · ${inr(mentor.weekly_inr)} a week · ${inr(mentor.monthly_inr)} a month`,
    ])),
  ]);
  if (mentors.some((mentor) => mentor.slug === preset)) mentorSelect.value = preset;
  const weekly = el("input", { type: "radio", name: "plan", value: "weekly" });
  const monthly = el("input", { type: "radio", name: "plan", value: "monthly" });
  weekly.checked = true;
  const paint = () => {
    const mentor = mentors.find((item) => item.slug === mentorSelect.value);
    if (!mentor) {
      summary.textContent = "Pick a mentor to see the week and month price.";
      return;
    }
    const plan = form.querySelector("input[name=plan]:checked")?.value || "weekly";
    const amount = plan === "weekly" ? mentor.weekly_inr : mentor.monthly_inr;
    const share = plan === "weekly" ? mentor.weekly_share_inr : mentor.monthly_share_inr;
    const includes = plan === "weekly" ? mentor.weekly_includes : mentor.monthly_includes;
    summary.textContent = `${mentor.name}: ${inr(amount)} for this ${plan === "weekly" ? "week" : "month"}. Mentor receives ${inr(share)}. ${includes}`;
  };
  form.addEventListener("change", paint);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.replaceChildren();
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Enrollment did not save.");
      form.replaceChildren(
        el("h2", {}, ["Enrollment received"]),
        el("p", {}, [`Reference ${body.reference}. You asked for ${body.mentor_name}. ${body.message}`]),
        el("p", { class: "calc" }, [`${inr(body.amount_inr)} for this ${body.plan === "weekly" ? "week" : "month"}. ${body.mentor_name} receives ${inr(body.mentor_share_inr)} after the seat is marked paid.`]),
        el("a", { class: "btn", href: wa(`Mentor Desk enrollment ${body.reference}. I picked ${body.mentor_name}.`), target: "_blank", rel: "noopener" }, ["Message Techclick on WhatsApp"]),
      );
    } catch (error) {
      status.replaceChildren(el("p", { class: "notice error" }, [error.message]));
      button.disabled = false;
    }
  });
  form.append(
    el("h2", {}, ["Your seat"]),
    el("label", {}, ["Which mentor do you want?", mentorSelect]),
    el("fieldset", { class: "form", style: "border:0;padding:0" }, [
      el("legend", { class: "small" }, ["Week or month"]),
      el("label", { class: "choice" }, [weekly, "Weekly seat"]),
      el("label", { class: "choice" }, [monthly, "Monthly seat"]),
    ]),
    summary,
    field("Your name", "name", "text", "As you want the mentor to call you"),
    field("Email", "email", "email", "you@company.com"),
    field("WhatsApp", "phone", "tel", "+91 98xxx xxxxx"),
    el("label", {}, ["What are you stuck on?", el("textarea", { name: "goal", required: "required", minlength: "20", maxlength: "800", placeholder: "Example: FortiGate SD-WAN spoke is up, but the hub is not installing the route." })]),
    el("label", { class: "honeypot", "aria-hidden": "true" }, ["Leave blank", el("input", { name: "tc_leave_blank", tabindex: "-1", autocomplete: "off" })]),
    status,
    el("button", { class: "btn copper", type: "submit" }, ["Enroll with this mentor"]),
  );
  paint();
  shell("/enroll", [
    el("section", { class: "section" }, [
      el("p", { class: "kicker" }, ["Student enroll"]),
      el("h1", {}, ["Pick the mentor, then the seat."]),
      el("div", { class: "money" }, [
        step("1", "Choose the mentor", "Only mentors who chose to show a profile are in the list."),
        step("2", "Week or month", "The price on the form is the price for that mentor."),
        step("3", "Techclick confirms", "You get the payment step on email or WhatsApp. The mentor is paid their 80 percent after that."),
      ]),
      mentors.length ? form : el("p", { class: "notice" }, [loadError || "No mentor is showing a profile yet. Check back, or message Techclick on WhatsApp."]),
    ]),
  ]);
  document.title = "Enroll with a Techclick mentor";
}

function renderJoin() {
  const preset = new URLSearchParams(location.search).get("track") || "";
  const form = el("form", { class: "form sheet" });
  const status = el("div");
  const calc = el("p", { class: "calc" }, ["Set both prices. You will see your 80 percent here."]);
  form.addEventListener("input", () => {
    const weekly = Number(form.weekly_inr.value);
    const monthly = Number(form.monthly_inr.value);
    if (!weekly && !monthly) return;
    calc.textContent = `You receive ${inr(shareAmount(weekly || 0))} each week and ${inr(shareAmount(monthly || 0))} each month. Techclick keeps the other 20 percent.`;
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.replaceChildren();
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    const data = Object.fromEntries(new FormData(form).entries());
    data.tracks = [...form.querySelectorAll("input[name=tracks]:checked")].map((box) => box.value);
    data.years = Number(data.years);
    data.weekly_inr = Number(data.weekly_inr);
    data.monthly_inr = Number(data.monthly_inr);
    data.show_profile = Boolean(form.querySelector("input[name=show_profile]")?.checked);
    try {
      const res = await fetch("/api/apply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Application did not save.");
      form.replaceChildren(
        el("h2", {}, ["Application received"]),
        el("p", {}, [`Reference ${body.reference}. ${body.message}`]),
        el("p", { class: "calc" }, [
          `If approved, you receive ${inr(body.weekly_share_inr)} on a weekly seat and ${inr(body.monthly_share_inr)} on a monthly seat, on the UPI id you gave. `,
          body.show_profile ? "Students will be able to see your profile and pick you." : "Your profile stays hidden until Techclick switches it on.",
        ]),
      );
    } catch (error) {
      status.replaceChildren(el("p", { class: "notice error" }, [error.message]));
      button.disabled = false;
    }
  });
  form.append(
    el("h2", {}, ["Apply to mentor"]),
    field("Your name", "name", "text", "Name students should see"),
    el("div", { class: "form-row" }, [
      field("Email", "email", "email", "you@email.com"),
      field("WhatsApp", "phone", "tel", "+91..."),
    ]),
    el("fieldset", { class: "form", style: "border:0;padding:0" }, [
      el("legend", {}, ["Tracks you can teach"]),
      ...catalog.tracks.map((track) => {
        const box = el("input", { type: "checkbox", name: "tracks", value: track });
        box.checked = track === preset;
        return el("label", { class: "choice" }, [box, track]);
      }),
    ]),
    el("div", { class: "form-row" }, [
      field("Years doing this work", "years", "number", "8"),
      field("LinkedIn, optional", "linkedin", "url", "https://"),
    ]),
    el("div", { class: "form-row" }, [
      field("Weekly price in rupees", "weekly_inr", "number", "3500"),
      field("Monthly price in rupees", "monthly_inr", "number", "12000"),
    ]),
    calc,
    el("label", {}, ["Short bio", el("textarea", { name: "bio", required: "required", minlength: "80", maxlength: "1200", placeholder: "What you have actually run in production, and the kind of issue you want on your desk." })]),
    field("UPI id for your 80 percent", "payout_upi", "text", "name@okaxis"),
    el("label", { class: "choice" }, [
      (() => {
        const box = el("input", { type: "checkbox", name: "show_profile", value: "1" });
        box.checked = true;
        return box;
      })(),
      "Show my profile on the public desk so students can pick me",
    ]),
    el("label", { class: "honeypot", "aria-hidden": "true" }, ["Leave blank", el("input", { name: "tc_leave_blank", tabindex: "-1", autocomplete: "off" })]),
    status,
    el("button", { class: "btn copper", type: "submit" }, ["Submit application"]),
  );
  const linkedin = form.querySelector("input[name=linkedin]");
  linkedin.removeAttribute("required");
  shell("/join", [
    el("section", { class: "section" }, [
      el("p", { class: "kicker" }, ["Earn on the desk"]),
      el("h1", {}, ["Teach the work you already do."]),
      el("p", { class: "lede" }, ["Set a weekly price and a monthly price. When someone requests you and pays, you receive 80 percent on the UPI id you enter. A weekly seat pays that week's share. A monthly seat pays that month's share."]),
      form,
    ]),
  ]);
  document.title = "Become a Techclick mentor and earn";
}

function renderHow() {
  shell("/how", [
    el("section", { class: "section" }, [
      el("p", { class: "kicker" }, ["Plain pay rules"]),
      el("h1", {}, ["How a mentor gets paid."]),
      el("div", { class: "money" }, [
        step("1", "Two prices", "Every mentor shows a weekly seat and a monthly seat. The mentee picks one."),
        step("2", "Techclick collects", "The request is free. Techclick confirms the seat and sends the payment step. Card numbers are never typed into this site."),
        step("3", "80 / 20", "After the seat is marked paid, the mentor's share is due on their UPI. Techclick keeps 20 percent."),
      ]),
      el("div", { class: "grid", style: "margin-top:16px" }, [
        el("article", { class: "card" }, [
          el("h3", {}, ["For the person learning"]),
          el("p", {}, ["You are buying time with one mentor, not a recorded batch. Say the exact issue. If the mentor is full, the desk will say so."]),
        ]),
        el("article", { class: "card" }, [
          el("h3", {}, ["For the mentor"]),
          el("p", {}, ["You are paid for a delivered week or a delivered month. The private desk shows what is owed and the UPI id. Mark it sent after you receive it."]),
        ]),
      ]),
      pasteBox(),
    ]),
  ]);
  document.title = "How Mentor Desk pay works";
}

function deskKey() {
  return sessionStorage.getItem("mentor-desk-key") || "";
}

async function deskFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", "x-desk-key": deskKey(), ...(options.headers || {}) },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Desk did not answer.");
  return body;
}

function renderDesk() {
  const box = el("section", { class: "section" });
  shell("/desk", [box]);
  document.title = "Mentor Desk — private";
  if (!deskKey()) {
    const form = el("form", { class: "form sheet" }, [
      el("h1", {}, ["Private desk"]),
      el("p", { class: "muted" }, ["This page is for Techclick. Paste the desk key. It stays in this browser tab only."]),
      el("label", {}, ["Desk key", el("input", { name: "key", type: "password", required: "required", autocomplete: "current-password" })]),
      el("button", { class: "btn", type: "submit" }, ["Open desk"]),
    ]);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      sessionStorage.setItem("mentor-desk-key", new FormData(form).get("key"));
      renderDesk();
    });
    box.replaceChildren(form);
    return;
  }
  box.replaceChildren(el("h1", {}, ["Desk"]), el("p", {}, ["Loading seats and applications..."]));
  deskFetch("/api/desk/board").then((board) => paintDesk(box, board)).catch((error) => {
    sessionStorage.removeItem("mentor-desk-key");
    box.replaceChildren(el("p", { class: "notice error" }, [error.message]), el("button", { class: "btn", type: "button", onclick: () => renderDesk() }, ["Try the key again"]));
  });
}

function paintDesk(box, board) {
  const payNow = board.requests.filter((row) => row.status === "paid" && row.payout_status !== "sent");
  const incoming = board.requests.filter((row) => row.status === "requested" || row.status === "confirmed");
  const pendingApps = board.applications.filter((row) => row.status === "pending");
  box.replaceChildren(
    el("p", { class: "kicker" }, ["Private"]),
    el("h1", {}, ["Who to pay, who is waiting"]),
    el("p", { class: "row" }, [el("button", { class: "text-btn", type: "button", onclick: () => { sessionStorage.removeItem("mentor-desk-key"); renderDesk(); } }, ["Lock desk"])]),
    el("h2", {}, [`Pay these mentors (${payNow.length})`]),
    el("div", { class: "desk-list" }, payNow.length ? payNow.map((row) => requestCard(row, box)) : [el("p", { class: "notice" }, ["Nothing is waiting for a mentor payout."])]),
    el("h2", {}, [`Seat requests (${incoming.length})`]),
    el("div", { class: "desk-list" }, incoming.length ? incoming.map((row) => requestCard(row, box)) : [el("p", { class: "notice" }, ["No open seat request."])]),
    el("h2", {}, [`Mentor applications (${pendingApps.length})`]),
    el("div", { class: "desk-list" }, pendingApps.length ? pendingApps.map((row) => appCard(row, box)) : [el("p", { class: "notice" }, ["No application waiting."])]),
    el("h2", {}, ["Live prices"]),
    el("div", { class: "desk-list" }, board.mentors.map((row) => mentorAdmin(row, box))),
  );
}

function requestCard(row, box) {
  const note = row.is_founding
    ? "Founding mentor. This share is your own desk. Mark mentor paid when the week or month is delivered."
    : `Send ${inr(row.mentor_share_inr)} for this ${row.plan} seat. Mentee phone ${row.phone}.`;
  return el("article", { class: "desk-card" }, [
    el("header", {}, [el("strong", {}, [`${row.reference} · ${row.name}`]), el("span", { class: "small" }, [`${row.status} · payout ${row.payout_status}${Number(row.email_sent) ? " · emailed support" : ""}`])]),
    el("p", {}, [`${row.mentor_name} · ${row.plan} · mentee pays ${inr(row.amount_inr)} · mentor share ${inr(row.mentor_share_inr)}`]),
    el("p", { class: "small" }, [row.goal]),
    el("p", { class: "small muted" }, [note, ` Email ${row.email}.`]),
    el("div", { class: "actions" }, [
      statusButton(row, "confirmed", "Confirm seat", box),
      statusButton(row, "paid", "Mark mentee paid", box, "pending"),
      statusButton(row, "paid", "Mark mentor paid", box, "sent"),
      statusButton(row, "closed", "Close", box),
    ]),
  ]);
}

function statusButton(row, status, label, box, payout) {
  return el("button", { class: "text-btn", type: "button", onclick: async (event) => {
    event.currentTarget.disabled = true;
    try {
      await deskFetch("/api/desk/request", { method: "POST", body: JSON.stringify({ id: row.id, status, payout_status: payout || "" }) });
      const board = await deskFetch("/api/desk/board");
      paintDesk(box, board);
    } catch (error) {
      event.currentTarget.disabled = false;
      event.currentTarget.textContent = error.message;
    }
  } }, [label]);
}

function appCard(row, box) {
  let tracks = row.tracks;
  try { tracks = JSON.parse(row.tracks).join(", "); } catch { tracks = row.tracks; }
  return el("article", { class: "desk-card" }, [
    el("header", {}, [el("strong", {}, [row.name]), el("span", { class: "small" }, [`${row.years} years${Number(row.email_sent) ? " · emailed support" : ""}`])]),
    el("p", {}, [tracks]),
    el("p", { class: "small" }, [`Week ${inr(row.weekly_inr)} → mentor ${inr(shareAmount(row.weekly_inr))}. Month ${inr(row.monthly_inr)} → mentor ${inr(shareAmount(row.monthly_inr))}.`]),
    el("p", {}, [row.bio]),
    el("p", { class: "small muted" }, [
      `UPI ${row.payout_upi}. ${row.email}. ${row.phone}. ${row.linkedin || ""} `,
      Number(row.show_profile) === 0 ? "Profile: hidden until you show it." : "Profile: students can see it after approval.",
    ]),
    el("div", { class: "actions" }, [
      el("button", { class: "btn", type: "button", onclick: () => deskAction(box, "/api/desk/application", { id: row.id, action: "approve" }) }, ["Approve and put them live"]),
      el("button", { class: "text-btn", type: "button", onclick: () => deskAction(box, "/api/desk/application", { id: row.id, action: "decline" }) }, ["Decline"]),
    ]),
  ]);
}

function mentorAdmin(row, box) {
  const form = el("form", { class: "desk-card form" }, [
    el("strong", {}, [`${row.name} · ${row.status} · ${Number(row.show_profile) === 0 ? "profile hidden" : "profile visible"}`]),
    el("div", { class: "form-row" }, [
      el("label", {}, ["Weekly rupees", el("input", { name: "weekly_inr", type: "number", value: String(row.weekly_inr) })]),
      el("label", {}, ["Monthly rupees", el("input", { name: "monthly_inr", type: "number", value: String(row.monthly_inr) })]),
    ]),
    el("div", { class: "actions" }, [
      el("button", { class: "btn", type: "submit" }, ["Save prices"]),
      el("button", { class: "text-btn", type: "button", onclick: () => deskAction(box, "/api/desk/availability", { id: row.id, status: row.status === "live" ? "paused" : "live" }) }, [row.status === "live" ? "Pause" : "Make live"]),
      el("button", { class: "text-btn", type: "button", onclick: () => deskAction(box, "/api/desk/visibility", { id: row.id, show_profile: Number(row.show_profile) === 0 ? 1 : 0 }) }, [Number(row.show_profile) === 0 ? "Show profile" : "Hide profile"]),
    ]),
  ]);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    await deskAction(box, "/api/desk/price", { id: row.id, weekly_inr: Number(data.weekly_inr), monthly_inr: Number(data.monthly_inr) });
  });
  return form;
}

async function deskAction(box, path, payload) {
  try {
    await deskFetch(path, { method: "POST", body: JSON.stringify(payload) });
    const board = await deskFetch("/api/desk/board");
    paintDesk(box, board);
  } catch (error) {
    box.prepend(el("p", { class: "notice error" }, [error.message]));
  }
}

function renderMissing() {
  shell("/", [
    el("section", { class: "section" }, [
      el("h1", {}, ["That page is not on the desk"]),
      el("div", { class: "row" }, [el("a", { class: "btn", href: "/", onclick: (event) => { event.preventDefault(); go("/"); } }, ["Go to Mentor Desk"])]),
    ]),
  ]);
}

function render() {
  renderGen += 1;
  const path = location.pathname;
  if (path === "/") renderHome();
  else if (path === "/mentors") renderMentors();
  else if (path === "/enroll") renderEnroll();
  else if (path === "/join") renderJoin();
  else if (path === "/how") renderHow();
  else if (path === "/desk") renderDesk();
  else if (pathMentor()) renderProfile();
  else renderMissing();
}

window.addEventListener("popstate", () => render());

loadPublic().then(render);
