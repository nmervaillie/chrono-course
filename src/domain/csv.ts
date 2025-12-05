// Parsing du CSV d'entrée (participants) et génération du CSV de résultats.

// Parsing du CSV d'entrée (participants) et génération du CSV de résultats.
import type {Participant, Race} from "./models";
import { formatDuration, formatTimeOfDayFromIso } from "./time";

/** Lecture du CSV participants (teams + 2 participants) */
export async function parseParticipantsCsv(file: File): Promise<Participant[]> {
    const text = await file.text();
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l !== "");

    if (lines.length < 2) throw new Error("CSV vide ou sans données.");

    const header = lines[0];
    const delimiter = header.includes(";") ? ";" : ",";
    const cols = header.split(delimiter).map((c) => c.trim().toLowerCase());
    const idx = (n: string) => cols.indexOf(n.toLowerCase());

    const required = [
        "bib",
        "competition",
        "teamname",
        "teamfullname",
        "teamgender",
        "teamcategory",
        "nameparticipant1",
        "genderparticipant1",
        "birthdateparticipant1",
        "clubparticipant1",
        "licenseparticipant1",
        "nameparticipant2",
        "genderparticipant2",
        "birthdateparticipant2",
        "clubparticipant2",
        "licenseparticipant2",
    ];

    for (const col of required) {
        if (idx(col) === -1) {
            throw new Error(
                "En-tête CSV invalide. Colonnes requises : " + required.join(", ")
            );
        }
    }

    const participants: Participant[] = [];

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (!row) continue;

        const cells = row.split(delimiter).map((c) => c.trim());
        if (cells.length < cols.length) continue;

        const get = (c: string) => cells[idx(c)] ?? "";

        const bib = get("bib");
        const competition = get("competition");
        if (!bib || !competition) continue;

        participants.push({
            bibNumber: bib,
            competition,
            teamName: get("teamname"),
            teamFullName: get("teamfullname"),
            teamGender: get("teamgender"),
            teamCategory: get("teamcategory"),
            nameParticipant1: get("nameparticipant1"),
            genderParticipant1: get("genderparticipant1"),
            birthDateParticipant1: get("birthdateparticipant1"),
            clubParticipant1: get("clubparticipant1"),
            licenseParticipant1: get("licenseparticipant1"),
            nameParticipant2: get("nameparticipant2"),
            genderParticipant2: get("genderparticipant2"),
            birthDateParticipant2: get("birthdateparticipant2"),
            clubParticipant2: get("clubparticipant2"),
            licenseParticipant2: get("licenseparticipant2"),
        });
    }

    return participants;
}

/**
 * Génère le CSV de résultats d'une course, enrichi avec toutes les infos participant.
 * (même format que celui qu'on avait dans App.tsx)
 */
export function generateResultsCsv(race: Race, participants: Participant[]): string {
    const header =
        "bib,competition,teamName,teamFullName,teamGender,teamCategory," +
        "nameParticipant1,genderParticipant1,birthDateParticipant1,clubParticipant1,licenseParticipant1," +
        "nameParticipant2,genderParticipant2,birthDateParticipant2,clubParticipant2,licenseParticipant2," +
        "elapsed_time,arrival_time\n";

    const safe = (v: string | undefined) => (v ?? "").replace(/"/g, '""');

    const resultsSorted = race.results
        .slice()
        .sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);

    const lines = resultsSorted
        .map((r) => {
            const p = participants.find((pt) => pt.bibNumber === r.bibNumber);

            if (!p) {
                return [
                    r.bibNumber,
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    formatDuration(r.elapsedSeconds),
                    formatTimeOfDayFromIso(r.arrivalAt),
                ].join(",");
            }

            return [
                safe(p.bibNumber),
                safe(p.competition),
                safe(p.teamName),
                safe(p.teamFullName),
                safe(p.teamGender),
                safe(p.teamCategory),
                safe(p.nameParticipant1),
                safe(p.genderParticipant1),
                safe(p.birthDateParticipant1),
                safe(p.clubParticipant1),
                safe(p.licenseParticipant1),
                safe(p.nameParticipant2),
                safe(p.genderParticipant2),
                safe(p.birthDateParticipant2),
                safe(p.clubParticipant2),
                safe(p.licenseParticipant2),
                formatDuration(r.elapsedSeconds),
                formatTimeOfDayFromIso(r.arrivalAt),
            ].join(",");
        })
        .join("\n");

    return header + lines + "\n";
}
