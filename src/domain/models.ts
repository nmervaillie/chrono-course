
export type Result = {
  id: string;
  bibNumber: string;
  elapsedSeconds: number;
  arrivalAt: string; // ISO datetime de l'arrivée
};

export type StartWave = {
  id: string;
  startedAt: string; // ISO
  categories: string[];
  genders: string[]; // codes en majuscule: H/F/X
};

export type Race = {
  id: string;
  name: string;        // = competition
  startedAt: string | null; // départ général (optionnel)
  finished: boolean;
  results: Result[];
  waves: StartWave[];
};

export type Participant = {
  bibNumber: string;
  competition: string;
  teamName: string;
  teamFullName: string;
  teamGender: string;   // H / F / X (ou autre)
  teamCategory: string; // Mini-Poussin, Poussin, ...

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
