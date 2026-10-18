export const MODES=[
{key:"MAX",label:"KEY AI MAX",desc:"Analisis mendalam, coding kompleks"},
{key:"MEDIUM",label:"KEY AI MEDIUM",desc:"Seimbang untuk tugas harian"},
{key:"CEPAT",label:"KEY AI CEPAT",desc:"Respons cepat & hemat"}] as const;
export type ModeKey=typeof MODES[number]["key"];
