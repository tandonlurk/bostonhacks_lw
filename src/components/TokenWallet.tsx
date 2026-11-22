import { CoinIcon } from "@/components/icons";

export function TokenWallet({ balance }: { balance: number | null }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 6,
        border: "1px solid var(--paper-edge)",
        backgroundColor: "var(--cream)",
        backgroundImage: "var(--grain)",
        boxShadow: "0 2px 0 var(--fold-shadow)",
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      <CoinIcon size={16} aria-hidden="true" />
      {balance ?? "—"} CitiTokens
    </span>
  );
}
