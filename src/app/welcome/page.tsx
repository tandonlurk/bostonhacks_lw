import type { Metadata } from "next";
import { WelcomeExperience } from "@/components/onboarding/WelcomeExperience";

export const metadata: Metadata = {
  title: "tspots · A Community of Commuters",
  description: "Meet your line, find your people, and turn your everyday T ride into a little adventure. A sample onboarding experience.",
};

export default function WelcomePage() {
  return <WelcomeExperience />;
}
