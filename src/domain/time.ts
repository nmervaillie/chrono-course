
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
