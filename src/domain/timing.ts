import type {Race, Participant} from "./models";
import {normalizeGenderToCode} from "./ranking.ts";

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
    const g = normalizeGenderToCode(p.teamGender);

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
 */
export function computeElapsedSeconds(startIso: string, finishIso: string): number {
    const startMs = new Date(startIso).getTime();
    const finishMs = new Date(finishIso).getTime();

    // On passe tout en secondes entières AVANT de soustraire
    const startSec = Math.floor(startMs / 1000);
    const finishSec = Math.floor(finishMs / 1000);

    return finishSec - startSec;
}
