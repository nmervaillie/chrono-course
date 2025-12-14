# Chronométrage Bike & Run

Application de chronométrage d'épreuves de Bike & Run.

Ce projet permet de gérer :
- l'import de participants
- une ou plusieurs courses, avec départs par vagues
- la saisie de l'arrivée des participants
- les classements scratch, par catégorie et par genre
- le téléchargement des résultats détaillés 

Tout fonctionne localement, sans besoin de connexion hormis pour le chargement initial de l'application.

## Utilisation

L'application est dispo en ligne : https://nmervaillie.github.io/chrono-course/

Etapes d'utilisation:

1. préparer le fichier des participants
2. importer ce fichier 
3. sélectionner une course
4. démarrer la course
5. éventuellement, démarrer les vagues additionnelles
6. saisir les arrivées
7. corriger les arrivées au besoin
8. générer les classements et exporter les résultats

# Préparation du fichier des participants

Ce fichier peut contenir une ou plusieurs courses. 
Il est au format CSV et doit contenir les infos suivantes :

- bib
- competition
- teamName
- teamFullName (ce qui sera affiché dans les classements)
- teamGender
- teamCategory
- nameParticipant1
- genderParticipant1
- birthDateParticipant1
- clubParticipant1
- licenseParticipant1
- nameParticipant2
- genderParticipant2
- birthDateParticipant2
- clubParticipant2
- licenseParticipant2

La liste des participants provient généralement du site d'inscription, qui fournit un export de données "brut".

Cette liste doit être retravaillée pour :

- regrouper les binômes par leur nom d'équipe
- calculer la catégorie de chaque participant en fonction de sa date de naissance
- calculer la catégorie de l'équipe en fonction de la catégorie des participants
- calculer le genre de l'équipe (M, F, mixte) en fonction du genre des participants

Pour faire ca, on peut utiliser le script de conversion `prepare_csv.py` dans le répertoire `scripts`.

⚠️Ce script doit être adapté chaque année en fonction de l'évolution de la règlementation FFTri.

## Développement

- `npm run build` pour construire l'application 
- `npm run dev` pour lancer l'application localement en mode développement 

Pour le script de préparation des participants (sous mac)

```bash
cd scripts
python -m venv venv
./venv/bin/activate
pip install -r requirements.txt
python prepare_csv.py
```