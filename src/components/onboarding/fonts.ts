import { Bricolage_Grotesque } from "next/font/google";

// The site display font moved to Fraunces in #134; the landing + onboarding keep Bricolage.
export const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", weight: ["600", "700", "800"] });
