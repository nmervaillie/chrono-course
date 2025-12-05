import { describe, it, expect } from "vitest";
import { parseParticipantsCsv, generateResultsCsv } from "./csv";
import type {Race, Participant} from "./models";

function makeFile(name: string, content: string): File {
    return new File([content], name, { type: "text/csv" });
}

describe("parseParticipantsCsv", () => {
    it("parse un CSV minimal avec une ligne valide", async () => {
        const csv = [
            "bib,competition,teamName,teamFullName,teamGender,teamCategory,nameParticipant1,genderParticipant1,birthDateParticipant1,clubParticipant1,licenseParticipant1,nameParticipant2,genderParticipant2,birthDateParticipant2,clubParticipant2,licenseParticipant2",
            "1,6-9,TeamA,Team A Full,F,Junior,Alice,F,2010-01-01,ClubA,LIC1,Bob,M,2009-01-01,ClubB,LIC2",
        ].join("\n");

        const file = makeFile("participants.csv", csv);
        const participants = await parseParticipantsCsv(file);

        expect(participants).toHaveLength(1);
        expect(participants[0].bibNumber).toBe("1");
        expect(participants[0].teamFullName).toBe("Team A Full");
        expect(participants[0].teamGender).toBe("F");
        expect(participants[0].teamCategory).toBe("Junior");
    });

    it("ignore les lignes sans bib ou competition", async () => {
        const csv = [
            "bib,competition,teamName,teamFullName,teamGender,teamCategory,nameParticipant1,genderParticipant1,birthDateParticipant1,clubParticipant1,licenseParticipant1,nameParticipant2,genderParticipant2,birthDateParticipant2,clubParticipant2,licenseParticipant2",
            ",6-9,TeamA,Team A Full,F,Junior,Alice,F,2010-01-01,ClubA,LIC1,Bob,M,2009-01-01,ClubB,LIC2",
            "2,,TeamB,Team B Full,M,Junior,Charlie,M,2010-02-02,ClubC,LIC3,Dana,F,2009-02-02,ClubD,LIC4",
        ].join("\n");

        const file = makeFile("participants.csv", csv);
        const participants = await parseParticipantsCsv(file);

        expect(participants).toHaveLength(0);
    });
});

describe("generateResultsCsv", () => {
    const race: Race = {
        id: "r1",
        name: "6-9",
        startedAt: null,
        finished: false,
        results: [
            { id: "a", bibNumber: "1", elapsedSeconds: 90, arrivalAt: "" },
            { id: "b", bibNumber: "2", elapsedSeconds: 120, arrivalAt: "" },
        ],
        waves: [],
    };

    const participants: Participant[] = [
        {
            bibNumber: "1",
            competition: "6-9",
            teamName: "TeamA",
            teamFullName: "Team A Full",
            teamGender: "F",
            teamCategory: "Junior",
            nameParticipant1: "Alice",
            genderParticipant1: "F",
            birthDateParticipant1: "2010-01-01",
            clubParticipant1: "ClubA",
            licenseParticipant1: "LIC1",
            nameParticipant2: "Bob",
            genderParticipant2: "M",
            birthDateParticipant2: "2009-01-01",
            clubParticipant2: "ClubB",
            licenseParticipant2: "LIC2",
        } as Participant,
    ];

    it("génère un CSV avec les temps formatés et toutes les colonnes", () => {
        const csv = generateResultsCsv(race, participants);

        // Contient l'en-tête
        expect(csv).toContain("bib,competition,teamName,teamFullName");

        // Contient la ligne pour bib 1
        expect(csv).toContain("1,6-9,TeamA,Team A Full");

        // elapsedSeconds = 90 -> 00:01:30
        expect(csv).toContain("00:01:30");

        // Pour bib 2 sans participant connu, on doit au moins avoir le temps:
        expect(csv).toContain("00:02:00");
    });
});
