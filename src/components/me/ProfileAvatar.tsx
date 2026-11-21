"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { TeamRouteId } from "@/contracts/routes";
import { CameraIcon } from "@/components/icons";
import { useProfileAvatar } from "@/hooks/useProfileLocal";
import { DefaultAvatar } from "./DefaultAvatar";
import { fileToAvatarDataUrl } from "./downscaleImage";
import { glowVar, lineVar } from "./team";
import s from "./me.module.css";

interface ProfileAvatarProps {
  name: string;
  team: TeamRouteId;
  size?: number;
  /** Called with a short human message when the photo couldn't be saved. */
  onError?: (message: string) => void;
}

/** Profile picture inside an Instagram-style story ring in the rider's line color. Tap to pick a new photo. */
export function ProfileAvatar({ name, team, size = 124, onError }: ProfileAvatarProps) {
  const [avatar] = useProfileAvatar();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        className={s.avatarBtn}
        onClick={() => inputRef.current?.click()}
        aria-label={avatar ? "Change profile picture" : "Add a profile picture"}
        style={{ position: "relative" }}
      >
        <AvatarRing team={team}>
          <AvatarFace avatar={avatar} name={name} team={team} size={size} />
        </AvatarRing>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 2,
            bottom: 4,
            display: "grid",
            placeItems: "center",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            border: "3px solid var(--bg)",
          }}
        >
          <CameraIcon size={18} weight={2.2} />
        </span>
      </button>
      <AvatarFileInput inputRef={inputRef} onError={onError} />
    </>
  );
}

export function AvatarRing({ team, children }: { team: TeamRouteId; children: React.ReactNode }) {
  return (
    <span
      className={s.ring}
      style={{ display: "block", ["--ring-a" as string]: glowVar(team), ["--ring-b" as string]: lineVar(team) }}
    >
      <span className={s.ringInner} style={{ display: "block" }}>
        {children}
      </span>
    </span>
  );
}

export function AvatarFace({ avatar, name, team, size }: { avatar: string | null; name: string; team: TeamRouteId; size: number }) {
  if (!avatar) return <DefaultAvatar name={name} team={team} size={size} />;
  return (
    <Image
      src={avatar}
      alt=""
      width={size}
      height={size}
      unoptimized
      style={{ display: "block", width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
    />
  );
}

/** Hidden file picker shared by the avatar and the edit sheet. Saves to localStorage tcity.avatar. */
export function AvatarFileInput({
  inputRef,
  onError,
  onSaved,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onError?: (message: string) => void;
  onSaved?: () => void;
}) {
  const [, setAvatar] = useProfileAvatar();
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file || busy) return;
    setBusy(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      if (!setAvatar(dataUrl)) onError?.("Couldn't save the photo on this device (storage is full or blocked).");
      else onSaved?.();
    } catch {
      onError?.("That file didn't look like a photo. Try a JPG or PNG.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      onChange={onChange}
      className="visually-hidden"
      tabIndex={-1}
      aria-hidden="true"
    />
  );
}
