import React from "react";

type ArrivalInputProps = {
    bib: string;
    onChangeBib: (value: string) => void;
    onSubmit: () => void;
    disabled: boolean;
};

export const ArrivalInput: React.FC<ArrivalInputProps> = ({
                                                              bib,
                                                              onChangeBib,
                                                              onSubmit,
                                                              disabled,
                                                          }) => {
    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            e.preventDefault();
            if (!disabled) onSubmit();
        }
    }

    return (
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
                    value={bib}
                    onChange={(e) => onChangeBib(e.target.value)}
                    onKeyDown={handleKeyDown}
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
                    onClick={onSubmit}
                    disabled={disabled}
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
                Le temps est calculé par rapport à la vague dont la catégorie ou le
                genre correspond, sinon au départ général.
            </p>
        </section>
    );
};
