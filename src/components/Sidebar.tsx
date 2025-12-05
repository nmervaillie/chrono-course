import React from "react";
import type {Race} from "../domain/models";

type SidebarProps = {
    races: Race[];
    currentRaceId: string | null;
    onSelectRace: (id: string) => void;
    onResetAll: () => void;
    importMessage: string | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

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

export const Sidebar: React.FC<SidebarProps> = ({
                                                    races,
                                                    currentRaceId,
                                                    onSelectRace,
                                                    onResetAll,
                                                    importMessage,
                                                    onFileChange,
                                                }) => {
    return (
        <aside
            style={{
                border: "1px solid #ccc",
                borderRadius: 6,
                padding: 10,
                backgroundColor: "#fff",
            }}
        >
            <h2 style={{ fontSize: 16, marginTop: 0 }}>Participants</h2>
            <input type="file" accept=".csv" onChange={onFileChange} />
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
                                onClick={() => onSelectRace(race.id)}
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
                onClick={onResetAll}
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
    );
};
