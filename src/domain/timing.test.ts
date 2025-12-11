import { describe, it, expect } from "vitest";
import { getWaveStartForParticipant, computeElapsedSeconds } from "./timing";
import type {Race, Participant} from "./models";
import {normalizeGenderToCode} from "./ranking.ts";

const baseRace: Race = {
    id: "r1",
    name: "6-9",
    startedAt: "2025-12-04T10:00:00Z",
    finished: false,
    results: [],
    waves: [
        {
            id: "w1",
            startedAt: "2025-12-04T10:05:00Z",
            categories: ["Minime", "Benjamin"],
            genders: [],
        },
        {
            id: "w2",
            startedAt: "2025-12-04T10:10:00Z",
            categories: ["Pupille"],
            genders: [],
        },
    ],
};

const makeParticipant = (cat: string, gender: string): Participant =>
    ({
        bibNumber: "1",
        competition: "6-9",
        teamName: "Team",
        teamFullName: "Team Full",
        teamGender: normalizeGenderToCode(gender),
        teamCategory: cat,
        nameParticipant1: "",
        genderParticipant1: normalizeGenderToCode(gender),
        birthDateParticipant1: "",
        clubParticipant1: "",
        licenseParticipant1: "",
        nameParticipant2: "",
        genderParticipant2: normalizeGenderToCode(gender),
        birthDateParticipant2: "",
        clubParticipant2: "",
        licenseParticipant2: "",
    } as Participant);

describe("getWaveStartForParticipant", () => {
    it("utilise la vague correspondant à la catégorie", () => {
        const p = makeParticipant("Minime", "H");
        const start = getWaveStartForParticipant(baseRace, p);
        expect(start).toBe("2025-12-04T10:05:00Z");
    });

    it("utilise la vague correspondant à la catégorie", () => {
        const p = makeParticipant("Pupille", "H");
        const start = getWaveStartForParticipant(baseRace, p);
        expect(start).toBe("2025-12-04T10:10:00Z");
    });

    it("retourne le départ général s'il n'y a pas de vague correspondante", () => {
        const p = makeParticipant("Senior", "H");
        const start = getWaveStartForParticipant(baseRace, p);
        expect(start).toBe("2025-12-04T10:00:00Z");
    });

    it("retourne null si aucun départ n'est défini", () => {
        const raceNoStart: Race = { ...baseRace, startedAt: null, waves: [] };
        const p = makeParticipant("Senior", "H");
        const start = getWaveStartForParticipant(raceNoStart, p);
        expect(start).toBeNull();
    });
});

function iso(h: number, m: number, s: number, ms = 0) {
    const d = new Date(Date.UTC(2025, 0, 1, h, m, s, ms));
    return d.toISOString();
}

describe("computeElapsedSeconds – précision à la seconde", () => {
    it("calcule correctement le temps même si le départ contient des millisecondes", () => {
        const start = iso(10, 0, 0, 523); // 10:00:00.523
        const arrival = iso(10, 5, 0, 0); // 10:05:00.000

        const elapsed = computeElapsedSeconds(start, arrival);
        expect(elapsed).toBe(300); // 5 minutes
    });

    it("ne doit pas perdre 1 seconde à cause d'un arrondi flottant", () => {
        const start = iso(14, 12, 33, 987);
        const arrival = iso(14, 17, 33, 0); // + 5 minutes

        const elapsed = computeElapsedSeconds(start, arrival);
        expect(elapsed).toBe(300);
    });

    it("fonctionne aussi quand les deux timestamps ont des millisecondes", () => {
        const start = iso(9, 30, 10, 450);
        const arrival = iso(9, 31, 15, 900); // +65.45 sec

        // floor sur chaque ISO → 9:30:10 → 9:31:15 => 65 sec
        const elapsed = computeElapsedSeconds(start, arrival);
        expect(elapsed).toBe(65);
    });

    it("donne zéro si l'arrivée est la même seconde que le départ", () => {
        const start = iso(12, 0, 0, 999);
        const arrival = iso(12, 0, 0, 100);

        // floor : 12:00:00 -> 12:00:00 → diff = 0
        const elapsed = computeElapsedSeconds(start, arrival);
        expect(elapsed).toBe(0);
    });

    it("donne un temps positif juste après le départ (1 seconde)", () => {
        const start = iso(12, 0, 0, 800);
        const arrival = iso(12, 0, 1, 50);

        const elapsed = computeElapsedSeconds(start, arrival);
        expect(elapsed).toBe(1);
    });

    it("respecte les modifications manuelles d'heure d'arrivée", () => {
        // Le participant avait arrivalAt = 14:30:00
        // L'utilisateur modifie l'heure vers 14:32:10
        const start = iso(14, 20, 0, 123);   // départ vague
        const arrival = iso(14, 32, 10, 0); // utilisateur entre "14:32:10"

        const elapsed = computeElapsedSeconds(start, arrival);
        expect(elapsed).toBe(730); // 12 min 10 s
    });
});
