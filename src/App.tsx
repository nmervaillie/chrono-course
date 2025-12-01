import React, { useEffect, useState } from "react";

type Result = {
    id: string;
    bibNumber: string;
    elapsedSeconds: number;
};

type Race = {
    id: string;
    name: string;
    startedAt: string | null; // ISO
    finished: boolean;
    results: Result[];
};

type Participant = {
    bibNumber: string;
    name: string;
    category: string;
    gender: string;
    raceName: string;
};

type StoredState = {
    races: Race[];
    participants: Participant[];
    currentRaceId: string | null;
};

const STORAGE_KEY = "chrono-course-with-participants-v1";

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
        if (!raw) {
            return { races: [], participants: [], currentRaceId: null };
        }
        const parsed = JSON.parse(raw) as StoredState;
        return {
            races: Array.isArray(parsed.races) ? parsed.races : [],
            participants: Array.isArray(parsed.participants) ? parsed.participants : [],
            currentRaceId: parsed.currentRaceId ?? null,
        };
    } catch {
        return { races: [], participants: [], currentRaceId: null };
    }
}

/** Parse le CSV des participants */
async function parseParticipantsCsv(file: File): Promise<Participant[]> {
    const text = await file.text();
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    if (lines.length < 2) {
        throw new Error("CSV vide ou sans données.");
    }

    const headerLine = lines[0];
    const delimiter = headerLine.includes(";") ? ";" : ",";

    const headerCells = headerLine.split(delimiter).map((h) => h.trim().toLowerCase());

    const bibIndex = headerCells.indexOf("bib");
    const nameIndex = headerCells.indexOf("name");
    const categoryIndex = headerCells.indexOf("category");
    const genderIndex = headerCells.indexOf("gender");
    const raceIndex = headerCells.indexOf("race");

    if (
        bibIndex === -1 ||
        nameIndex === -1 ||
        categoryIndex === -1 ||
        genderIndex === -1 ||
        raceIndex === -1
    ) {
        throw new Error(
            "En-tête CSV invalide. Colonnes requises : bib,name,category,gender,race"
        );
    }

    const participants: Participant[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const cells = line.split(delimiter);

        if (cells.length < headerCells.length) continue;

        const bib = cells[bibIndex]?.trim();
        const name = cells[nameIndex]?.trim();
        const category = cells[categoryIndex]?.trim();
        const gender = cells[genderIndex]?.trim();
        const raceName = cells[raceIndex]?.trim();

        if (!bib || !raceName) continue;

        participants.push({
            bibNumber: bib,
            name,
            category,
            gender,
            raceName,
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
    const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
    const [importMessage, setImportMessage] = useState<string | null>(null);

    // pour le chrono temps réel
    const [nowTs, setNowTs] = useState<number>(() => Date.now());

    // Sauvegarde globale
    useEffect(() => {
        const stateToStore: StoredState = {
            races,
            participants,
            currentRaceId,
        };
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToStore));
        } catch (e) {
            console.error("Erreur d'écriture localStorage", e);
        }
    }, [races, participants, currentRaceId]);

    const currentRace = races.find((r) => r.id === currentRaceId) || null;

    // Mise à jour du chrono temps réel pour la course sélectionnée
    useEffect(() => {
        if (!currentRace || !currentRace.startedAt || currentRace.finished) {
            return;
        }
        const intervalId = window.setInterval(() => {
            setNowTs(Date.now());
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [currentRace?.id, currentRace?.startedAt, currentRace?.finished]);

    // --- Import des participants ---

    async function handleParticipantsFileChange(
        e: React.ChangeEvent<HTMLInputElement>
    ) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const parsed = await parseParticipantsCsv(file);
            if (parsed.length === 0) {
                setImportMessage("Aucun participant valide trouvé dans le fichier.");
                return;
            }

            const raceNames = Array.from(new Set(parsed.map((p) => p.raceName)));

            const newRaces: Race[] = raceNames.map((name) => {
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
                `Participants importés : ${parsed.length}. Courses détectées : ${raceNames.length}.`
            );
            setBibInput("");
            setDownloadMessage(null);
        } catch (err: any) {
            console.error(err);
            setImportMessage(err?.message || "Erreur lors de l'import du CSV.");
        } finally {
            e.target.value = "";
        }
    }

    // --- Gestion des courses ---

    function handleStartRace(raceId: string) {
        const nowIso = new Date().toISOString();
        setRaces((prev) =>
            prev.map((r) =>
                r.id === raceId
                    ? {
                        ...r,
                        startedAt: nowIso,
                        finished: false,
                        results: [],
                    }
                    : r
            )
        );
        setDownloadMessage(null);
        setBibInput("");
        setNowTs(Date.now());
    }

    function handleStopRace(raceId: string) {
        setRaces((prev) =>
            prev.map((r) =>
                r.id === raceId
                    ? {
                        ...r,
                        finished: true,
                    }
                    : r
            )
        );
    }

    function handleResetAll() {
        if (!window.confirm("Réinitialiser toutes les courses, participants et résultats ?"))
            return;
        setRaces([]);
        setParticipants([]);
        setCurrentRaceId(null);
        setBibInput("");
        setDownloadMessage(null);
        setImportMessage(null);
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.error("Erreur suppression localStorage", e);
        }
    }

    // --- Arrivées : uniquement dossard ---

    function handleAddBib() {
        const trimmed = bibInput.trim();
        if (!trimmed) return;

        const participant = participants.find((p) => p.bibNumber === trimmed);
        if (!participant) {
            alert(`Dossard ${trimmed} inconnu (non présent dans les participants importés).`);
            return;
        }

        const race = races.find((r) => r.name === participant.raceName);
        if (!race) {
            alert(`Course "${participant.raceName}" introuvable pour ce participant.`);
            return;
        }

        if (!race.startedAt) {
            alert(`La course "${race.name}" n'a pas encore commencé.`);
            return;
        }
        if (race.finished) {
            alert(`La course "${race.name}" est terminée, plus d'arrivées possibles.`);
            return;
        }

        // ❗ Nouveau : ne pas accepter deux arrivées pour le même bib dans la même course
        const alreadyArrived = race.results.some((res) => res.bibNumber === trimmed);
        if (alreadyArrived) {
            alert(
                `L'arrivée du dossard ${trimmed} a déjà été enregistrée pour la course "${race.name}".`
            );
            setBibInput("");
            return;
        }

        const now = new Date();
        const startDate = new Date(race.startedAt);
        const diffMs = now.getTime() - startDate.getTime();
        const elapsedSeconds = Math.floor(diffMs / 1000);

        const newResult: Result = {
            id: uuid(),
            bibNumber: trimmed,
            elapsedSeconds,
        };

        setRaces((prev) =>
            prev.map((r) =>
                r.id === race.id
                    ? {
                        ...r,
                        results: [...r.results, newResult],
                    }
                    : r
            )
        );

        setBibInput("");
        setDownloadMessage(null);
    }

    function handleBibKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddBib();
        }
    }

    // --- Edition / suppression d'un résultat ---

    function handleEditResult(resultId: string) {
        if (!currentRace) return;
        const race = currentRace;
        const result = race.results.find((res) => res.id === resultId);
        if (!result) return;

        const newBib = window.prompt("Nouveau bib :", result.bibNumber);
        if (newBib === null) return;

        const trimmed = newBib.trim();
        if (!trimmed) return;

        const participant = participants.find((p) => p.bibNumber === trimmed);
        if (!participant) {
            alert(`Dossard ${trimmed} inconnu dans la liste des participants.`);
            return;
        }
        if (participant.raceName !== race.name) {
            alert(
                `Ce dossard appartient à la course "${participant.raceName}", pas à "${race.name}".`
            );
            return;
        }

        // on peut autoriser le changement si ce bib n'a pas déjà une arrivée différente
        const duplicate = race.results.some(
            (res) => res.bibNumber === trimmed && res.id !== resultId
        );
        if (duplicate) {
            alert(
                `Le dossard ${trimmed} a déjà une arrivée enregistrée dans cette course.`
            );
            return;
        }

        setRaces((prev) =>
            prev.map((r) =>
                r.id === race.id
                    ? {
                        ...r,
                        results: r.results.map((res) =>
                            res.id === resultId ? { ...res, bibNumber: trimmed } : res
                        ),
                    }
                    : r
            )
        );
    }

    function handleDeleteResult(resultId: string) {
        if (!currentRace) return;
        if (!window.confirm("Supprimer ce dossard de cette course ?")) return;

        const raceId = currentRace.id;
        setRaces((prev) =>
            prev.map((r) =>
                r.id === raceId
                    ? {
                        ...r,
                        results: r.results.filter((res) => res.id !== resultId),
                    }
                    : r
            )
        );
    }

    // --- Export CSV (course sélectionnée) ---

    function generateCsvContent(race: Race) {
        const header = "bib,elapsed_time\n";
        const lines = race.results
            .slice()
            .sort((a, b) => a.elapsedSeconds - b.elapsedSeconds)
            .map((r) => `${r.bibNumber},${formatDuration(r.elapsedSeconds)}`)
            .join("\n");
        return header + lines + "\n";
    }

    function handleDownloadCsv() {
        if (!currentRace) {
            setDownloadMessage("Aucune course sélectionnée.");
            return;
        }
        if (currentRace.results.length === 0) {
            setDownloadMessage("Aucun résultat à exporter pour cette course.");
            return;
        }

        const csv = generateCsvContent(currentRace);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, "-");
        const safeName = currentRace.name.replace(/[^a-z0-9\-]+/gi, "_");

        link.href = url;
        link.download = `results-${safeName}-${timestamp}.csv`;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setDownloadMessage(`Fichier CSV pour "${currentRace.name}" téléchargé.`);
    }

    // format heure départ en 24h
    function formatStartTime(iso: string | null) {
        if (!iso) return "-";
        const d = new Date(iso);
        return d.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
    }

    // chrono temps réel pour la course courante
    function getCurrentRaceChrono(): string {
        if (!currentRace || !currentRace.startedAt) return "00:00:00";
        const start = new Date(currentRace.startedAt).getTime();
        const end = currentRace.finished ? nowTs : nowTs;
        const diffSeconds = Math.max(0, Math.floor((end - start) / 1000));
        return formatDuration(diffSeconds);
    }

    return (
        <div
            style={{
                maxWidth: 1200,
                margin: "0 auto",
                padding: 12,
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                backgroundColor: "#f5f5f7",
                color: "#222",
                minHeight: "100vh",
                boxSizing: "border-box",
            }}
        >
            <h1 style={{ fontSize: 22, margin: "4px 0 10px" }}>Chronométrage de course</h1>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "280px 1fr",
                    gap: 12,
                    alignItems: "flex-start",
                }}
            >
                {/* Colonne gauche : import + courses */}
                <aside
                    style={{
                        border: "1px solid #ddd",
                        borderRadius: 6,
                        padding: 10,
                        backgroundColor: "#ffffff",
                    }}
                >
                    <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>Participants</h2>
                    <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleParticipantsFileChange}
                        style={{ fontSize: 13 }}
                    />
                    {importMessage && (
                        <p style={{ fontSize: 11, marginTop: 4 }}>{importMessage}</p>
                    )}
                    <p style={{ fontSize: 11, marginTop: 2 }}>
                        Format : bib,name,category,gender,race (séparateur , ou ;).
                    </p>

                    <hr style={{ margin: "8px 0" }} />

                    <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>Courses</h2>
                    {races.length === 0 ? (
                        <p style={{ fontSize: 13, margin: 0 }}>
                            Aucune course (importer un CSV pour créer les courses).
                        </p>
                    ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13 }}>
                            {races.map((race) => {
                                const isActive = race.id === currentRaceId;
                                const started = !!race.startedAt;
                                const count = race.results.length;
                                return (
                                    <li
                                        key={race.id}
                                        style={{
                                            border: "1px solid #e0e0e0",
                                            borderRadius: 4,
                                            padding: 6,
                                            marginBottom: 6,
                                            backgroundColor: isActive ? "#e8f0ff" : "#fafafa",
                                            cursor: "pointer",
                                        }}
                                        onClick={() => setCurrentRaceId(race.id)}
                                    >
                                        <strong>{race.name}</strong>
                                        <div style={{ fontSize: 11, marginTop: 2 }}>
                                            Statut :{" "}
                                            {started
                                                ? race.finished
                                                    ? "terminée"
                                                    : "en cours"
                                                : "non démarrée"}
                                            <br />
                                            Arrivées : {count}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    <button
                        onClick={handleResetAll}
                        style={{
                            marginTop: 8,
                            width: "100%",
                            backgroundColor: "#444",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            padding: "5px 6px",
                            fontSize: 13,
                            cursor: "pointer",
                        }}
                    >
                        Réinitialiser tout
                    </button>
                </aside>

                {/* Colonne droite : arrivées + résultats de la course sélectionnée */}
                <main>
                    {/* Zone d'arrivée commune */}
                    <section
                        style={{
                            marginBottom: 8,
                            padding: 8,
                            border: "1px solid #ddd",
                            borderRadius: 6,
                            backgroundColor: "#ffffff",
                        }}
                    >
                        <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>
                            Arrivées (ligne commune)
                        </h2>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <input
                                type="text"
                                placeholder="bib"
                                value={bibInput}
                                onChange={(e) => setBibInput(e.target.value)}
                                onKeyDown={handleBibKeyDown}
                                style={{
                                    padding: "4px 6px",
                                    fontSize: 14,
                                    backgroundColor: "#fdfdfd",
                                    border: "1px solid #ccc",
                                    borderRadius: 4,
                                    color: "black"
                                }}
                            />
                            <button
                                onClick={handleAddBib}
                                disabled={participants.length === 0}
                                style={{
                                    padding: "4px 8px",
                                    fontSize: 13,
                                    borderRadius: 4,
                                    border: "none",
                                    backgroundColor: "#0050b3",
                                    color: "#fff",
                                    cursor: "pointer",
                                }}
                            >
                                Enregistrer l'arrivée
                            </button>
                        </div>
                        <small style={{ fontSize: 11 }}>
                            Dossard → course déterminée via le fichier des participants. Entrée pour
                            valider plus vite.
                        </small>
                    </section>

                    {currentRace ? (
                        <>
                            <section
                                style={{
                                    marginBottom: 8,
                                    padding: 8,
                                    border: "1px solid #ddd",
                                    borderRadius: 6,
                                    backgroundColor: "#ffffff",
                                }}
                            >
                                <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>
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
                                    Chrono :{" "}
                                    <span style={{ fontWeight: 600 }}>{getCurrentRaceChrono()}</span>
                                </p>

                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    <button
                                        onClick={() => handleStartRace(currentRace.id)}
                                        disabled={!!currentRace.startedAt && !currentRace.finished}
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: 13,
                                            borderRadius: 4,
                                            border: "none",
                                            backgroundColor: "#0070c9",
                                            color: "#fff",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Démarrer / Redémarrer
                                    </button>
                                    <button
                                        onClick={() => handleStopRace(currentRace.id)}
                                        disabled={!currentRace.startedAt || currentRace.finished}
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: 13,
                                            borderRadius: 4,
                                            border: "none",
                                            backgroundColor: "#d9480f",
                                            color: "#fff",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Arrêter la course
                                    </button>
                                </div>
                            </section>

                            <section
                                style={{
                                    marginBottom: 8,
                                    padding: 8,
                                    border: "1px solid #ddd",
                                    borderRadius: 6,
                                    backgroundColor: "#ffffff",
                                }}
                            >
                                <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>
                                    Résultats de la course
                                </h2>
                                {currentRace.results.length === 0 ? (
                                    <p style={{ fontSize: 13, margin: 0 }}>
                                        Aucun coureur arrivé pour cette course.
                                    </p>
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
                                                    style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}
                                                >
                                                    bib
                                                </th>
                                                <th
                                                    style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}
                                                >
                                                    Nom
                                                </th>
                                                <th
                                                    style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}
                                                >
                                                    Catégorie
                                                </th>
                                                <th
                                                    style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}
                                                >
                                                    Temps
                                                </th>
                                                <th
                                                    style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}
                                                >
                                                    Actions
                                                </th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {currentRace.results
                                                .slice()
                                                .sort((a, b) => a.elapsedSeconds - b.elapsedSeconds)
                                                .map((r) => {
                                                    const p = participants.find(
                                                        (p) => p.bibNumber === r.bibNumber
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
                                                                {p?.name ?? "-"}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    borderBottom: "1px solid #eee",
                                                                    padding: "2px 4px",
                                                                }}
                                                            >
                                                                {p?.category ?? "-"}
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
                                                                    onClick={() => handleEditResult(r.id)}
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
                                                                    onClick={() => handleDeleteResult(r.id)}
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

                                <div style={{ marginTop: 6 }}>
                                    <button
                                        onClick={handleDownloadCsv}
                                        disabled={!currentRace || currentRace.results.length === 0}
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: 13,
                                            borderRadius: 4,
                                            border: "none",
                                            backgroundColor: "#0050b3",
                                            color: "#fff",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Télécharger le CSV de cette course
                                    </button>
                                    {downloadMessage && (
                                        <p style={{ fontSize: 11, marginTop: 4 }}>{downloadMessage}</p>
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
