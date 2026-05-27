/**
 * Condensed Manchester Triage System chart set for this demo build.
 * Production deployment would use the full 52-chart set licensed from
 * the Manchester Triage Group. Discriminators here are paraphrased
 * plain-language clinical concepts written for this codebase — not
 * verbatim text from any MTS publication.
 */

export const TRIAGE_LEVELS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
] as const;

export type TriageLevel = (typeof TRIAGE_LEVELS)[number];

export const MTS_CHART_NAMES = [
  "Chest Pain",
  "Abdominal Pain",
  "Headache",
  "Fever in Adults",
  "Shortness of Breath",
  "Limb Injury",
  "Dizziness or Syncope",
  "Cough",
  "Back Pain",
  "Rash",
  "Unwell Adult",
] as const;

export type MtsChartName = (typeof MTS_CHART_NAMES)[number];

export type Discriminator = {
  level: TriageLevel;
  description: string;
};

export type MtsChart = {
  name: MtsChartName;
  presents_as: string;
  discriminators: Discriminator[];
};

export const MTS_CHARTS: MtsChart[] = [
  {
    name: "Chest Pain",
    presents_as:
      "Any pain, pressure, tightness, burning, or heaviness in the chest, with or without radiation.",
    discriminators: [
      { level: "red", description: "Unresponsive, not breathing normally, or no detectable pulse." },
      { level: "red", description: "Severe respiratory distress — unable to complete sentences." },
      { level: "orange", description: "Crushing or pressure-like chest pain with sweating, nausea, pallor, or radiation to the arm, jaw, neck, or back." },
      { level: "orange", description: "Sudden tearing or ripping pain in the chest or between the shoulder blades." },
      { level: "orange", description: "Chest pain with shortness of breath, fainting, or a recent collapse." },
      { level: "orange", description: "Chest pain in a known cardiac patient that is new, worse, or at rest." },
      { level: "yellow", description: "Moderate chest pain that has been steady or coming and going for hours." },
      { level: "yellow", description: "Pleuritic chest pain (worse with breathing or coughing) without respiratory distress." },
      { level: "green", description: "Mild chest discomfort that improves with rest, no associated symptoms." },
      { level: "blue", description: "Long-standing mild chest wall discomfort with no new features." },
    ],
  },
  {
    name: "Abdominal Pain",
    presents_as:
      "Pain anywhere in the abdomen, including cramping, sharp, burning, or colicky sensations.",
    discriminators: [
      { level: "red", description: "Signs of shock: cold clammy skin, very fast heart rate, faintness or confusion with severe abdominal pain." },
      { level: "orange", description: "Severe pain unrelieved by position or rest." },
      { level: "orange", description: "Abdominal pain with vomiting blood or passing black tarry stools." },
      { level: "orange", description: "Rigid, board-like abdomen or pain that worsens dramatically on movement." },
      { level: "orange", description: "Sudden severe pain in a woman of reproductive age, with or without vaginal bleeding." },
      { level: "yellow", description: "Moderate persistent pain with vomiting, fever, or inability to keep fluids down." },
      { level: "yellow", description: "Localized pain over hours, especially in the right lower abdomen, with tenderness." },
      { level: "green", description: "Mild to moderate cramping that comes and goes, no red flags." },
      { level: "blue", description: "Long-standing mild discomfort with no change in pattern." },
    ],
  },
  {
    name: "Headache",
    presents_as:
      "Pain in the head, including pressure, throbbing, or band-like sensations, with or without other symptoms.",
    discriminators: [
      { level: "red", description: "Decreased level of consciousness or unresponsive." },
      { level: "orange", description: "Sudden severe headache reaching maximum intensity within minutes (often described as the worst headache of life)." },
      { level: "orange", description: "Headache with new weakness, numbness, confusion, slurred speech, or visual loss." },
      { level: "orange", description: "Headache with neck stiffness, fever, or a non-blanching rash." },
      { level: "orange", description: "Headache after a recent head injury, with vomiting or worsening drowsiness." },
      { level: "yellow", description: "Severe headache that is unusual for the patient but without neurological symptoms." },
      { level: "yellow", description: "Headache with persistent vomiting or visual disturbance." },
      { level: "green", description: "Recurrent moderate headache typical for the patient (e.g. their usual migraine)." },
      { level: "blue", description: "Mild long-standing tension-type headache." },
    ],
  },
  {
    name: "Fever in Adults",
    presents_as:
      "Self-reported or measured raised temperature, with or without other systemic symptoms.",
    discriminators: [
      { level: "red", description: "Confusion, severe drowsiness, or unresponsive with fever." },
      { level: "orange", description: "Fever with a non-blanching rash, neck stiffness, or photophobia." },
      { level: "orange", description: "Fever with very fast breathing, very fast heart rate, or low blood pressure." },
      { level: "orange", description: "Fever in a patient on chemotherapy or known immunosuppression." },
      { level: "orange", description: "Fever with recent travel to a malaria-endemic area and severe symptoms." },
      { level: "yellow", description: "High fever over 39°C with vomiting or inability to keep fluids down." },
      { level: "yellow", description: "Fever for more than 5 days with no clear source." },
      { level: "green", description: "Mild to moderate fever with localized symptoms (sore throat, mild cough) and no systemic warning signs." },
      { level: "blue", description: "Resolving low-grade fever in an otherwise well adult." },
    ],
  },
  {
    name: "Shortness of Breath",
    presents_as:
      "Difficulty breathing, breathlessness, wheezing, or feeling unable to get enough air.",
    discriminators: [
      { level: "red", description: "Cannot speak, gasping, or showing severe respiratory distress." },
      { level: "red", description: "Cyanosis (blue lips or fingertips) or oxygen saturation below 90% if measured." },
      { level: "orange", description: "Speaking only in short phrases, using accessory muscles, or audible wheeze at rest." },
      { level: "orange", description: "Sudden onset breathlessness with chest pain." },
      { level: "orange", description: "Acute breathlessness with leg swelling or recent immobility." },
      { level: "yellow", description: "Moderate breathlessness on exertion that is new or worsening over days." },
      { level: "yellow", description: "Known asthma or COPD with mild-to-moderate worsening." },
      { level: "green", description: "Mild breathlessness with cough or chest cold, otherwise well." },
      { level: "blue", description: "Chronic stable breathlessness with no recent change." },
    ],
  },
  {
    name: "Limb Injury",
    presents_as:
      "Injury or pain in an arm, leg, hand, or foot following a fall, blow, twist, or unknown mechanism.",
    discriminators: [
      { level: "red", description: "Heavy uncontrolled bleeding from the limb." },
      { level: "orange", description: "Obvious deformity, open fracture, or limb that is cold, pale, or pulseless." },
      { level: "orange", description: "Severe pain not relieved by rest or simple painkillers." },
      { level: "orange", description: "Loss of sensation or movement in the limb after injury." },
      { level: "yellow", description: "Moderate pain with swelling and inability to bear weight or use the limb." },
      { level: "yellow", description: "Wound needing closure but not actively bleeding heavily." },
      { level: "green", description: "Mild sprain or bruise, able to use the limb with discomfort." },
      { level: "blue", description: "Minor old injury or long-standing limb pain with no new event." },
    ],
  },
  {
    name: "Dizziness or Syncope",
    presents_as:
      "Light-headedness, vertigo (spinning), near-fainting, or actual loss of consciousness with recovery.",
    discriminators: [
      { level: "red", description: "Currently unresponsive or unable to maintain own airway." },
      { level: "orange", description: "Syncope during exertion or while lying flat." },
      { level: "orange", description: "Syncope with chest pain, palpitations, or breathlessness." },
      { level: "orange", description: "New focal weakness, numbness, or speech difficulty alongside dizziness." },
      { level: "orange", description: "Syncope with significant head injury sustained from the fall." },
      { level: "yellow", description: "Recurrent dizziness or fainting episodes without red flags." },
      { level: "yellow", description: "Severe vertigo with persistent vomiting." },
      { level: "green", description: "Mild light-headedness on standing that resolves quickly." },
      { level: "blue", description: "Long-standing positional dizziness with no change." },
    ],
  },
  {
    name: "Cough",
    presents_as:
      "Cough of any duration, with or without sputum, blood, or associated chest symptoms.",
    discriminators: [
      { level: "red", description: "Severe respiratory distress accompanying the cough — unable to speak or cyanosed." },
      { level: "orange", description: "Coughing up significant amounts of fresh blood." },
      { level: "orange", description: "Cough with high fever, fast breathing, and chest pain suggestive of severe chest infection." },
      { level: "yellow", description: "Persistent cough for more than 3 weeks, with weight loss, night sweats, or blood-streaked sputum." },
      { level: "yellow", description: "Cough with moderate breathlessness or significant chest pain on coughing." },
      { level: "green", description: "Productive or dry cough with mild systemic symptoms and no breathlessness." },
      { level: "blue", description: "Mild residual cough after a recent cold." },
    ],
  },
  {
    name: "Back Pain",
    presents_as:
      "Pain anywhere along the back, including upper, mid, or lower back, with or without leg symptoms.",
    discriminators: [
      { level: "orange", description: "New weakness in the legs, numbness in the groin or inner thighs, or loss of bowel or bladder control." },
      { level: "orange", description: "Back pain after major trauma (fall from height, road traffic injury)." },
      { level: "orange", description: "Severe pain with fever, IV drug use history, or known cancer." },
      { level: "yellow", description: "Severe pain that does not improve with rest or simple painkillers." },
      { level: "yellow", description: "Pain radiating down one leg below the knee, with or without tingling." },
      { level: "green", description: "Mild to moderate localized back pain after lifting or unusual activity, full neurological function." },
      { level: "blue", description: "Long-standing chronic back pain with no change." },
    ],
  },
  {
    name: "Rash",
    presents_as:
      "Any new or worsening skin change — spots, blisters, redness, swelling, or peeling.",
    discriminators: [
      { level: "red", description: "Rapidly spreading rash with breathing difficulty, facial swelling, or collapse." },
      { level: "orange", description: "Non-blanching rash with fever, headache, or neck stiffness." },
      { level: "orange", description: "Widespread blistering or peeling skin, especially around the mouth or eyes." },
      { level: "orange", description: "Rash with swelling of lips, tongue, or throat." },
      { level: "yellow", description: "Painful spreading red area with fever (suggestive of skin infection)." },
      { level: "yellow", description: "Widespread itchy rash with no airway involvement." },
      { level: "green", description: "Localized rash with mild itch or discomfort, no systemic symptoms." },
      { level: "blue", description: "Mild long-standing skin complaint with no change." },
    ],
  },
  {
    name: "Unwell Adult",
    presents_as:
      "General feeling of being unwell without a clear single complaint — fatigue, weakness, malaise, or just 'not right'.",
    discriminators: [
      { level: "red", description: "Confused, severely drowsy, or unresponsive." },
      { level: "orange", description: "Very fast or very slow pulse, low blood pressure, or signs of poor circulation." },
      { level: "orange", description: "New severe pain anywhere with the general unwell feeling." },
      { level: "orange", description: "Recent collapse, repeated vomiting, or inability to keep fluids down." },
      { level: "yellow", description: "Persistent feeling of being unwell over several days with weight loss or fatigue." },
      { level: "yellow", description: "Feeling unwell in a patient with known chronic illness (diabetes, kidney, heart, sickle cell) that is unusual for them." },
      { level: "green", description: "Mild tiredness or malaise with no concerning features." },
      { level: "blue", description: "Long-standing low energy with no change." },
    ],
  },
];

export function getMtsChart(name: string): MtsChart | undefined {
  return MTS_CHARTS.find((chart) => chart.name === name);
}
