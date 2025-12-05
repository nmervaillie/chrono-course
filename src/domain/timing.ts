import type {Race, Participant} from "./models";

/**
 * Retourne l'heure de départ (ISO) à utiliser pour un participant donné
 * en fonction :
 *  - des vagues associées à sa catégorie / son genre
 *  - puis du départ général de la course
 *  - sinon null si aucun départ n'est connu
 */
export function getWaveStartForParticipant(
    race: Race,
    p: Participant
): string | null {
    const cat = p.teamCategory;
    const g = (p.teamGender || "").toUpperCase();

    // Vagues triées chronologiquement
    const wavesSorted = race.waves
        .slice()
        .sort(
            (a, b) =>
                new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
        );

    for (const wave of wavesSorted) {
        const matchCat = cat && wave.categories.includes(cat);
        const matchGen = g && wave.genders.includes(g);
        if (matchCat || matchGen) {
            return wave.startedAt;
        }
    }

    // Sinon : départ général éventuel
    return race.startedAt;
}

/**
 * Calcule un temps écoulé (en secondes) entre deux instants ISO.
 * Arrondi à la seconde inférieure.
 */
export function computeElapsedSeconds(startIso: string, finishIso: string): number {
    const start = new Date(startIso).getTime();
    const finish = new Date(finishIso).getTime();
    return Math.floor((finish - start) / 1000);
}
