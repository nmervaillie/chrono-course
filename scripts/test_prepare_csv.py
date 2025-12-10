import pandas as pd
from prepare_csv import (
    build_teams_dataframe,
    birth_year_to_category,
    combine_categories,
    team_gender,
)

def test_birth_year_to_category_boundaries():
    assert birth_year_to_category(2019) == "Mini-Poussin"
    assert birth_year_to_category(2018) == "Mini-Poussin"
    assert birth_year_to_category(2017) == "Poussin"
    assert birth_year_to_category(2016) == "Poussin"
    assert birth_year_to_category(2015) == "Pupille"
    assert birth_year_to_category(2014) == "Pupille"
    assert birth_year_to_category(2013) == "Benjamin"
    assert birth_year_to_category(2012) == "Benjamin"
    assert birth_year_to_category(2011) == "Minime"
    assert birth_year_to_category(2010) == "Minime"
    assert birth_year_to_category(2009) == "Cadet"
    assert birth_year_to_category(2008) == "Cadet"
    assert birth_year_to_category(2007) == "Junior"
    assert birth_year_to_category(2006) == "Junior"
    assert birth_year_to_category(2005) == "Senior"
    assert birth_year_to_category(1986) == "Senior"
    assert birth_year_to_category(1985) == "Master"
    assert birth_year_to_category(1970) == "Master"

def test_combine_categories_from_table():
    for cat in ["Mini-Poussin", "Poussin", "Pupille", "Benjamin", "Minime", "Cadet", "Junior", "Senior"]:
        assert combine_categories("Mini-Poussin", cat) == cat
        assert combine_categories(cat, "Mini-Poussin") == cat
    assert combine_categories("Mini-Poussin", "Master") == "Senior"

    for cat in ["Poussin", "Pupille", "Benjamin", "Minime", "Cadet", "Junior", "Senior"]:
        assert combine_categories("Poussin", cat) == cat
        assert combine_categories(cat, "Poussin") == cat
    assert combine_categories("Poussin", "Master") == "Senior"

    for cat in ["Pupille", "Benjamin", "Minime", "Cadet", "Junior", "Senior"]:
        assert combine_categories("Pupille", cat) == cat
        assert combine_categories(cat, "Pupille") == cat
    assert combine_categories("Pupille", "Master") == "Senior"

    for cat in ["Benjamin", "Minime", "Cadet", "Junior", "Senior"]:
        assert combine_categories("Benjamin", cat) == cat
        assert combine_categories(cat, "Benjamin") == cat
    assert combine_categories("Benjamin", "Master") == "Senior"

    assert combine_categories("Pupille", "Poussin") == "Pupille"
    assert combine_categories("Minime", "Minime") == "Minime"
    assert combine_categories("Master", "Senior") == "Senior"
    assert combine_categories("Master", "Master") == "Master"

def test_team_gender():
    assert team_gender("M", "M") == "M"
    assert team_gender("F", "F") == "F"
    assert team_gender("M", "F") == "X"
    assert team_gender("f", "m") == "X"
    assert team_gender("", "M") == "X"

def make_sample_df():
    """Construit un petit DataFrame simulant l'Excel d'entrée."""
    data = [
        # équipe 1 : deux poussins mixte
        {
            "id": 1,
            "Competition": "6-9",
            "Equipe": "Antilopes Agiles",
            "Numéro de licence fftri long": "A001",
            "Nom": "Durand",
            "Prénom": "Alice",
            "Sexe": "F",
            "Date de naissance": "12/06/2017",  # Poussin
            "Nom du club de la licence fftri": "TriClub A",
        },
        {
            "id": 2,
            "Competition": "6-9",
            "Equipe": "Antilopes Agiles",
            "Numéro de licence fftri long": "A002",
            "Nom": "Martin",
            "Prénom": "André",
            "Sexe": "M",
            "Date de naissance": "03/03/2016",  # Poussin
            "Nom du club de la licence fftri": "TriTeam A",
        },
        # équipe 2 : Master + Senior -> catégorie Senior, club/licence vides
        {
            "id": 3,
            "Competition": "XS",
            "Equipe": "Vieux Loups",
            "Numéro de licence fftri long": "",
            "Nom": "Lenoir",
            "Prénom": "Paul",
            "Sexe": "M",
            "Date de naissance": "01/01/1970",  # Master
            "Nom du club de la licence fftri": "",
        },
        {
            "id": 4,
            "Competition": "XS",
            "Equipe": "Vieux Loups",
            "Numéro de licence fftri long": None,
            "Nom": "Blanc",
            "Prénom": "Julie",
            "Sexe": "F",
            "Date de naissance": "15/05/1990",  # Senior
            "Nom du club de la licence fftri": "TriClub B",
        },
    ]
    return pd.DataFrame(data)

def test_build_teams_dataframe_basic():
    df = make_sample_df()
    out = build_teams_dataframe(df, start_bib=10)

    # 2 équipes
    assert len(out) == 2

    # colonnes présentes
    expected_cols = [
        "bib","competition","teamName","teamGender","teamCategory",
        "nameParticipant1","genderParticipant1","birthDateParticipant1",
        "clubParticipant1","licenseParticipant1",
        "nameParticipant2","genderParticipant2","birthDateParticipant2",
        "clubParticipant2","licenseParticipant2","teamFullName",
    ]
    assert list(out.columns) == expected_cols

    # équipe 1
    row1 = out.iloc[0]
    assert row1["bib"] == 10
    assert row1["competition"] == "6-9"
    assert row1["teamName"] == "Antilopes Agiles"
    # deux poussins F + M -> catégorie Poussin, genre X
    assert row1["teamCategory"] == "Poussin"
    assert row1["teamGender"] == "X"
    assert row1["nameParticipant1"] == "Alice Durand"
    assert row1["nameParticipant2"] == "André Martin"
    assert row1["teamFullName"] == (
        "Antilopes Agiles - Alice Durand (TriClub A) - André Martin (TriTeam A)"
    )

    # équipe 2
    row2 = out.iloc[1]
    assert row2["bib"] == 11
    assert row2["competition"] == "XS"
    # Master + Senior -> Senior (table)
    assert row2["teamCategory"] == "Senior"
    # M + F -> X
    assert row2["teamGender"] == "X"
    # clubs/licences vides ne doivent pas être 'nan'
    assert row2["clubParticipant1"] == ""
    assert row2["licenseParticipant1"] == ""
    assert row2["licenseParticipant2"] == ""
    # teamFullName avec nom + prénom, et club uniquement pour ceux qui en ont un
    assert row2["teamFullName"] == (
        "Vieux Loups - Paul Lenoir - Julie Blanc (TriClub B)"
    )
