import type { Metadata } from "next";
import { WelcomeExperience } from "@/components/onboarding/WelcomeExperience";

export const metadata: Metadata = {
  title: "t-spots · Your commute builds the city",
  description: "Meet your line, find your people, and turn your everyday T ride into a little adventure. A sample onboarding experience.",
};

export default function WelcomePage() {
  return <WelcomeExperience />;
}
