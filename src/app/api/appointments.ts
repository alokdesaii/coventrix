// Appointments API contract. Mocked. The live portal creates/reads events through Google Calendar
// (sign-in popup); backend team: proxy that here so the frontend never handles Google tokens.

export type MeetingMode = "Online" | "Offline";

export type Appointment = {
  id: string;
  title: string;
  description: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  timeZone: string;
  mode: MeetingMode;
  status: "Confirmed" | "Tentative" | "Cancelled";
  createdBy: { name: string; email: string };
  meetingId?: string;
  meetingLink?: string;
  attendees: string[];
  mom?: MinutesOfMeeting;
};

export type MinutesOfMeeting = { title: string; at: string; notes: string };

export type NewAppointment = Pick<Appointment, "title" | "description" | "start" | "end" | "timeZone" | "mode" | "attendees">;

const ME = { name: "Alok Desai", email: "alok.desai@harbourandhills.com" };

const at = (dayOffset: number, h: number, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

let EVENTS: Appointment[] = [
  { id: "a1", title: "Quarterly review — Client A", description: "Review Q3 volumes and pricing.", start: at(-3, 10), end: at(-3, 11),
    timeZone: "Asia/Hong_Kong", mode: "Online", status: "Confirmed", createdBy: ME, meetingId: "abc-defg-hij",
    meetingLink: "https://meet.google.com/abc-defg-hij", attendees: ["ops@clienta.com", "finance@clienta.com"],
    mom: { title: "Quarterly review — Client A", at: at(-3, 10), notes: "Agreed revised FX margin from November.\nClient to share Q4 forecast by 15th." } },
  { id: "a2", title: "Onboarding call — Bank B", description: "KYC document walkthrough.", start: at(0, 14), end: at(0, 15),
    timeZone: "Asia/Hong_Kong", mode: "Online", status: "Confirmed", createdBy: ME, meetingId: "klm-nopq-rst",
    meetingLink: "https://meet.google.com/klm-nopq-rst", attendees: ["compliance@bankb.com"] },
  { id: "a3", title: "Site visit — Client C", description: "Office visit, Kowloon.", start: at(2, 11), end: at(2, 12, 30),
    timeZone: "Asia/Hong_Kong", mode: "Offline", status: "Tentative", createdBy: ME, attendees: ["ceo@clientc.com"] },
  { id: "a4", title: "Correspondent bank sync", description: "Monthly cost review.", start: at(6, 16), end: at(6, 16, 45),
    timeZone: "Asia/Hong_Kong", mode: "Online", status: "Confirmed", createdBy: ME, meetingId: "uvw-xyza-bcd",
    meetingLink: "https://meet.google.com/uvw-xyza-bcd", attendees: ["rm@bankd.com", "ops@bankd.com"] },
];

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export async function listAppointments(): Promise<Appointment[]> {
  await delay();
  return structuredClone(EVENTS);
}

export async function createAppointment(a: NewAppointment): Promise<Appointment> {
  await delay(500);
  const id = `a${Date.now()}`;
  const ev: Appointment = {
    ...a, id, status: "Confirmed", createdBy: ME,
    ...(a.mode === "Online" ? { meetingId: id, meetingLink: `https://meet.google.com/${id}` } : {}),
  };
  EVENTS = [...EVENTS, ev];
  return ev;
}

export async function deleteAppointment(id: string): Promise<void> {
  await delay();
  EVENTS = EVENTS.filter((e) => e.id !== id);
}

/** Saves minutes against an event, or as a standalone record when eventId is omitted. */
export async function saveMinutes(mom: MinutesOfMeeting, eventId?: string): Promise<void> {
  await delay(500);
  if (eventId) EVENTS = EVENTS.map((e) => (e.id === eventId ? { ...e, mom } : e));
}
