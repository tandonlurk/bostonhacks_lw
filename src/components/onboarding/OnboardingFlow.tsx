"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { TEAM_ROUTE_IDS, TEAMS, type TeamRouteId } from "@/contracts/routes";
import styles from "./onboarding.module.css";

const interests = ["Coffee stops", "Art & culture", "Food adventures", "Live music", "Hidden gems", "Outdoors", "Sports", "Campus life"];
const steps = ["Your line", "Your location", "Your interests", "Your photo"];
const artworks = [
  "      .----------.\n      |  T-SPOTS  |\n      | [ ]  [ ]  |\n      | [ ]  [ ]  |\n      |____  ____|\n       (o)----(o)\n  ==================",
  "       .-----.\n      /   +   \\\n     |    |    |\n      \\   |   /\n       \\  |  /\n        \\ | /\n         \\|/\n     .----+----.",
  "       *     +\n    +     .     *\n       .-----.\n      /  . .  \\\n      |   v   |\n       '-----'\n    *    |    +\n       __|__",
  "       .-----.\n      /       \\\n     |  o   o  |\n     |    u    |\n      \\  ___  /\n       '-----'\n     .-'     '-.\n    /  HELLO!   \\",
];

export function OnboardingFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [team, setTeam] = useState<TeamRouteId | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [location, setLocation] = useState<"idle" | "loading" | "granted" | "denied" | "unavailable" | "demo">("idle");
  const [complete, setComplete] = useState(false);
  const [storageNote, setStorageNote] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fileVersion = useRef(0);
  const locationVersion = useRef(0);

  useEffect(() => { heading.current?.focus(); }, [step, complete]);
  useEffect(() => () => { fileVersion.current += 1; locationVersion.current += 1; }, []);

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 0 && (!name.trim() || !team)) return;
    if (step === 1 && location !== "granted" && location !== "demo") return;
    if (step < 3) setStep(step + 1);
  }

  function addOther() {
    const value = otherText.trim().replace(/\s+/g, " ").slice(0, 24);
    if (value && !selected.some((item) => item.toLowerCase() === value.toLowerCase())) setSelected((current) => [...current, value]);
    setOtherText("");
    setOtherOpen(false);
  }

  function requestLocation() {
    const request = ++locationVersion.current;
    if (!navigator.geolocation) { setLocation("unavailable"); return; }
    setLocation("loading");
    navigator.geolocation.getCurrentPosition(
      () => { if (request === locationVersion.current) setLocation("granted"); },
      (error) => { if (request === locationVersion.current) setLocation(error.code === 1 ? "denied" : "unavailable"); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  function choosePhoto(file: File | undefined) {
    const version = ++fileVersion.current;
    setPhotoError("");
    setPhotoLoading(false);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setPhotoError("Choose a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) { setPhotoError("Keep your photo under 2 MB, please."); return; }
    setPhotoLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (version !== fileVersion.current) return;
      setPhoto(typeof reader.result === "string" ? reader.result : null);
      setPhotoLoading(false);
    };
    reader.onerror = () => {
      if (version !== fileVersion.current) return;
      setPhotoError("That photo could not be opened. Try another one.");
      setPhotoLoading(false);
    };
    reader.readAsDataURL(file);
  }

  async function finish() {
    if (location !== "granted" && location !== "demo") return;
    const profile = { displayName: name.trim(), homeTeamRouteId: team, interests: selected, avatarDataUrl: photo };
    try {
      localStorage.setItem("tspots:demo-profile", JSON.stringify({ ...profile, locationMode: location === "demo" ? "simulated" : "browser", completedAt: new Date().toISOString() }));
    } catch {
      // storage unavailable; the demo account below still works for this page load
    }
    // [A] Demo account: creates a rider wired to demo mode (sim, seeded hotspot, simulated delay)
    // and signs the app into it via the same keys useRider / useProfileLocal read.
    try {
      const res = await fetch("/api/riders/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      if (!res.ok) throw new Error(String(res.status));
      const { riderId } = (await res.json()) as { riderId: string };
      localStorage.setItem("tcity.riderId", riderId);
      localStorage.setItem("tcity.interests", JSON.stringify(selected));
      if (photo) localStorage.setItem("tcity.avatar", photo);
      setStorageNote("Demo account ready. Tap below to jump in.");
    } catch {
      setStorageNote("Couldn't create the demo account. You can still join from the Ride tab.");
    }
    setComplete(true);
  }

  return (
    <section className={styles.flow} aria-label="T-spots demo onboarding">
      <div className={styles.flowHeader}>
        <span className={styles.stepMeta}>{complete ? "YOUR CITY AWAITS" : `A LITTLE ABOUT YOU · ${step + 1} OF 4`}</span>
        <button className={styles.closeButton} type="button" onClick={onClose} aria-label="Return to landing page">Close</button>
      </div>
      <ol className={styles.progress} aria-label="Onboarding progress">
        {steps.map((label, index) => <li key={label} className={index <= step || complete ? styles.progressDone : undefined} aria-current={!complete && index === step ? "step" : undefined}><span>{label}</span></li>)}
      </ol>
      {complete ? (
        <div className={styles.completion}>
          <div className={styles.completionAvatar} style={{ "--line-color": team ? TEAMS[team].color : "#003DA5" } as CSSProperties}>
            {/* User-selected data URL, kept in this browser. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo ? <img src={photo} alt="Your selected profile photo" /> : <span>{name.trim().slice(0, 1).toUpperCase()}</span>}
          </div>
          <p className={styles.eyebrow}>NEXT STOP: SOMETHING GOOD</p>
          <h2 ref={heading} tabIndex={-1} className={styles.stepTitle}>You’re on board,<br />{name.trim()}.</h2>
          <p className={styles.stepIntro}>A familiar route. A few new discoveries. A whole city to build together.</p>
          <div className={styles.summaryChips}>
            <span className={styles.summaryChip}>{team} Line</span>
            {selected.map((interest) => <span className={styles.summaryChip} key={interest}>{interest}</span>)}
            <span className={styles.summaryChip}>{location === "demo" ? "Simulated location" : "Location enabled"}</span>
          </div>
          <p className={styles.storageNote}>{storageNote}</p>
          <Link className={styles.primaryButton} href="/">Explore the app</Link>
          <button type="button" className={styles.textButton} onClick={onClose}>Back to the landing page</button>
        </div>
      ) : (
        <div className={styles.flowGrid}>
          <aside className={styles.stepArt} aria-hidden="true">
            <div className={styles.ticket} style={{ "--line-color": team ? TEAMS[team].color : "#003DA5" } as CSSProperties}>
              <span className={styles.ticketLabel}>T-SPOTS / ALL ABOARD</span>
              <pre>{artworks[step]}</pre>
              <span className={styles.ticketLine}>{step === 0 ? (team ? `${team.toUpperCase()} LINE` : "FIND YOUR LINE") : step === 1 ? "YOU ARE HERE" : step === 2 ? "TAKE THE SCENIC ROUTE" : "A FACE IN THE CITY"}</span>
              <span className={styles.ticketCode}>BOSTON, MA · ONE CITY. EVERY LINE.</span>
            </div>
          </aside>
          <form className={styles.stepBody} onSubmit={next}>
            <p className={styles.eyebrow}>{["MEET YOUR CREW", "A LITTLE CONTEXT GOES A LONG WAY", "MORE THAN YOUR COMMUTE", "MAKE IT YOURS"][step]}</p>
            <h2 className={styles.stepTitle} ref={heading} tabIndex={-1}>{["Every line starts\nwith you.", "Find your place\nin the city.", "What’s your\nkind of detour?", "Put a face\nto your name."][step].split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2>
            {step === 0 && <>
              <p className={styles.stepIntro}>First, a name. Then, a color to call home.</p>
              <label htmlFor="tspots-name" className={styles.fieldLabel}>What should we call you?</label>
              <input id="tspots-name" className={styles.nameInput} autoComplete="given-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={24} required placeholder="Your first name" />
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className={styles.fieldLabel}>Pick your home line</legend>
                <div className={styles.teamGrid}>{TEAM_ROUTE_IDS.map((id) => <button key={id} type="button" aria-pressed={team === id} className={`${styles.teamButton} ${team === id ? styles.teamSelected : ""}`} onClick={() => setTeam(id)} style={{ "--line-color": TEAMS[id].color } as CSSProperties}><span className={styles.teamDot} />{id}<span aria-hidden="true">{team === id ? "✓" : "+"}</span></button>)}</div>
              </fieldset>
            </>}
            {step === 2 && <>
              <p className={styles.stepIntro}>The best part might be a stop you haven’t tried yet. Pick a few things you love, or keep an open mind.</p>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className={styles.fieldLabel}>Your interests · pick as many as you like</legend><div className={styles.interestGrid}>{[...interests, ...selected.filter((item) => !interests.includes(item))].map((interest) => <button key={interest} type="button" aria-pressed={selected.includes(interest)} className={`${styles.interestButton} ${selected.includes(interest) ? styles.interestSelected : ""}`} onClick={() => setSelected((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest])}><span aria-hidden="true">{selected.includes(interest) ? "✓" : "+"}</span>{interest}</button>)}
                {!otherOpen && <button type="button" className={styles.interestButton} onClick={() => setOtherOpen(true)}><span aria-hidden="true">+</span>Other</button>}</div>
                {otherOpen && <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <input className={styles.nameInput} aria-label="Your own interest" placeholder="Something else you love" maxLength={24} autoFocus value={otherText} onChange={(event) => setOtherText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addOther(); } }} />
                  <button type="button" className={styles.primaryButton} onClick={addOther} disabled={!otherText.trim()}>Add</button>
                </div>}</fieldset>
              <p className={styles.storageNote}>A little inspiration for your demo profile.</p>
            </>}
            {step === 3 && <>
              <p className={styles.stepIntro}>A photo for your rider card. Camera shy? Your initial looks pretty good, too.</p>
              <div className={styles.avatarStage}>
                <div className={styles.avatarPreview}>{photo ? <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="Preview of your selected profile photo" />
                </> : <span className={styles.avatarPlaceholder}>{name.trim().slice(0, 1).toUpperCase() || "T"}</span>}</div>
                <label className={styles.uploadLabel} htmlFor="tspots-photo">{photo ? "Choose another photo" : "Choose a photo"}</label>
                <input ref={fileInput} className={styles.hiddenInput} id="tspots-photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => choosePhoto(event.target.files?.[0])} aria-describedby="tspots-photo-help" />
                <p id="tspots-photo-help" className={styles.storageNote}>Optional · JPG, PNG, WebP or GIF · up to 2 MB<br />Stays in this browser for the demo.</p>
                {photo && <button className={styles.textButton} type="button" onClick={() => { fileVersion.current += 1; setPhoto(null); setPhotoLoading(false); setPhotoError(""); if (fileInput.current) fileInput.current.value = ""; }}>Remove photo</button>}
              </div>
              {photoLoading && <p role="status" className={styles.locationStatus}>Opening your photo…</p>}
              {photoError && <p role="alert" className={styles.error}>{photoError}</p>}
            </>}
            {step === 1 && <>
              <p className={styles.stepIntro}>Location is needed to verify real rides and award ride points. It also helps find nearby stops and quests.</p>
              <div className={styles.locationArt} aria-hidden="true"><span>YOU</span><span>◉</span><span>BOSTON</span></div>
              <div className={styles.locationStatus} role="status" aria-live="polite">
                {location === "idle" && "Ready when you are."}
                {location === "loading" && "Finding you… this can take a few seconds."}
                {location === "granted" && "You’re located. Ready for your first ride."}
                {location === "denied" && "Location access is blocked. Allow it in your browser’s site settings, then retry — or use the simulated demo below."}
                {location === "unavailable" && "We couldn’t get your location. Check location services and retry, or use the simulated demo below."}
                {location === "demo" && "Demo location selected: Boston. This is simulated and does not verify a real ride."}
              </div>
              {location !== "granted" && location !== "demo" && <button className={styles.primaryButton} type="button" disabled={location === "loading"} onClick={requestLocation}>{location === "loading" ? "Finding your location…" : location === "idle" ? "Enable location" : "Try location again"}</button>}
              {location !== "granted" && location !== "demo" && <button className={styles.textButton} type="button" onClick={() => { locationVersion.current += 1; setLocation("demo"); }}>Try demo location</button>}
            </>}
            <div className={styles.flowActions}>
              <button className={styles.textButton} type="button" onClick={() => step === 0 ? onClose() : setStep(step - 1)}>Back</button>
              {step < 3 ? <button className={styles.primaryButton} type="submit" disabled={step === 0 ? !name.trim() || !team : step === 1 && location !== "granted" && location !== "demo"}>Continue</button> : <button className={styles.primaryButton} type="button" disabled={photoLoading} onClick={finish}>{photo ? "Let’s go" : "Skip and go"}</button>}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
