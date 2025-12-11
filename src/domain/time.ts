
/**
 * Formate un nombre de secondes en hh:mm:ss
 * (ex: 3661 -> "01:01:01")
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatTimeOfDayFromIso(iso: string | undefined | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

export function parseTimeOfDayToDate(baseIso: string, timeStr: string): string | null {
    // timeStr attendu au format "hh:mm:ss"
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (!match) return null;
    let [_, hStr, mStr, sStr] = match;
    const h = Number(hStr);
    const m = Number(mStr);
    const s = Number(sStr);
    if (isNaN(h) || isNaN(m) || isNaN(s) || h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) {
        return null;
    }

    const base = new Date(baseIso);
    base.setHours(h, m, s, 0);
    return base.toISOString();
}
