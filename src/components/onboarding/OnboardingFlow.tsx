"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { TEAM_ROUTE_IDS, TEAMS, type TeamRouteId } from "@/contracts/routes";
import styles from "./onboarding.module.css";

const interests = ["Coffee stops", "Art & culture", "Food adventures", "Live music", "Hidden gems", "Outdoors", "Sports", "Campus life"];
const steps = ["Your line", "Your interests", "Your photo", "Your location"];
const artworks = [
  "      .----------.\n      |  T-SPOTS  |\n      | [ ]  [ ]  |\n      | [ ]  [ ]  |\n      |____  ____|\n       (o)----(o)\n  ==================",
  "       *     +\n    +     .     *\n       .-----.\n      /  . .  \\\n      |   v   |\n       '-----'\n    *    |    +\n       __|__",
  "       .-----.\n      /       \\\n     |  o   o  |\n     |    u    |\n      \\  ___  /\n       '-----'\n     .-'     '-.\n    /  HELLO!   \\",
  "       .-----.\n      /   +   \\\n     |    |    |\n      \\   |   /\n       \\  |  /\n        \\ | /\n         \\|/\n     .----+----.",
];

export function OnboardingFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [team, setTeam] = useState<TeamRouteId | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
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
    if (step < 3) setStep(step + 1);
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

  function finish() {
    if (location !== "granted" && location !== "demo") return;
    try {
      localStorage.setItem("tspots:demo-profile", JSON.stringify({ displayName: name.trim(), homeTeamRouteId: team, interests: selected, avatarDataUrl: photo, locationMode: location === "demo" ? "simulated" : "browser", completedAt: new Date().toISOString() }));
      setStorageNote("Demo profile saved in this browser. No account has been created.");
    } catch {
      setStorageNote("Your demo is ready for this session. Browser storage was unavailable.");
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
          <p className={styles.storageNote}>{storageNote} The app has its own rider sign-up.</p>
          <Link className={styles.primaryButton} href="/">Explore the app</Link>
          <button type="button" className={styles.textButton} onClick={onClose}>Back to the landing page</button>
        </div>
      ) : (
        <div className={styles.flowGrid}>
          <aside className={styles.stepArt} aria-hidden="true">
            <div className={styles.ticket} style={{ "--line-color": team ? TEAMS[team].color : "#003DA5" } as CSSProperties}>
              <span className={styles.ticketLabel}>T-SPOTS / ALL ABOARD</span>
              <pre>{artworks[step]}</pre>
              <span className={styles.ticketLine}>{step === 0 ? (team ? `${team.toUpperCase()} LINE` : "FIND YOUR LINE") : step === 1 ? "TAKE THE SCENIC ROUTE" : step === 2 ? "A FACE IN THE CITY" : "YOU ARE HERE"}</span>
              <span className={styles.ticketCode}>BOSTON, MA · ONE CITY. EVERY LINE.</span>
            </div>
          </aside>
          <form className={styles.stepBody} onSubmit={next}>
            <p className={styles.eyebrow}>{["MEET YOUR CREW", "MORE THAN YOUR COMMUTE", "MAKE IT YOURS", "A LITTLE CONTEXT GOES A LONG WAY"][step]}</p>
            <h2 className={styles.stepTitle} ref={heading} tabIndex={-1}>{["Every line starts\nwith you.", "What’s your\nkind of detour?", "Put a face\nto your name.", "Find your place\nin the city."][step].split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2>
            {step === 0 && <>
              <p className={styles.stepIntro}>First, a name. Then, a color to call home.</p>
              <label htmlFor="tspots-name" className={styles.fieldLabel}>What should we call you?</label>
              <input id="tspots-name" className={styles.nameInput} autoComplete="given-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={24} required placeholder="Your first name" />
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className={styles.fieldLabel}>Pick your home line</legend>
                <div className={styles.teamGrid}>{TEAM_ROUTE_IDS.map((id) => <button key={id} type="button" aria-pressed={team === id} className={`${styles.teamButton} ${team === id ? styles.teamSelected : ""}`} onClick={() => setTeam(id)} style={{ "--line-color": TEAMS[id].color } as CSSProperties}><span className={styles.teamDot} />{id}<span aria-hidden="true">{team === id ? "✓" : "+"}</span></button>)}</div>
              </fieldset>
              <div className={styles.pointsNote}><strong>Your commute builds the city.</strong><p>Verified rides earn points. First daily ride: +5. Hunts: +10. Streaks: up to +10. Every 10 points earns a token.</p><p>Everyone’s points pool together to grow a district. Points go to the line you actually ride, even when it’s away from your home color.</p></div>
            </>}
            {step === 1 && <>
              <p className={styles.stepIntro}>The best part might be a stop you haven’t tried yet. Pick a few things you love, or keep an open mind.</p>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className={styles.fieldLabel}>Your interests · pick as many as you like</legend><div className={styles.interestGrid}>{interests.map((interest) => <button key={interest} type="button" aria-pressed={selected.includes(interest)} className={`${styles.interestButton} ${selected.includes(interest) ? styles.interestSelected : ""}`} onClick={() => setSelected((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest])}><span aria-hidden="true">{selected.includes(interest) ? "✓" : "+"}</span>{interest}</button>)}</div></fieldset>
              <p className={styles.storageNote}>A little inspiration for your demo profile.</p>
            </>}
            {step === 2 && <>
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
            {step === 3 && <>
              <p className={styles.stepIntro}>Location is needed to verify real rides and award ride points. It also helps find nearby stops and quests.</p>
              <div className={styles.locationArt} aria-hidden="true"><span>YOU</span><span>◉</span><span>BOSTON</span></div>
              <p className={styles.storageNote}>Your browser will ask for permission when you tap below. This onboarding checks access once; your coordinates aren’t saved in the demo profile.</p>
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
              {step < 3 ? <button className={styles.primaryButton} type="submit" disabled={step === 0 ? !name.trim() || !team : step === 2 && photoLoading}>{step === 2 && !photo ? "Skip for now" : "Continue"}</button> : <button className={styles.primaryButton} type="button" disabled={location !== "granted" && location !== "demo"} onClick={finish}>Let’s go</button>}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
