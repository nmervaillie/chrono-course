import pandas as pd
from pathlib import Path

INPUT_XLSX = "dist/xs.xlsx"
OUTPUT_CSV = "dist/teams.csv"

# premier numéro de dossard attribué au premier binôme
START_BIB = 1

# noms de colonnes dans ton fichier Excel
COL_ID = "id"
COL_COMPETITION = "Competition"
COL_EQUIPE = "Equipe"
COL_LICENCE = "Numéro de licence fftri long"
COL_NOM = "Nom"
COL_PRENOM = "Prénom"
COL_SEXE = "Sexe"
COL_DATE_NAISS = "Date de naissance"
COL_CLUB = "Nom du club de la licence fftri"
# COL_DOSSARD = "Dossard"  # ignoré

# ---------------------------------------------------------
# 2. Catégorie individuelle en fonction de l'année de naissance
# ---------------------------------------------------------

def birth_year_to_category(year: int) -> str:
    if 2018 <= year <= 2019:
        return "Mini-Poussin"
    if 2016 <= year <= 2017:
        return "Poussin"
    if 2014 <= year <= 2015:
        return "Pupille"
    if 2012 <= year <= 2013:
        return "Benjamin"
    if 2010 <= year <= 2011:
        return "Minime"
    if 2008 <= year <= 2009:
        return "Cadet"
    if 2006 <= year <= 2007:
        return "Junior"
    if 1986 <= year <= 2005:
        return "Senior"
    if year <= 1985:
        return "Master"
    raise ValueError(f"Année de naissance inattendue: {year}")

# ---------------------------------------------------------
# 3. Table de combinaison des catégories (image)
# ---------------------------------------------------------

CATS = [
    "Mini-Poussin",
    "Poussin",
    "Pupille",
    "Benjamin",
    "Minime",
    "Cadet",
    "Junior",
    "Senior",
    "Master",
]

combination_matrix = [
    ["Mini-Poussin", "Poussin",  "Pupille",  "Benjamin", "Minime", "Cadet", "Junior", "Senior", "Senior"],
    ["Poussin",      "Poussin",  "Pupille",  "Benjamin", "Minime", "Cadet", "Junior", "Senior", "Senior"],
    ["Pupille",      "Pupille",  "Pupille",  "Benjamin", "Minime", "Cadet", "Junior", "Senior", "Senior"],
    ["Benjamin",     "Benjamin", "Benjamin", "Benjamin", "Minime", "Cadet", "Junior", "Senior", "Senior"],
    ["Minime",       "Minime",   "Minime",   "Minime",   "Minime", "Cadet", "Junior", "Senior", "Senior"],
    ["Cadet",        "Cadet",    "Cadet",    "Cadet",    "Cadet",  "Cadet", "Junior", "Senior", "Senior"],
    ["Junior",       "Junior",   "Junior",   "Junior",   "Junior", "Junior","Junior", "Senior", "Senior"],
    ["Senior",       "Senior",   "Senior",   "Senior",   "Senior", "Senior","Senior", "Senior", "Senior"],
    ["Senior",       "Senior",   "Senior",   "Senior",   "Senior", "Senior","Senior", "Senior", "Master"],
]

CATEGORY_COMBINATION = {}
for i_row, cat2 in enumerate(CATS):
    for i_col, cat1 in enumerate(CATS):
        team_cat = combination_matrix[i_row][i_col]
        CATEGORY_COMBINATION[(cat1, cat2)] = team_cat
        CATEGORY_COMBINATION[(cat2, cat1)] = team_cat  # symétrique

def combine_categories(cat1: str, cat2: str) -> str:
    try:
        return CATEGORY_COMBINATION[(cat1, cat2)]
    except KeyError:
        raise ValueError(f"Combinaison de catégories inconnue: {cat1} / {cat2}")

# ---------------------------------------------------------
# 4. Genre de l'équipe
# ---------------------------------------------------------

def team_gender(sex1: str, sex2: str) -> str:
    sex1 = (sex1 or "").upper()
    sex2 = (sex2 or "").upper()
    if sex1 == "M" and sex2 == "M":
        return "M"
    if sex1 == "F" and sex2 == "F":
        return "F"
    return "X"

# ---------------------------------------------------------
# 5. Utilitaires
# ---------------------------------------------------------

def safe_str(value) -> str:
    """Retourne une chaîne sans 'nan' (None -> '')."""
    if value is None:
        return ""
    s = str(value)
    return "" if s.lower() == "nan" else s

def format_fullname_with_club(firstname: str, lastname: str, club: str) -> str:
    firstname = safe_str(firstname)
    lastname = safe_str(lastname)
    club = safe_str(club)

    fullname = (firstname + " " + lastname).strip()
    if club:
        return f"{fullname} ({club})"
    return fullname

# ---------------------------------------------------------
# 6. Transformation principale (séparée pour les tests)
# ---------------------------------------------------------

def build_teams_dataframe(df: pd.DataFrame, start_bib: int = 1) -> pd.DataFrame:
    """Prend le DataFrame brut (participants) et renvoie le DF format chrono."""
    # dates
    df = df.copy()
    df[COL_DATE_NAISS] = pd.to_datetime(df[COL_DATE_NAISS], dayfirst=True, errors="coerce")
    df["birth_year"] = df[COL_DATE_NAISS].dt.year
    df["indiv_category"] = df["birth_year"].apply(birth_year_to_category)

    # tri interne dans chaque équipe pour ordre stable
    df = df.sort_values(by=[COL_EQUIPE, COL_ID])

    teams_rows = []
    current_bib = start_bib

    for team_name, g in df.groupby(COL_EQUIPE):
        if len(g) != 2:
            raise ValueError(f"⚠️  L'équipe '{team_name}' n'a pas exactement 2 lignes ({len(g)}). Ignorée.")

        p1, p2 = g.iloc[0], g.iloc[1]

        # dossard généré
        bib = current_bib
        current_bib += 1

        competition = safe_str(p1[COL_COMPETITION])

        # catégories individuelles + équipe
        cat1 = p1["indiv_category"]
        cat2 = p2["indiv_category"]
        team_cat = combine_categories(cat1, cat2)

        # genre équipe
        tg = team_gender(p1[COL_SEXE], p2[COL_SEXE])

        # infos participants (safe_str pour éviter 'nan')
        first1 = safe_str(p1[COL_PRENOM])
        last1 = safe_str(p1[COL_NOM])
        first2 = safe_str(p2[COL_PRENOM])
        last2 = safe_str(p2[COL_NOM])

        gender1 = safe_str(p1[COL_SEXE]).upper()
        gender2 = safe_str(p2[COL_SEXE]).upper()

        bdate1 = p1[COL_DATE_NAISS].strftime("%d/%m/%Y") if pd.notna(p1[COL_DATE_NAISS]) else ""
        bdate2 = p2[COL_DATE_NAISS].strftime("%d/%m/%Y") if pd.notna(p2[COL_DATE_NAISS]) else ""

        club1 = safe_str(p1[COL_CLUB])
        club2 = safe_str(p2[COL_CLUB])

        lic1 = safe_str(p1[COL_LICENCE])
        lic2 = safe_str(p2[COL_LICENCE])

        # teamFullName : "Equipe - Prénom Nom (Club1) - Prénom Nom (Club2)"
        part1_display = format_fullname_with_club(first1, last1, club1)
        part2_display = format_fullname_with_club(first2, last2, club2)
        team_full_name = f"{team_name} - {part1_display} - {part2_display}"

        teams_rows.append(
            {
                "bib": bib,
                "competition": competition,
                "teamName": team_name,
                "teamGender": tg,
                "teamCategory": team_cat,
                "nameParticipant1": f"{first1} {last1}".strip(),
                "genderParticipant1": gender1,
                "birthDateParticipant1": bdate1,
                "clubParticipant1": club1,
                "licenseParticipant1": lic1,
                "nameParticipant2": f"{first2} {last2}".strip(),
                "genderParticipant2": gender2,
                "birthDateParticipant2": bdate2,
                "clubParticipant2": club2,
                "licenseParticipant2": lic2,
                "teamFullName": team_full_name,
            }
        )

    out_df = pd.DataFrame(teams_rows)

    out_df = out_df[
        [
            "bib",
            "competition",
            "teamName",
            "teamGender",
            "teamCategory",
            "nameParticipant1",
            "genderParticipant1",
            "birthDateParticipant1",
            "clubParticipant1",
            "licenseParticipant1",
            "nameParticipant2",
            "genderParticipant2",
            "birthDateParticipant2",
            "clubParticipant2",
            "licenseParticipant2",
            "teamFullName",
        ]
    ]

    return out_df

# ---------------------------------------------------------
# 7. Entrée / sortie fichiers
# ---------------------------------------------------------

def main():
    df = pd.read_excel(INPUT_XLSX, engine="openpyxl")
    out_df = build_teams_dataframe(df, start_bib=START_BIB)
    out_df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8")
    print(f"✅ Fichier généré : {Path(OUTPUT_CSV).resolve()}")

if __name__ == "__main__":
    main()
