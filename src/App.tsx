import React, { useEffect, useState } from "react";

type Result = {
    id: string;
    bibNumber: string;
    elapsedSeconds: number;
};

type Race = {
    id: string;
    name: string; // = competition
    startedAt: string | null; // ISO
    finished: boolean;
    results: Result[];
};

type Participant = {
    bibNumber: string;
    competition: string;
    teamName: string;
    teamFullName: string;
    teamGender: string; // H / F / X (ou autre)
    teamCategory: string;
    nameParticipant1: string;
    genderParticipant1: string;
    birthDateParticipant1: string;
    clubParticipant1: string;
    licenseParticipant1: string;
    nameParticipant2: string;
    genderParticipant2: string;
    birthDateParticipant2: string;
    clubParticipant2: string;
    licenseParticipant2: string;
};

type StoredState = {
    races: Race[];
    participants: Participant[];
    currentRaceId: string | null;
};

const STORAGE_KEY = "chrono-course-with-participants-v2";

function formatDuration(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function uuid() {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function loadInitialState(): StoredState {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return { races: [], participants: [], currentRaceId: null };
        const parsed = JSON.parse(raw) as StoredState;
        return {
            races: parsed.races ?? [],
            participants: parsed.participants ?? [],
            currentRaceId: parsed.currentRaceId ?? null,
        };
    } catch {
        return { races: [], participants: [], currentRaceId: null };
    }
}

/** Petite icône info */
function InfoIcon({ text }: { text: string }) {
    return (
        <span
            style={{
                display: "inline-block",
                marginLeft: 6,
                cursor: "pointer",
                fontWeight: "bold",
                color: "#222",
                border: "1px solid #555",
                borderRadius: "50%",
                width: "16px",
                height: "16px",
                lineHeight: "14px",
                textAlign: "center",
                fontSize: "12px",
                backgroundColor: "#f9f9f9",
            }}
            title={text}
        >
      i
    </span>
    );
}

/** Lecture du CSV participants (teams + 2 participants) */
async function parseParticipantsCsv(file: File): Promise<Participant[]> {
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

function App() {
    const initial = loadInitialState();

    const [races, setRaces] = useState<Race[]>(initial.races);
    const [participants, setParticipants] = useState<Participant[]>(initial.participants);
    const [currentRaceId, setCurrentRaceId] = useState<string | null>(
        initial.currentRaceId && initial.races.some((r) => r.id === initial.currentRaceId)
            ? initial.currentRaceId
            : initial.races[0]?.id ?? null
    );

    const [bibInput, setBibInput] = useState("");
    const [importMessage, setImportMessage] = useState<string | null>(null);
    const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

    const [nowTs, setNowTs] = useState(Date.now());

    const currentRace = races.find((r) => r.id === currentRaceId) || null;

    // Sauvegarde
    useEffect(() => {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ races, participants, currentRaceId })
        );
    }, [races, participants, currentRaceId]);

    // Chrono temps réel
    useEffect(() => {
        if (!currentRace?.startedAt || currentRace.finished) return;
        const id = setInterval(() => setNowTs(Date.now()), 1000);
        return () => clearInterval(id);
    }, [currentRace?.id, currentRace?.startedAt, currentRace?.finished]);

    // ---------------- IMPORT CSV ----------------

    async function handleParticipantsFileChange(
        e: React.ChangeEvent<HTMLInputElement>
    ) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const parsed = await parseParticipantsCsv(file);
            if (parsed.length === 0) {
                setImportMessage("Aucun participant valide trouvé.");
                return;
            }

            const comps = Array.from(new Set(parsed.map((p) => p.competition)));

            const newRaces: Race[] = comps.map((name) => {
                const existing = races.find((r) => r.name === name);
                return (
                    existing ?? {
                        id: uuid(),
                        name,
                        startedAt: null,
                        finished: false,
                        results: [],
                    }
                );
            });

            setParticipants(parsed);
            setRaces(newRaces);
            setCurrentRaceId(newRaces[0]?.id ?? null);
            setImportMessage(
                `Import OK – ${parsed.length} équipes – ${comps.length} courses détectées`
            );
            setDownloadMessage(null);
            setBibInput("");
        } catch (err: any) {
            setImportMessage(err?.message ?? "Erreur de lecture du CSV.");
        } finally {
            e.target.value = "";
        }
    }

    // ---------------- COURSE ----------------

    function startRace(id: string) {
        const t = new Date().toISOString();
        setRaces((prev) =>
            prev.map((r) =>
                r.id === id ? { ...r, startedAt: t, finished: false, results: [] } : r
            )
        );
        setDownloadMessage(null);
        setBibInput("");
        setNowTs(Date.now());
    }

    function stopRace(id: string) {
        setRaces((prev) =>
            prev.map((r) => (r.id === id ? { ...r, finished: true } : r))
        );
    }

    function resetAll() {
        if (!window.confirm("Réinitialiser toutes les courses et participants ?")) return;
        setRaces([]);
        setParticipants([]);
        setCurrentRaceId(null);
        setBibInput("");
        setImportMessage(null);
        setDownloadMessage(null);
        window.localStorage.removeItem(STORAGE_KEY);
    }

    // ---------------- ARRIVÉES ----------------

    function addArrival() {
        const bib = bibInput.trim();
        if (!bib) return;

        const part = participants.find((p) => p.bibNumber === bib);
        if (!part) {
            alert(`Dossard ${bib} inconnu.`);
            return;
        }

        const race = races.find((r) => r.name === part.competition);
        if (!race) {
            alert(`Course "${part.competition}" introuvable.`);
            return;
        }

        if (!race.startedAt) {
            alert(`La course "${race.name}" n'a pas commencé.`);
            return;
        }
        if (race.finished) {
            alert(`La course "${race.name}" est terminée.`);
            return;
        }

        if (race.results.some((r) => r.bibNumber === bib)) {
            alert(`Le dossard ${bib} a déjà une arrivée enregistrée.`);
            setBibInput("");
            return;
        }

        const elapsed = Math.floor(
            (Date.now() - new Date(race.startedAt).getTime()) / 1000
        );

        const newRes: Result = {
            id: uuid(),
            bibNumber: bib,
            elapsedSeconds: elapsed,
        };

        setRaces((prev) =>
            prev.map((r) =>
                r.id === race.id ? { ...r, results: [...r.results, newRes] } : r
            )
        );

        setBibInput("");
        setDownloadMessage(null);
    }

    function handleBibKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            e.preventDefault();
            addArrival();
        }
    }

    // ---------------- EDITION / SUPPRESSION ----------------

    function sortedResults(race: Race | null) {
        if (!race) return [];
        return race.results.slice().sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);
    }

    function editResult(resultId: string) {
        if (!currentRace) return;
        const race = currentRace;
        const res = race.results.find((r) => r.id === resultId);
        if (!res) return;

        const newBib = window.prompt("Nouveau bib :", res.bibNumber);
        if (newBib === null) return;
        const bib = newBib.trim();
        if (!bib) return;

        const part = participants.find((p) => p.bibNumber === bib);
        if (!part) {
            alert(`Dossard ${bib} inconnu.`);
            return;
        }
        if (part.competition !== race.name) {
            alert(
                `Ce dossard appartient à la course "${part.competition}", pas à "${race.name}".`
            );
            return;
        }

        const duplicate = race.results.some(
            (r) => r.bibNumber === bib && r.id !== resultId
        );
        if (duplicate) {
            alert(`Le dossard ${bib} a déjà une arrivée dans cette course.`);
            return;
        }

        setRaces((prev) =>
            prev.map((r) =>
                r.id === race.id
                    ? {
                        ...r,
                        results: r.results.map((rr) =>
                            rr.id === resultId ? { ...rr, bibNumber: bib } : rr
                        ),
                    }
                    : r
            )
        );
    }

    function deleteResult(resultId: string) {
        if (!currentRace) return;
        if (!window.confirm("Supprimer cette arrivée ?")) return;
        const raceId = currentRace.id;
        setRaces((prev) =>
            prev.map((r) =>
                r.id === raceId
                    ? { ...r, results: r.results.filter((res) => res.id !== resultId) }
                    : r
            )
        );
    }

    // ---------------- EXPORT CSV ENRICHI ----------------

    function generateCsvContent(race: Race) {
        const header =
            "bib,competition,teamName,teamFullName,teamGender,teamCategory," +
            "nameParticipant1,genderParticipant1,birthDateParticipant1,clubParticipant1,licenseParticipant1," +
            "nameParticipant2,genderParticipant2,birthDateParticipant2,clubParticipant2,licenseParticipant2," +
            "elapsed_time\n";

        const lines = sortedResults(race)
            .map((r) => {
                const p = participants.find((pt) => pt.bibNumber === r.bibNumber);
                const safe = (v: string | undefined) =>
                    (v ?? "").replace(/"/g, '""'); // protection minimale

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
                ].join(",");
            })
            .join("\n");

        return header + lines + "\n";
    }

    function downloadCsv() {
        if (!currentRace) {
            setDownloadMessage("Aucune course sélectionnée.");
            return;
        }
        if (currentRace.results.length === 0) {
            setDownloadMessage("Aucun résultat à exporter.");
            return;
        }

        const csv = generateCsvContent(currentRace);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        const now = new Date();
        const ts = now.toISOString().replace(/[:.]/g, "-");
        const safeName = currentRace.name.replace(/[^a-z0-9\-]+/gi, "_");

        link.href = url;
        link.download = `results-${safeName}-${ts}.csv`;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setDownloadMessage(`CSV téléchargé pour "${currentRace.name}".`);
    }

    // ---------------- CLASSEMENT EN POPUP ----------------
    // Classement général + podiums par catégorie/genre avec colonne "Général"

    function openRankingPopup() {
        if (!currentRace) {
            alert("Aucune course sélectionnée.");
            return;
        }
        const results = sortedResults(currentRace);
        if (results.length === 0) {
            alert("Aucun résultat pour cette course.");
            return;
        }

        const dateStr = new Date().toLocaleDateString("fr-FR");
        const title = `Classement Course : ${currentRace.name} – ${dateStr}`;

        // Map bib -> position au classement général
        const generalPositionByBib = new Map<string, number>();
        results.forEach((r, index) => {
            generalPositionByBib.set(r.bibNumber, index + 1);
        });

        // Classement général (tableau complet)
        const generalRowsHtml = results
            .map((r, index) => {
                const p = participants.find((x) => x.bibNumber === r.bibNumber);
                const team = (p?.teamFullName ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const cat = (p?.teamCategory ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const time = formatDuration(r.elapsedSeconds);
                return `
          <tr>
            <td style="border-bottom:1px solid #ddd;padding:4px 8px;text-align:right;">${index + 1}</td>
            <td style="border-bottom:1px solid #ddd;padding:4px 8px;">${team}</td>
            <td style="border-bottom:1px solid #ddd;padding:4px 8px;">${cat}</td>
            <td style="border-bottom:1px solid #ddd;padding:4px 8px;text-align:right;">${time}</td>
          </tr>
        `;
            })
            .join("");

        // Participants de la course ayant un résultat
        const participantsInRace = participants.filter((p) =>
            results.some((r) => r.bibNumber === p.bibNumber)
        );

        // Catégories distinctes
        const categories = Array.from(
            new Set(participantsInRace.map((p) => p.teamCategory).filter(Boolean))
        ).sort();

        type PodiumEntry = {
            position: number;          // position dans la catégorie/genre (1,2,3)
            generalPosition: number;   // position au classement général
            team: string;
            time: string;
        };

        function computePodium(
            category: string,
            genderCode: string
        ): PodiumEntry[] {
            const filtered = results
                .map((r) => {
                    const p = participantsInRace.find(
                        (pt) => pt.bibNumber === r.bibNumber
                    );
                    if (!p) return null;
                    if (p.teamCategory !== category) return null;
                    if ((p.teamGender || "").toUpperCase() !== genderCode.toUpperCase())
                        return null;
                    return { r, p };
                })
                .filter((x): x is { r: Result; p: Participant } => x !== null)
                .sort((a, b) => a.r.elapsedSeconds - b.r.elapsedSeconds)
                .slice(0, 3);

            return filtered.map((x, idx) => ({
                position: idx + 1,
                generalPosition: generalPositionByBib.get(x.p.bibNumber) ?? 0,
                team: x.p.teamFullName,
                time: formatDuration(x.r.elapsedSeconds),
            }));
        }

        function genderLabel(code: string) {
            const c = code.toUpperCase();
            if (c === "H" || c === "M") return "Hommes";
            if (c === "F") return "Femmes";
            if (c === "X") return "Mixte";
            return code;
        }

        const genderCodes = ["H", "F", "X"];

        const categorySectionsHtml = categories
            .map((cat) => {
                const safeCat = cat.replace(/</g, "&lt;").replace(/>/g, "&gt;");

                const podiumBlocks = genderCodes
                    .map((code) => {
                        const podium = computePodium(cat, code);
                        if (podium.length === 0) return "";

                        const rows = podium
                            .map((entry) => {
                                const safeTeam = (entry.team ?? "")
                                    .replace(/</g, "&lt;")
                                    .replace(/>/g, "&gt;");
                                const generalPos =
                                    entry.generalPosition && entry.generalPosition > 0
                                        ? entry.generalPosition
                                        : "";
                                return `
              <tr>
                <td style="border-bottom:1px solid #eee;padding:2px 6px;text-align:right;">${entry.position}</td>
                <td style="border-bottom:1px solid #eee;padding:2px 6px;text-align:right;">${generalPos}</td>
                <td style="border-bottom:1px solid #eee;padding:2px 6px;">${safeTeam}</td>
                <td style="border-bottom:1px solid #eee;padding:2px 6px;text-align:right;">${entry.time}</td>
              </tr>
            `;
                            })
                            .join("");

                        return `
              <h4 style="margin:8px 0 4px;">${genderLabel(code)}</h4>
              <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px;">
                <thead>
                  <tr>
                    <th style="border-bottom:1px solid #bbb;padding:2px 6px;text-align:right;">Pos</th>
                    <th style="border-bottom:1px solid #bbb;padding:2px 6px;text-align:right;">Général</th>
                    <th style="border-bottom:1px solid #bbb;padding:2px 6px;text-align:left;">Équipe</th>
                    <th style="border-bottom:1px solid #bbb;padding:2px 6px;text-align:right;">Temps</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            `;
                    })
                    .filter((block) => block !== "")
                    .join("");

                if (!podiumBlocks) return "";

                return `
          <section style="margin-top:12px;">
            <h3 style="margin:8px 0 4px;border-bottom:1px solid #000;padding-bottom:2px;">
              Catégorie : ${safeCat}
            </h3>
            ${podiumBlocks}
          </section>
        `;
            })
            .filter((section) => section !== "")
            .join("");

        const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<style>
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    margin: 20px;
    color: #000;
    background-color: #fff;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
  }
  .logo {
    max-width: 120px;
  }
  h1 {
    font-size: 20px;
    margin: 0 0 16px;
    text-align: center;
  }
  h2 {
    font-size: 18px;
    margin: 16px 0 6px;
  }
  h3 {
    font-size: 16px;
  }
  h4 {
    font-size: 14px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th {
    border-bottom: 2px solid #000;
    text-align: left;
    padding: 4px 8px;
  }
</style>
</head>
<body>
  <div class="header">
    <div></div>
    <img src="logo.png" alt="Logo" class="logo" />
  </div>
  <h1>${title}</h1>

  <h2>Classement général</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:right;">Pos</th>
        <th>Équipe</th>
        <th>Catégorie</th>
        <th style="text-align:right;">Temps</th>
      </tr>
    </thead>
    <tbody>
      ${generalRowsHtml}
    </tbody>
  </table>

  ${
            categorySectionsHtml
                ? `<h2 style="margin-top:20px;">Podiums par catégorie et par genre</h2>${categorySectionsHtml}`
                : ""
        }
</body>
</html>
`;

        const win = window.open("", "_blank", "width=900,height=700");
        if (!win) {
            alert("Impossible d'ouvrir la fenêtre de classement (popup bloquée ?)");
            return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
    }

    // ---------------- AFFICHAGE ----------------

    function raceChrono() {
        if (!currentRace?.startedAt) return "00:00:00";
        const diff = Math.floor(
            (nowTs - new Date(currentRace.startedAt).getTime()) / 1000
        );
        return formatDuration(Math.max(0, diff));
    }

    function formatStartTime(iso: string | null) {
        if (!iso) return "-";
        const d = new Date(iso);
        return d.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
    }

    return (
        <div
            style={{
                maxWidth: 1200,
                margin: "0 auto",
                padding: 12,
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                backgroundColor: "#f5f5f7",
                color: "#111",
                minHeight: "100vh",
            }}
        >
            <h1 style={{ marginTop: 0, marginBottom: 12 }}>Chronométrage de course</h1>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "280px 1fr",
                    gap: 12,
                    alignItems: "flex-start",
                }}
            >
                {/* SIDEBAR */}
                <aside
                    style={{
                        border: "1px solid #ccc",
                        borderRadius: 6,
                        padding: 10,
                        backgroundColor: "#fff",
                    }}
                >
                    <h2 style={{ fontSize: 16, marginTop: 0 }}>Participants</h2>
                    <input type="file" accept=".csv" onChange={handleParticipantsFileChange} />
                    {importMessage && (
                        <p style={{ fontSize: 12, marginTop: 6 }}>{importMessage}</p>
                    )}
                    <p style={{ fontSize: 11, marginTop: 2 }}>
                        Format attendu
                        <InfoIcon
                            text={
                                "bib,competition,teamName,teamFullName,teamGender,teamCategory," +
                                "nameParticipant1,genderParticipant1,birthDateParticipant1,clubParticipant1,licenseParticipant1," +
                                "nameParticipant2,genderParticipant2,birthDateParticipant2,clubParticipant2,licenseParticipant2"
                            }
                        />
                    </p>

                    <hr style={{ margin: "10px 0" }} />

                    <h2 style={{ fontSize: 16, marginTop: 0 }}>Courses</h2>
                    {races.length === 0 ? (
                        <p style={{ fontSize: 13 }}>Aucune course (importer un CSV).</p>
                    ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13 }}>
                            {races.map((race) => {
                                const isActive = race.id === currentRaceId;
                                return (
                                    <li
                                        key={race.id}
                                        onClick={() => setCurrentRaceId(race.id)}
                                        style={{
                                            border: "1px solid #ddd",
                                            borderRadius: 4,
                                            padding: 6,
                                            marginBottom: 6,
                                            backgroundColor: isActive ? "#e0ecff" : "#fafafa",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <strong>{race.name}</strong>
                                        <div style={{ fontSize: 11, marginTop: 2 }}>
                                            Statut :{" "}
                                            {race.startedAt
                                                ? race.finished
                                                    ? "terminée"
                                                    : "en cours"
                                                : "non démarrée"}
                                            <br />
                                            Arrivées : {race.results.length}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    <button
                        onClick={resetAll}
                        style={{
                            marginTop: 10,
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: 4,
                            border: "none",
                            backgroundColor: "#333",
                            color: "#fff",
                            fontSize: 13,
                            cursor: "pointer",
                        }}
                    >
                        Réinitialiser tout
                    </button>
                </aside>

                {/* MAIN */}
                <main>
                    {/* Arrivées */}
                    <section
                        style={{
                            border: "1px solid #ccc",
                            borderRadius: 6,
                            padding: 10,
                            backgroundColor: "#fff",
                            marginBottom: 10,
                        }}
                    >
                        <h2 style={{ fontSize: 16, marginTop: 0 }}>Arrivées (ligne commune)</h2>
                        <div style={{ display: "flex", gap: 8 }}>
                            <input
                                type="text"
                                placeholder="bib"
                                value={bibInput}
                                onChange={(e) => setBibInput(e.target.value)}
                                onKeyDown={handleBibKeyDown}
                                style={{
                                    flex: "0 0 120px",
                                    padding: "4px 6px",
                                    borderRadius: 4,
                                    border: "1px solid #bbb",
                                    backgroundColor: "#fdfdfd",
                                    color: "#000",
                                    fontSize: 14,
                                }}
                            />
                            <button
                                onClick={addArrival}
                                disabled={participants.length === 0}
                                style={{
                                    padding: "4px 10px",
                                    borderRadius: 4,
                                    border: "none",
                                    backgroundColor: "#0050b3",
                                    color: "#fff",
                                    fontSize: 13,
                                    cursor: "pointer",
                                }}
                            >
                                Enregistrer l&apos;arrivée
                            </button>
                        </div>
                        <p style={{ fontSize: 11, marginTop: 4 }}>
                            Le dossard détermine automatiquement la course via le fichier des
                            participants.
                        </p>
                    </section>

                    {/* Course actuelle */}
                    {currentRace ? (
                        <>
                            <section
                                style={{
                                    border: "1px solid #ccc",
                                    borderRadius: 6,
                                    padding: 10,
                                    backgroundColor: "#fff",
                                    marginBottom: 10,
                                }}
                            >
                                <h2 style={{ fontSize: 16, marginTop: 0 }}>
                                    Course : {currentRace.name}
                                </h2>
                                <p style={{ fontSize: 13, margin: "2px 0" }}>
                                    Statut :{" "}
                                    {currentRace.startedAt
                                        ? currentRace.finished
                                            ? "Course terminée"
                                            : "Course en cours"
                                        : "Course non démarrée"}
                                </p>
                                <p style={{ fontSize: 13, margin: "2px 0" }}>
                                    Heure de départ : {formatStartTime(currentRace.startedAt)}
                                </p>
                                <p style={{ fontSize: 13, margin: "2px 0 6px" }}>
                                    Chrono : <strong>{raceChrono()}</strong>
                                </p>

                                <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                        onClick={() => startRace(currentRace.id)}
                                        disabled={!!currentRace.startedAt && !currentRace.finished}
                                        style={{
                                            padding: "4px 10px",
                                            borderRadius: 4,
                                            border: "none",
                                            backgroundColor: "#0070c9",
                                            color: "#fff",
                                            fontSize: 13,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Démarrer / Redémarrer
                                    </button>
                                    <button
                                        onClick={() => stopRace(currentRace.id)}
                                        disabled={!currentRace.startedAt || currentRace.finished}
                                        style={{
                                            padding: "4px 10px",
                                            borderRadius: 4,
                                            border: "none",
                                            backgroundColor: "#d9480f",
                                            color: "#fff",
                                            fontSize: 13,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Arrêter la course
                                    </button>
                                </div>
                            </section>

                            {/* Résultats */}
                            <section
                                style={{
                                    border: "1px solid #ccc",
                                    borderRadius: 6,
                                    padding: 10,
                                    backgroundColor: "#fff",
                                }}
                            >
                                <h2 style={{ fontSize: 16, marginTop: 0 }}>
                                    Résultats de la course
                                </h2>
                                {currentRace.results.length === 0 ? (
                                    <p style={{ fontSize: 13 }}>Aucun résultat pour cette course.</p>
                                ) : (
                                    <div style={{ overflowX: "auto" }}>
                                        <table
                                            style={{
                                                width: "100%",
                                                borderCollapse: "collapse",
                                                fontSize: 13,
                                            }}
                                        >
                                            <thead>
                                            <tr>
                                                <th
                                                    style={{
                                                        borderBottom: "1px solid #bbb",
                                                        textAlign: "left",
                                                        padding: "2px 4px",
                                                    }}
                                                >
                                                    bib
                                                </th>
                                                <th
                                                    style={{
                                                        borderBottom: "1px solid #bbb",
                                                        textAlign: "left",
                                                        padding: "2px 4px",
                                                    }}
                                                >
                                                    Nom (équipe)
                                                </th>
                                                <th
                                                    style={{
                                                        borderBottom: "1px solid #bbb",
                                                        textAlign: "left",
                                                        padding: "2px 4px",
                                                    }}
                                                >
                                                    Catégorie
                                                </th>
                                                <th
                                                    style={{
                                                        borderBottom: "1px solid #bbb",
                                                        textAlign: "left",
                                                        padding: "2px 4px",
                                                    }}
                                                >
                                                    Temps
                                                </th>
                                                <th
                                                    style={{
                                                        borderBottom: "1px solid #bbb",
                                                        textAlign: "left",
                                                        padding: "2px 4px",
                                                    }}
                                                >
                                                    Actions
                                                </th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {sortedResults(currentRace).map((r) => {
                                                const p = participants.find(
                                                    (pt) => pt.bibNumber === r.bibNumber
                                                );
                                                return (
                                                    <tr key={r.id}>
                                                        <td
                                                            style={{
                                                                borderBottom: "1px solid #eee",
                                                                padding: "2px 4px",
                                                            }}
                                                        >
                                                            {r.bibNumber}
                                                        </td>
                                                        <td
                                                            style={{
                                                                borderBottom: "1px solid #eee",
                                                                padding: "2px 4px",
                                                            }}
                                                        >
                                                            {p?.teamFullName ?? "-"}
                                                        </td>
                                                        <td
                                                            style={{
                                                                borderBottom: "1px solid #eee",
                                                                padding: "2px 4px",
                                                            }}
                                                        >
                                                            {p?.teamCategory ?? "-"}
                                                        </td>
                                                        <td
                                                            style={{
                                                                borderBottom: "1px solid #eee",
                                                                padding: "2px 4px",
                                                            }}
                                                        >
                                                            {formatDuration(r.elapsedSeconds)}
                                                        </td>
                                                        <td
                                                            style={{
                                                                borderBottom: "1px solid #eee",
                                                                padding: "2px 4px",
                                                            }}
                                                        >
                                                            <button
                                                                onClick={() => editResult(r.id)}
                                                                style={{
                                                                    fontSize: 11,
                                                                    padding: "2px 4px",
                                                                    marginRight: 4,
                                                                    borderRadius: 4,
                                                                    border: "none",
                                                                    backgroundColor: "#555",
                                                                    color: "#fff",
                                                                    cursor: "pointer",
                                                                }}
                                                            >
                                                                Modifier
                                                            </button>
                                                            <button
                                                                onClick={() => deleteResult(r.id)}
                                                                style={{
                                                                    fontSize: 11,
                                                                    padding: "2px 4px",
                                                                    borderRadius: 4,
                                                                    border: "none",
                                                                    backgroundColor: "#b00020",
                                                                    color: "#fff",
                                                                    cursor: "pointer",
                                                                }}
                                                            >
                                                                Supprimer
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div
                                    style={{
                                        marginTop: 8,
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 8,
                                    }}
                                >
                                    <button
                                        onClick={downloadCsv}
                                        disabled={!currentRace || currentRace.results.length === 0}
                                        style={{
                                            padding: "4px 10px",
                                            borderRadius: 4,
                                            border: "none",
                                            backgroundColor: "#0050b3",
                                            color: "#fff",
                                            fontSize: 13,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Télécharger le CSV complet
                                    </button>

                                    <button
                                        onClick={openRankingPopup}
                                        disabled={!currentRace || currentRace.results.length === 0}
                                        style={{
                                            padding: "4px 10px",
                                            borderRadius: 4,
                                            border: "none",
                                            backgroundColor: "#2b8a3e",
                                            color: "#fff",
                                            fontSize: 13,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Afficher le classement
                                    </button>

                                    {downloadMessage && (
                                        <p style={{ fontSize: 11, margin: "4px 0 0" }}>
                                            {downloadMessage}
                                        </p>
                                    )}
                                </div>
                            </section>
                        </>
                    ) : (
                        <p style={{ fontSize: 13 }}>
                            Aucune course sélectionnée. Importer un fichier CSV pour commencer.
                        </p>
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;
