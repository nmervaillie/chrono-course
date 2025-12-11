import { describe, it, expect } from "vitest";
import { getWaveStartForParticipant, computeElapsedSeconds } from "./timing";
import type {Race, Participant} from "./models";

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
        teamGender: gender,
        teamCategory: cat,
        nameParticipant1: "",
        genderParticipant1: "",
        birthDateParticipant1: "",
        clubParticipant1: "",
        licenseParticipant1: "",
        nameParticipant2: "",
        genderParticipant2: "",
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

describe("computeElapsedSeconds", () => {
    it("calcule un temps correct en secondes", () => {
        const start = "2025-12-04T10:00:00Z";
        const finish = "2025-12-04T10:01:30Z";
        const elapsed = computeElapsedSeconds(start, finish);
        expect(elapsed).toBe(90);
    });
});
