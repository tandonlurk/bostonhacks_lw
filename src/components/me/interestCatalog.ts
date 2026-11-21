import type { ComponentType } from "react";
import type { IconProps } from "@/components/icons";
import {
  ArtIcon,
  BooksIcon,
  CoffeeIcon,
  FoodIcon,
  GamingIcon,
  MuseumIcon,
  MusicIcon,
  NightlifeIcon,
  OutdoorsIcon,
  PhotoIcon,
  SportsIcon,
  TechIcon,
} from "./interestIcons";

export interface Interest {
  id: string;
  label: string;
  Icon: ComponentType<IconProps>;
  /** Highlight color when selected; always a bright token that reads on the dark theme. */
  color: string;
}

// Ids are stored in localStorage (tcity.interests) and may later go to the backend (issue #94),
// so never rename an id; add new ones instead.
export const INTERESTS: Interest[] = [
  { id: "coffee", label: "Coffee", Icon: CoffeeIcon, color: "var(--glow-orange)" },
  { id: "food", label: "Food", Icon: FoodIcon, color: "var(--glow-red)" },
  { id: "music", label: "Music", Icon: MusicIcon, color: "var(--hot)" },
  { id: "sports", label: "Sports", Icon: SportsIcon, color: "var(--glow-orange)" },
  { id: "art", label: "Art", Icon: ArtIcon, color: "var(--hot)" },
  { id: "museums", label: "Museums", Icon: MuseumIcon, color: "var(--glow-silver)" },
  { id: "books", label: "Books", Icon: BooksIcon, color: "var(--glow-blue)" },
  { id: "tech", label: "Tech", Icon: TechIcon, color: "var(--glow-blue)" },
  { id: "outdoors", label: "Outdoors", Icon: OutdoorsIcon, color: "var(--glow-green)" },
  { id: "nightlife", label: "Nightlife", Icon: NightlifeIcon, color: "var(--accent)" },
  { id: "gaming", label: "Gaming", Icon: GamingIcon, color: "var(--glow-green)" },
  { id: "photography", label: "Photography", Icon: PhotoIcon, color: "var(--accent)" },
];

/** Known interests in catalog order; unknown ids (old or future) are dropped. */
export function resolveInterests(ids: string[]): Interest[] {
  const set = new Set(ids);
  return INTERESTS.filter((i) => set.has(i.id));
}
