"use client";

import { useRef, useState } from "react";
import type { Rider } from "@/contracts";
import { CameraIcon, CloseIcon } from "@/components/icons";
import { Sheet } from "@/components/ui/Sheet";
import { useProfileAvatar, useProfileBio } from "@/hooks/useProfileLocal";
import { AvatarFace, AvatarFileInput, AvatarRing } from "./ProfileAvatar";
import { PaperButton } from "@/components/paper/Paper";

const BIO_MAX = 80;

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
  rider: Rider;
  onError: (message: string) => void;
}

export function EditProfileSheet({ open, onClose, rider, onError }: EditProfileSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Edit profile">
      {/* Mounted only while open so the bio draft starts from the saved value each time. */}
      {open ? <EditProfileBody rider={rider} onClose={onClose} onError={onError} /> : null}
    </Sheet>
  );
}

function EditProfileBody({ rider, onClose, onError }: Omit<EditProfileSheetProps, "open">) {
  const [avatar, setAvatar] = useProfileAvatar();
  const [bio, setBio] = useProfileBio();
  const [draft, setDraft] = useState(bio ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  function save() {
    const clean = draft.replace(/\s+/g, " ").trim().slice(0, BIO_MAX);
    if (!setBio(clean ? clean : null)) onError("Couldn't save on this device (storage is blocked).");
    onClose();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <AvatarRing team={rider.homeTeamRouteId}>
          <AvatarFace avatar={avatar} name={rider.displayName} team={rider.homeTeamRouteId} size={76} />
        </AvatarRing>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
          <PaperButton variant="primary" onClick={() => inputRef.current?.click()}>
            <CameraIcon size={18} />
            {avatar ? "Change photo" : "Add a photo"}
          </PaperButton>
          {avatar ? (
            <PaperButton onClick={() => setAvatar(null)}>
              <CloseIcon size={16} />
              Use doodle instead
            </PaperButton>
          ) : null}
        </div>
        <AvatarFileInput inputRef={inputRef} onError={onError} />
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
          Bio
          <span className="num" aria-hidden="true">
            {draft.length}/{BIO_MAX}
          </span>
        </span>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, BIO_MAX))}
          maxLength={BIO_MAX}
          rows={2}
          placeholder="Green Line lifer. Will ride for coffee."
          style={{
            resize: "none",
            padding: "12px 14px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            backgroundColor: "var(--cream)",
            backgroundImage: "var(--grain)",
            boxShadow: "inset 0 1px 2px rgba(74,52,22,0.1)",
            color: "var(--ink)",
            font: "inherit",
            fontSize: 16, // 16px stops iOS from zooming on focus
            lineHeight: 1.4,
          }}
        />
      </label>

      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -8 }}>Photo and bio stay on this phone.</p>

      <PaperButton variant="primary" onClick={save} style={{ minHeight: 52, fontSize: 16, fontWeight: 800 }}>
        Save
      </PaperButton>
    </div>
  );
}
