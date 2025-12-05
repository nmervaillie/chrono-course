import { describe, it, expect } from "vitest";
import type {Race, Participant} from "./models";
import { sortedResults, computePodium } from "./ranking";

const race: Race = {
    id: "r1",
    name: "6-9",
    startedAt: null,
    finished: false,
    results: [
        { id: "a", bibNumber: "1", elapsedSeconds: 100, arrivalAt: "" }, // 1er
        { id: "b", bibNumber: "2", elapsedSeconds: 120, arrivalAt: "" }, // 2e
        { id: "c", bibNumber: "3", elapsedSeconds: 150, arrivalAt: "" }, // 3e
    ],
    waves: [],
};

const participants: Participant[] = [
    {
        bibNumber: "1",
        competition: "6-9",
        teamName: "",
        teamFullName: "Equipe A",
        teamGender: "F",
        teamCategory: "Cadet",
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
    } as Participant,
    {
        bibNumber: "2",
        competition: "6-9",
        teamName: "",
        teamFullName: "Equipe B",
        teamGender: "M", // normalisé en H
        teamCategory: "Cadet",
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
    } as Participant,
    {
        bibNumber: "3",
        competition: "6-9",
        teamName: "",
        teamFullName: "Equipe C",
        teamGender: "F",
        teamCategory: "Senior",
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
    } as Participant,
];

describe("sortedResults", () => {
    it("classe les résultats par temps croissant", () => {
        const sorted = sortedResults(race);
        expect(sorted.map((r) => r.bibNumber)).toEqual(["1", "2", "3"]);
    });
});

describe("computePodium", () => {
    it("retourne un podium F pour une catégorie donnée", () => {
        const podiumF = computePodium(race, participants, "Cadet", "F");
        expect(podiumF).toHaveLength(1);
        expect(podiumF[0].team).toBe("Equipe A");
        expect(podiumF[0].position).toBe(1);
        expect(podiumF[0].generalPosition).toBe(1);
    });

    it("retourne un podium H incluant les genres M", () => {
        const podiumH = computePodium(race, participants, "Cadet", "H");
        expect(podiumH).toHaveLength(1);
        expect(podiumH[0].team).toBe("Equipe B");
        expect(podiumH[0].position).toBe(1);
        // au général, Equipe B est 2e
        expect(podiumH[0].generalPosition).toBe(2);
    });

    it("retourne un podium vide si aucune correspondance", () => {
        const podium = computePodium(race, participants, "Benjamin", "F");
        expect(podium).toHaveLength(0);
    });
});
