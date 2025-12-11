// src/components/ResultsSection.tsx
import React from "react";
import type {Race, Participant, GenderCode} from "../domain/models";
import { formatDuration } from "../domain/time";
import { sortedResults } from "../domain/ranking";

const FIXED_CATEGORIES = [
    "Mini-Poussin",
    "Poussin",
    "Pupille",
    "Benjamin",
    "Minime",
    "Cadet",
    "Junior",
    "Senior",
    "Master",
];

const FIXED_GENDERS: GenderCode[] = ["F", "M", "X"];

type ResultsSectionProps = {
    race: Race;
    participants: Participant[];
    nowTs: number;
    waveCategories: string[];
    waveGenders: string[];
    onToggleWaveCategory: (cat: string) => void;
    onToggleWaveGender: (g: GenderCode) => void;
    onCreateWave: () => void;
    onStartRace: () => void;
    onStopRace: () => void;
    onEditResult: (id: string) => void;
    onDeleteResult: (id: string) => void;
    onDownloadCsv: () => void;
    onOpenRanking: () => void;
    downloadMessage: string | null;
};

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

function raceChrono(race: Race, nowTs: number) {
    if (!race.startedAt) return "00:00:00";
    const diff = Math.floor(
        (nowTs - new Date(race.startedAt).getTime()) / 1000
    );
    return formatDuration(Math.max(0, diff));
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
                                                                  race,
                                                                  participants,
                                                                  nowTs,
                                                                  waveCategories,
                                                                  waveGenders,
                                                                  onToggleWaveCategory,
                                                                  onToggleWaveGender,
                                                                  onCreateWave,
                                                                  onStartRace,
                                                                  onStopRace,
                                                                  onEditResult,
                                                                  onDeleteResult,
                                                                  onDownloadCsv,
                                                                  onOpenRanking,
                                                                  downloadMessage,
                                                              }) => {
    const categoriesForRace = Array.from(
        new Set(
            participants
                .filter((p) => p.competition === race.name)
                .map((p) => p.teamCategory)
                .filter(Boolean)
        )
    ).sort();

    const results = sortedResults(race);

    return (
        <>
            {/* Bloc course + vagues */}
            <section
                style={{
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    padding: 10,
                    backgroundColor: "#fff",
                    marginBottom: 10,
                }}
            >
                <h2 style={{ fontSize: 16, marginTop: 0 }}>Course : {race.name}</h2>
                <p style={{ fontSize: 13, margin: "2px 0" }}>
                    Statut :{" "}
                    {race.startedAt
                        ? race.finished
                            ? "Course terminée"
                            : "Course en cours"
                        : "Course non démarrée"}
                </p>
                <p style={{ fontSize: 13, margin: "2px 0" }}>
                    Départ général : {formatStartTime(race.startedAt)}
                </p>
                <p style={{ fontSize: 13, margin: "2px 0 6px" }}>
                    Chrono (depuis départ général) :{" "}
                    <strong>{raceChrono(race, nowTs)}</strong>
                </p>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                        onClick={onStartRace}
                        disabled={!!race.startedAt && !race.finished}
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
                        Démarrer / Redémarrer (général)
                    </button>
                    <button
                        onClick={onStopRace}
                        disabled={!race.startedAt || race.finished}
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

                {/* Vagues */}
                <div
                    style={{
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: "1px dashed #ccc",
                        fontSize: 13,
                    }}
                >
                    <strong>Vagues de départ (catégories & genres)</strong>

                    <div
                        style={{
                            marginTop: 6,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 16,
                        }}
                    >
                        {/* Catégories */}
                        <div>
                            <div style={{ fontSize: 12, marginBottom: 4 }}>Catégories :</div>
                            {FIXED_CATEGORIES.map((cat) => (
                                <label key={cat} style={{ display: "block", fontSize: 12 }}>
                                    <input
                                        type="checkbox"
                                        checked={waveCategories.includes(cat)}
                                        onChange={() => onToggleWaveCategory(cat)}
                                        style={{ marginRight: 4 }}
                                    />
                                    {cat}
                                </label>
                            ))}
                            {/* Indication des catégories réellement présentes */}
                            {categoriesForRace.length > 0 && (
                                <p style={{ fontSize: 11, marginTop: 4 }}>
                                    Catégories présentes dans cette course :{" "}
                                    {categoriesForRace.join(", ")}
                                </p>
                            )}
                        </div>

                        {/* Genres */}
                        <div>
                            <div style={{ fontSize: 12, marginBottom: 4 }}>Genres :</div>
                            {FIXED_GENDERS.map((g) => (
                                <label key={g} style={{ display: "block", fontSize: 12 }}>
                                    <input
                                        type="checkbox"
                                        checked={waveGenders.includes(g)}
                                        onChange={() => onToggleWaveGender(g)}
                                        style={{ marginRight: 4 }}
                                    />
                                    {g}
                                </label>
                            ))}
                        </div>

                        {/* Bouton vague */}
                        <div style={{ alignSelf: "flex-end" }}>
                            <button
                                onClick={onCreateWave}
                                style={{
                                    padding: "4px 8px",
                                    borderRadius: 4,
                                    border: "none",
                                    backgroundColor: "#444",
                                    color: "#fff",
                                    fontSize: 12,
                                    cursor: "pointer",
                                    marginTop: 8,
                                }}
                            >
                                Lancer le départ pour cette sélection
                            </button>
                        </div>
                    </div>

                    {/* Liste des vagues */}
                    {race.waves.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 12, marginBottom: 4 }}>
                                Vagues enregistrées :
                            </div>
                            <ul
                                style={{
                                    margin: 0,
                                    paddingLeft: 16,
                                    fontSize: 12,
                                    maxHeight: 120,
                                    overflowY: "auto",
                                }}
                            >
                                {race.waves
                                    .slice()
                                    .sort(
                                        (a, b) =>
                                            new Date(a.startedAt).getTime() -
                                            new Date(b.startedAt).getTime()
                                    )
                                    .map((w, idx) => (
                                        <li key={w.id}>
                                            Vague {idx + 1} – {formatStartTime(w.startedAt)} –{" "}
                                            {w.categories.length > 0 && (
                                                <>Cat: {w.categories.join(", ")} </>
                                            )}
                                            {w.genders.length > 0 && (
                                                <>Genres: {w.genders.join(", ")}</>
                                            )}
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    )}
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
                <h2 style={{ fontSize: 16, marginTop: 0 }}>Résultats de la course</h2>
                {results.length === 0 ? (
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
                            {results.map((r) => {
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
                                            {p?.teamCategory ?? "-"} {p?.teamGender}
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
                                                onClick={() => onEditResult(r.id)}
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
                                                onClick={() => onDeleteResult(r.id)}
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
                        onClick={onDownloadCsv}
                        disabled={results.length === 0}
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
                        onClick={onOpenRanking}
                        disabled={results.length === 0}
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
                        <p style={{ fontSize: 11, margin: "4px 0 0" }}>{downloadMessage}</p>
                    )}
                </div>
            </section>
        </>
    );
};
