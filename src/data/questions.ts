export interface Source {
  doc: string;
  page: number;
}

export interface Question {
  id: string;
  question: string;
  answer: string[];
  moduleId: number | null;
  sources: Source[];
}

export const MODULES = [
  { id: 2, name: "Modul 2: Staats-, Europa- & Verwaltungsrecht" },
  { id: 3, name: "Modul 3: BGB, HGR & Beamtenrecht" },
  { id: 4, name: "Modul 4: BWL & Haushalt" },
  { id: 5, name: "Modul 5: Abgabenordnung (AO)" },
  { id: 6, name: "Modul 6: Verbrauchssteuerrecht" },
  { id: 7, name: "Modul 7: Zollrecht & Außenwirtschaft" },
  { id: 8, name: "Modul 8: Strafprozessrecht" },
];

export const RAW_QUESTIONS: Question[] = [];
