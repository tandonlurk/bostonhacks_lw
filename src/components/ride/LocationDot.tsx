import styles from "./ride.module.css";

/** The classic upright blue dot: soft ground pulse, drop shadow, white ring. Centered on its parent's origin. */
export function LocationDot() {
  return (
    <div className={styles.dot}>
      <div className={styles.dotPulseWrap}>
        <div className={styles.dotPulse} />
      </div>
      <div className={styles.dotShadow} />
      <div className={styles.dotBody} />
    </div>
  );
}
