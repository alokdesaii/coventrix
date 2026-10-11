"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { PANEL, Select } from "@/components/ui";
import { createClient, getStates, type ClientKind, type NewClient } from "@/lib/api/clients";
import { getCountries } from "@/lib/countries";

type Addr = NewClient["corporateAddress"];
const EMPTY_ADDR: Addr = { floor: "", blockUnit: "", buildingName: "", street: "", state: "" };

const INITIAL: NewClient = {
  kind: "nbfi", companyName: "",
  corporateAddress: EMPTY_ADDR, correspondenceSameAsCorporate: false, correspondenceAddress: EMPTY_ADDR,
  mobile: "", phoneAreaCode: "", phone: "", country: "", faxAreaCode: "", fax: "",
  referredBy: "", referralPartner: "", website: "", email: "",
};

type Errors = Partial<Record<string, string>>;

function validate(f: NewClient): Errors {
  const e: Errors = {};
  const req = (key: string, v: string, label: string) => { if (!v.trim()) e[key] = `${label} is required`; };
  req("companyName", f.companyName, "Company name");
  req("corp.floor", f.corporateAddress.floor, "Floor");
  req("corp.blockUnit", f.corporateAddress.blockUnit, "Block/Unit");
  req("corp.buildingName", f.corporateAddress.buildingName, "Building name");
  req("corp.street", f.corporateAddress.street, "Street no. & name");
  req("corp.state", f.corporateAddress.state, "State");
  req("mobile", f.mobile, "Mobile no.");
  req("country", f.country, "Country");
  req("email", f.email, "Email");
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Enter a valid email address";
  if (f.mobile && !/^\+?[\d\s-]{6,20}$/.test(f.mobile)) e.mobile = "Enter a valid mobile number";
  return e;
}

// Country names come from the browser's Intl data, which can differ from the server's, so render
// them client-only. The list is computed once and cached so the snapshot is stable.
type Option = { value: string; label: string };
const noCountries: Option[] = [];
let countryCache: Option[] | null = null;
const countryOptions = () => (countryCache ??= getCountries().map((c) => ({ value: c.code, label: c.name })));
const noSubscribe = () => () => {};

const control = "h-10 w-full rounded border bg-white px-3 text-sm text-night outline-none transition placeholder:text-slate focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-mist disabled:text-slate";

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-night/70">{label}{required && <span className="text-red-600"> *</span>}</span>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-slate/20 pt-6 first:border-t-0 first:pt-0">
      <h2 className="mb-4 text-[15px] font-semibold text-navy">{title}</h2>
      {children}
    </section>
  );
}

const big = "[&_select]:h-10 [&_select]:text-sm";
const grid = "grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-4";

// Shared add-client form. Pass `kind` to lock the institution type (hides the picker).
export function ClientForm({ title, kind }: { title: string; kind?: ClientKind }) {
  const router = useRouter();
  const [form, setForm] = useState<NewClient>({ ...INITIAL, kind: kind ?? INITIAL.kind });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [saveError, setSaveError] = useState("");

  const countries = useSyncExternalStore(noSubscribe, countryOptions, () => noCountries);

  useEffect(() => {
    getStates().then(setStates);
  }, []);

  // Re-validate live once the user has tried to submit.
  // Errors show (and update live) once the user has tried to submit.
  const errors: Errors = submitted ? validate(form) : {};

  const set = <K extends keyof NewClient>(k: K, v: NewClient[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setAddr = (which: "corporateAddress" | "correspondenceAddress", k: keyof Addr, v: string) =>
    setForm((f) => ({ ...f, [which]: { ...f[which], [k]: v } }));
  const cls = (key: string) => `${control} ${errors[key] ? "border-red-400" : "border-slate/40"}`;

  const corr = form.correspondenceSameAsCorporate ? form.corporateAddress : form.correspondenceAddress;
  const listHref = form.kind === "corporate" ? "/bd/web/corporateclients/corporate" : `/bd/web/financialinstitute/${form.kind}`;

  function addressFields(which: "corporateAddress" | "correspondenceAddress", value: Addr, required: boolean, disabled = false) {
    const prefix = which === "corporateAddress" ? "corp" : "corr";
    const text = (k: keyof Addr, label: string) => (
      <Field label={label} required={required} error={errors[`${prefix}.${k}`]}>
        <input className={cls(`${prefix}.${k}`)} aria-invalid={!!errors[`${prefix}.${k}`]} value={value[k]} disabled={disabled} onChange={(e) => setAddr(which, k, e.target.value)} />
      </Field>
    );
    return (
      <div className={grid}>
        {text("floor", "Floor")}
        {text("blockUnit", "Block/Unit")}
        {text("buildingName", "Building Name")}
        {text("street", "Street No. & Name")}
        <Field label="State" required={required} error={errors[`${prefix}.state`]}>
          <Select label="State" className={big} value={value.state} disabled={disabled} invalid={!!errors[`${prefix}.state`]}
            onChange={(v) => setAddr(which, "state", v)} options={[{ value: "", label: "Select state" }, ...states.map((s) => ({ value: s, label: s }))]} />
        </Field>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate(form);
    if (Object.keys(errs).length) {
      // Wait a frame so the error markers have rendered.
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await createClient({ ...form, correspondenceAddress: corr });
      router.push(listHref);
    } catch {
      setSaveError("Could not save the client. Please try again.");
      setSaving(false);
    }
  }

  const text = (k: "mobile" | "phoneAreaCode" | "phone" | "faxAreaCode" | "fax" | "referredBy" | "referralPartner" | "website" | "email",
    label: string, opts: { required?: boolean; type?: string; inputMode?: "tel" | "email" | "url" } = {}) => (
    <Field label={label} required={opts.required} error={errors[k]}>
      <input className={cls(k)} type={opts.type ?? "text"} inputMode={opts.inputMode} value={form[k]}
        aria-invalid={!!errors[k]} onChange={(e) => set(k, e.target.value)} />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <h1 className="mb-5 text-xl font-semibold text-navy">{title}</h1>

      <div className={`${PANEL} flex flex-col gap-6`}>
        {!kind && <Section title="Institution">
          <div className={grid}>
            <Field label="Please select the institution" required>
              <Select<ClientKind> label="Institution" className={big} value={form.kind} onChange={(v) => set("kind", v)}
                options={[{ value: "nbfi", label: "NBFI" }, { value: "fi", label: "FI" }]} />
            </Field>
          </div>
        </Section>}

        <Section title="Add New Client">
          <div className={grid}>
            <div className="sm:col-span-2">
              <Field label="Company Name" required error={errors.companyName}>
                <input className={cls("companyName")} value={form.companyName} aria-invalid={!!errors.companyName}
                  onChange={(e) => set("companyName", e.target.value)} />
              </Field>
            </div>
          </div>
        </Section>

        <Section title="Client Corporate / Correspondence Address">
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate uppercase">Corporate address</h3>
          {addressFields("corporateAddress", form.corporateAddress, true)}

          <div className="mt-6 mb-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-slate uppercase">Correspondence address</h3>
            <label className="flex items-center gap-2 text-sm text-night">
              <input type="checkbox" className="size-4 accent-navy" checked={form.correspondenceSameAsCorporate}
                onChange={(e) => set("correspondenceSameAsCorporate", e.target.checked)} />
              Same as corporate address
            </label>
          </div>
          {addressFields("correspondenceAddress", corr, false, form.correspondenceSameAsCorporate)}
        </Section>

        <Section title="Other Details">
          <div className={grid}>
            {text("mobile", "Mobile No.", { required: true, type: "tel", inputMode: "tel" })}
            {text("phoneAreaCode", "Phone Area Code", { inputMode: "tel" })}
            {text("phone", "Phone No.", { type: "tel", inputMode: "tel" })}
            <Field label="Country" required error={errors.country}>
              <Select label="Country" className={big} value={form.country} invalid={!!errors.country}
                onChange={(v) => set("country", v)} options={[{ value: "", label: "Select country" }, ...countries]} />
            </Field>
            {text("faxAreaCode", "Fax Area Code", { inputMode: "tel" })}
            {text("fax", "Fax No.", { type: "tel", inputMode: "tel" })}
            {text("referredBy", "Referred By")}
            {text("referralPartner", "Referral Partner")}
            {text("website", "Website", { type: "url", inputMode: "url" })}
            {text("email", "Email", { required: true, type: "email", inputMode: "email" })}
          </div>
        </Section>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate/20 pt-5">
          {saveError && <p role="alert" className="mr-auto text-sm text-red-600">{saveError}</p>}
          {submitted && Object.keys(errors).length > 0 && (
            <p role="alert" className="mr-auto text-sm text-red-600">Please fix the highlighted fields.</p>
          )}
          <button type="button" onClick={() => router.push(listHref)}
            className="h-10 rounded border border-slate/40 bg-white px-5 text-sm font-medium text-navy transition hover:bg-mist">
            Cancel
          </button>
          <button disabled={saving}
            className="h-10 rounded bg-navy px-6 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}
