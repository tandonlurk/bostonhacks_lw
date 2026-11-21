import { Suspense } from "react";
import { HuntScreen } from "@/components/hunt/HuntScreen";

export default function HuntPage() {
  return (
    <Suspense fallback={<div className="screen-bleed" />}>
      <HuntScreen />
    </Suspense>
  );
}
