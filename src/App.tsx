import React, { useEffect, useState } from "react";
import type {Race, Result, Participant, StartWave, GenderCode} from "./domain/models";
import { formatDuration, formatTimeOfDayFromIso, parseTimeOfDayToDate } from "./domain/time";
import { getWaveStartForParticipant } from "./domain/timing";
import { parseParticipantsCsv, generateResultsCsv } from "./domain/csv";
import { sortedResults } from "./domain/ranking";
import { Sidebar } from "./components/Sidebar";
import { ArrivalInput } from "./components/ArrivalInput";
import { ResultsSection } from "./components/ResultsSection";

type StoredState = {
    races: Race[];
    participants: Participant[];
    currentRaceId: string | null;
};

const STORAGE_KEY = "chrono-course-with-participants-v3";

function uuid() {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function loadInitialState(): StoredState {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return { races: [], participants: [], currentRaceId: null };
        const parsed = JSON.parse(raw) as StoredState | any;

        // Compat pour anciens formats
        const races: Race[] = (parsed.races ?? []).map((r: any) => ({
            id: r.id,
            name: r.name,
            startedAt: r.startedAt ?? null,
            finished: r.finished ?? false,
            results: (r.results ?? []).map((res: any) => ({
                id: res.id,
                bibNumber: res.bibNumber,
                elapsedSeconds: res.elapsedSeconds,
                // on garde l'arrivée si elle existe, sinon on laisse undefined
                arrivalAt: res.arrivalAt ?? res.arrival_time ?? undefined,
            })),
            waves: r.waves ?? [],
        }));

        return {
            races,
            participants: parsed.participants ?? [],
            currentRaceId: parsed.currentRaceId ?? null,
        };
    } catch {
        return { races: [], participants: [], currentRaceId: null };
    }
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

    // sélection pour une nouvelle vague de départ
    const [waveCategories, setWaveCategories] = useState<string[]>([]);
    const [waveGenders, setWaveGenders] = useState<GenderCode[]>([]);

    // Sauvegarde
    useEffect(() => {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ races, participants, currentRaceId })
        );
    }, [races, participants, currentRaceId]);

    // Chrono temps réel (sur le départ général)
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
                        waves: [],
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
                r.id === id
                    ? {
                        ...r,
                        startedAt: t,
                        finished: false,
                        results: [],
                        waves: [], // on repart de zéro
                    }
                    : r
            )
        );
        setDownloadMessage(null);
        setBibInput("");
        setWaveCategories([]);
        setWaveGenders([]);
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

    // ---------------- DÉPARTS DÉCALÉS (VAGUES) ----------------

    function createWave() {
        if (!currentRace) return;
        if (currentRace.finished) {
            alert("La course est terminée.");
            return;
        }
        if (waveCategories.length === 0 && waveGenders.length === 0) {
            alert("Sélectionner au moins une catégorie ou un genre.");
            return;
        }

        const nowIso = new Date().toISOString();
        const newWave: StartWave = {
            id: uuid(),
            startedAt: nowIso,
            categories: [...waveCategories],
            genders: [...waveGenders],
        };

        setRaces((prev) =>
            prev.map((r) =>
                r.id === currentRace.id
                    ? {
                        ...r,
                        waves: [...r.waves, newWave],
                    }
                    : r
            )
        );

        // On garde ou on efface la sélection ? Je choisis de l'effacer
        setWaveCategories([]);
        setWaveGenders([]);
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

        if (race.finished) {
            alert(`La course "${race.name}" est terminée.`);
            return;
        }

        const startIso = getWaveStartForParticipant(race, part);
        if (!startIso) {
            alert(
                `Aucune heure de départ définie pour cette course / groupe (vague correspondant ni départ général).`
            );
            return;
        }

        if (race.results.some((r) => r.bibNumber === bib)) {
            alert(`Le dossard ${bib} a déjà une arrivée enregistrée.`);
            setBibInput("");
            return;
        }

        const nowIso = new Date().toISOString();
        const elapsed = Math.floor(
            (Date.now() - new Date(startIso).getTime()) / 1000
        );

        const newRes: Result = {
            id: uuid(),
            bibNumber: bib,
            elapsedSeconds: elapsed,
            arrivalAt: nowIso,
        };

        setRaces((prev) =>
            prev.map((r) =>
                r.id === race.id ? { ...r, results: [...r.results, newRes] } : r
            )
        );

        setBibInput("");
        setDownloadMessage(null);
    }

    // ---------------- EDITION / SUPPRESSION ----------------

    function editResult(resultId: string) {
        if (!currentRace) return;
        const race = currentRace;
        const res = race.results.find((r) => r.id === resultId);
        if (!res) return;

        // 1) Édition du bib
        const newBibInput = window.prompt("Nouveau bib :", res.bibNumber);
        if (newBibInput === null) return; // annulation
        const newBib = newBibInput.trim();
        if (!newBib) return;

        const part = participants.find((p) => p.bibNumber === newBib);
        if (!part) {
            alert(`Dossard ${newBib} inconnu.`);
            return;
        }
        if (part.competition !== race.name) {
            alert(
                `Ce dossard appartient à la course "${part.competition}", pas à "${race.name}".`
            );
            return;
        }

        const duplicate = race.results.some(
            (r) => r.bibNumber === newBib && r.id !== resultId
        );
        if (duplicate) {
            alert(`Le dossard ${newBib} a déjà une arrivée dans cette course.`);
            return;
        }

        // 2) Édition de l'heure d'arrivée (arrival_time)
        const currentArrivalStr = formatTimeOfDayFromIso(res.arrivalAt);
        const timePrompt = `Nouvelle heure d'arrivée pour le bib ${newBib} (format hh:mm:ss) :`;
        const newArrivalInput = window.prompt(timePrompt, currentArrivalStr || "00:00:00");
        if (newArrivalInput === null) return; // annulation

        const startIso = getWaveStartForParticipant(race, part);
        if (!startIso) {
            alert(
                `Impossible de calculer le temps : aucun départ défini pour cette course / ce groupe.`
            );
            return;
        }

        // Si on a déjà une arrivalAt, on réutilise la date; sinon on prend aujourd'hui.
        const baseIso = res.arrivalAt || new Date().toISOString();
        const newArrivalIso = parseTimeOfDayToDate(baseIso, newArrivalInput);
        if (!newArrivalIso) {
            alert(
                `Heure d'arrivée invalide. Utiliser le format hh:mm:ss, par ex. 14:32:07.`
            );
            return;
        }

        const elapsed = Math.floor(
            (new Date(newArrivalIso).getTime() - new Date(startIso).getTime()) / 1000
        );
        if (elapsed < 0) {
            alert(
                `L'heure d'arrivée est avant l'heure de départ (${elapsed}s). Vérifie le temps saisi.`
            );
            return;
        }

        // 3) Mise à jour du résultat dans l'état
        setRaces((prev) =>
            prev.map((r) =>
                r.id === race.id
                    ? {
                        ...r,
                        results: r.results.map((rr) =>
                            rr.id === resultId
                                ? {
                                    ...rr,
                                    bibNumber: newBib,
                                    arrivalAt: newArrivalIso,
                                    elapsedSeconds: elapsed,
                                }
                                : rr
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

    function downloadCsv() {
        if (!currentRace) {
            setDownloadMessage("Aucune course sélectionnée.");
            return;
        }
        if (currentRace.results.length === 0) {
            setDownloadMessage("Aucun résultat à exporter.");
            return;
        }

        const csv = generateResultsCsv(currentRace, participants);
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

    // ---------------- CLASSEMENT EN POPUP (inchangé) ----------------

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

        const generalPositionByBib = new Map<string, number>();
        results.forEach((r, index) => {
            generalPositionByBib.set(r.bibNumber, index + 1);
        });

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

        const participantsInRace = participants.filter((p) =>
            results.some((r) => r.bibNumber === p.bibNumber)
        );

        const categories = Array.from(
            new Set(participantsInRace.map((p) => p.teamCategory).filter(Boolean))
        ).sort();

        type PodiumEntry = {
            position: number;
            generalPosition: number;
            team: string;
            time: string;
        };

        function normalizeGender(g: string): string {
            const up = g.toUpperCase();
            // On considère "M" comme "H" pour le classement
            if (up === "M") return "H";
            return up;
        }

        function computePodium(
            category: string,
            genderCode: string
        ): PodiumEntry[] {
            const targetGender = normalizeGender(genderCode);

            const filtered = results
                .map((r) => {
                    const p = participantsInRace.find(
                        (pt) => pt.bibNumber === r.bibNumber
                    );
                    if (!p) return null;

                    if (p.teamCategory !== category) return null;

                    const participantGender = normalizeGender(p.teamGender || "");
                    if (participantGender !== targetGender) return null;

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
                <td style="border-bottom:1px solid #eee;padding:2px 6px;">${safeTeam}</td>
                <td style="border-bottom:1px solid #eee;padding:2px 6px;text-align:right;">${entry.time}</td>
                <td style="border-bottom:1px solid #eee;padding:2px 6px;text-align:right;">${generalPos}</td>
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
                    <th style="border-bottom:1px solid #bbb;padding:2px 6px;text-align:left;">Équipe</th>
                    <th style="border-bottom:1px solid #bbb;padding:2px 6px;text-align:right;">Temps</th>
                    <th style="border-bottom:1px solid #bbb;padding:2px 6px;text-align:right;">Général</th>
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
                <Sidebar
                    races={races}
                    currentRaceId={currentRaceId}
                    onSelectRace={setCurrentRaceId}
                    onResetAll={resetAll}
                    importMessage={importMessage}
                    onFileChange={handleParticipantsFileChange}
                />

                <main>
                    <ArrivalInput
                        bib={bibInput}
                        onChangeBib={setBibInput}
                        onSubmit={addArrival}
                        disabled={participants.length === 0}
                    />

                    {currentRace ? (
                        <ResultsSection
                            race={currentRace}
                            participants={participants}
                            nowTs={nowTs}
                            waveCategories={waveCategories}
                            waveGenders={waveGenders}
                            onToggleWaveCategory={(cat) =>
                                setWaveCategories((prev) =>
                                    prev.includes(cat)
                                        ? prev.filter((c) => c !== cat)
                                        : [...prev, cat]
                                )
                            }
                            onToggleWaveGender={(g) =>
                                setWaveGenders((prev) =>
                                    prev.includes(g)
                                        ? prev.filter((x) => x !== g)
                                        : [...prev, g]
                                )
                            }
                            onCreateWave={createWave}
                            onStartRace={() => startRace(currentRace.id)}
                            onStopRace={() => stopRace(currentRace.id)}
                            onEditResult={editResult}
                            onDeleteResult={deleteResult}
                            onDownloadCsv={downloadCsv}
                            onOpenRanking={openRankingPopup}
                            downloadMessage={downloadMessage}
                        />
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
