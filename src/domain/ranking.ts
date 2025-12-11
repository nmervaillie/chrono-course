// Logique de classement : tri, podiums, etc.

// Logique de classement : tri, podiums, etc.
import type {Race, Result, Participant, GenderCode} from "./models";
import { formatDuration } from "./time";

export function sortedResults(race: Race): Result[] {
    return race.results.slice().sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);
}

export type PodiumEntry = {
    position: number;        // position dans la catégorie/genre
    generalPosition: number; // position au classement général
    team: string;
    time: string;
};

export function normalizeGenderToCode(g: string): GenderCode {
    const up = g.toUpperCase();

    if (up === "M" || up === "H") return "M";
    if (up === "F") return "F";
    if (up === "X") return "X";

    throw new Error("Genre incorrect: " + g + " - doit etre M/F/X");
}

/**
 * Calcule le podium (top 3) pour une catégorie + genre donnés dans une course.
 */
export function computePodium(
    race: Race,
    participants: Participant[],
    category: string,
    genderCode: string
): PodiumEntry[] {
    const results = sortedResults(race);

    const generalPositionByBib = new Map<string, number>();
    results.forEach((r, index) => {
        generalPositionByBib.set(r.bibNumber, index + 1);
    });

    const participantsInRace = participants.filter(
        (p) => p.competition === race.name
    );

    const targetGender = normalizeGenderToCode(genderCode);

    const filtered = results
        .map((r) => {
            const p = participantsInRace.find((pt) => pt.bibNumber === r.bibNumber);
            if (!p) return null;
            if (p.teamCategory !== category) return null;

            const participantGender = normalizeGenderToCode(p.teamGender || "");
            if (participantGender !== targetGender) return null;

            return { r, p };
        })
        .filter((x): x is { r: Result; p: Participant } => x !== null)
        .slice(0, 3);

    return filtered.map((x, idx) => ({
        position: idx + 1,
        generalPosition: generalPositionByBib.get(x.p.bibNumber) ?? 0,
        team: x.p.teamFullName,
        time: formatDuration(x.r.elapsedSeconds),
    }));
}
