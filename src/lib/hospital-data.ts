/**
 * FICTIONAL DEMO DATA — Gura Hospital.
 * All physicians, addresses, phone numbers and credentials below are invented
 * for a design/UX demonstration. Nothing here refers to real people or places.
 */

export type Physician = {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  subSpecialty: string;
  office: string;
  phone: string;
  fax: string;
  specialtySlug: string;
};

export type SpecialtyGroup = {
  slug: string;
  title: string;
  blurb: string;
  conditions: string[];
};

export const specialtyGroups: SpecialtyGroup[] = [
  {
    slug: "cardiology-electrophysiology",
    title: "Cardiology & Electrophysiology",
    blurb:
      "Advanced heart and rhythm care, from prevention and imaging to catheter ablation and structural heart procedures.",
    conditions: [
      "Atrial fibrillation",
      "Coronary artery disease",
      "Heart failure",
      "Hypertension",
      "Valve disease",
      "Syncope and palpitations",
    ],
  },
  {
    slug: "gastroenterology",
    title: "Gastroenterology / GI",
    blurb:
      "Comprehensive digestive health, including therapeutic endoscopy, liver care and inflammatory bowel disease programs.",
    conditions: [
      "Acid reflux (GERD)",
      "Crohn's disease",
      "Ulcerative colitis",
      "Celiac disease",
      "Fatty liver disease",
      "Colon cancer screening",
    ],
  },
  {
    slug: "orthopedics",
    title: "Orthopedics & Sports Medicine",
    blurb:
      "Joint preservation, minimally invasive replacement and sports injury recovery guided by on-site rehabilitation.",
    conditions: [
      "Knee and hip arthritis",
      "Rotator cuff tears",
      "ACL injuries",
      "Spine and disc pain",
      "Fractures",
      "Carpal tunnel syndrome",
    ],
  },
  {
    slug: "neurology",
    title: "Neurology & Neurosurgery",
    blurb:
      "Brain, spine and nerve care with a dedicated stroke response team and multidisciplinary movement disorder clinic.",
    conditions: [
      "Stroke",
      "Epilepsy",
      "Migraine",
      "Parkinson's disease",
      "Multiple sclerosis",
      "Peripheral neuropathy",
    ],
  },
  {
    slug: "womens-health",
    title: "Women's Health",
    blurb:
      "Obstetrics, gynecology and midwifery services with private birthing suites and maternal-fetal medicine support.",
    conditions: [
      "Prenatal care",
      "High-risk pregnancy",
      "Endometriosis",
      "Menopause management",
      "Fibroids",
      "Pelvic floor therapy",
    ],
  },
  {
    slug: "primary-care",
    title: "Primary Care & Internal Medicine",
    blurb:
      "Your long-term medical home: annual physicals, chronic disease management and same-day telehealth visits.",
    conditions: [
      "Annual wellness visits",
      "Diabetes",
      "High cholesterol",
      "Thyroid disorders",
      "Preventive screening",
      "Immunizations",
    ],
  },
];

export const physicians: Physician[] = [
  {
    id: "amara-velloso",
    name: "Dr. Amara Velloso",
    credentials: "MD, FACC",
    specialty: "Cardiology",
    subSpecialty: "Interventional Cardiology",
    office: "1400 Harborline Ave, Suite 320, Fairmont Ridge, NY 11042",
    phone: "(555) 210-4471",
    fax: "(555) 210-4472",
    specialtySlug: "cardiology-electrophysiology",
  },
  {
    id: "nikolai-brandt",
    name: "Dr. Nikolai Brandt",
    credentials: "MD, PhD",
    specialty: "Cardiac Electrophysiology",
    subSpecialty: "Catheter Ablation & Device Therapy",
    office: "1400 Harborline Ave, Suite 340, Fairmont Ridge, NY 11042",
    phone: "(555) 210-4488",
    fax: "(555) 210-4489",
    specialtySlug: "cardiology-electrophysiology",
  },
  {
    id: "priya-santhanam",
    name: "Dr. Priya Santhanam",
    credentials: "MD, MPH",
    specialty: "Preventive Cardiology",
    subSpecialty: "Lipid & Hypertension Clinic",
    office: "88 Westmere Parkway, Level 2, Alder Bay, NY 11048",
    phone: "(555) 210-4510",
    fax: "(555) 210-4511",
    specialtySlug: "cardiology-electrophysiology",
  },
  {
    id: "desmond-okafor",
    name: "Dr. Desmond Okafor",
    credentials: "MD, FASGE",
    specialty: "Gastroenterology",
    subSpecialty: "Therapeutic Endoscopy",
    office: "2 Calder Medical Plaza, Suite 610, Fairmont Ridge, NY 11042",
    phone: "(555) 210-6620",
    fax: "(555) 210-6621",
    specialtySlug: "gastroenterology",
  },
  {
    id: "lena-marchetti",
    name: "Dr. Lena Marchetti",
    credentials: "DO",
    specialty: "Gastroenterology",
    subSpecialty: "Inflammatory Bowel Disease",
    office: "2 Calder Medical Plaza, Suite 615, Fairmont Ridge, NY 11042",
    phone: "(555) 210-6635",
    fax: "(555) 210-6636",
    specialtySlug: "gastroenterology",
  },
  {
    id: "harlan-vance",
    name: "Dr. Harlan Vance",
    credentials: "MD",
    specialty: "Hepatology",
    subSpecialty: "Liver Disease & Transplant Medicine",
    office: "2 Calder Medical Plaza, Suite 640, Fairmont Ridge, NY 11042",
    phone: "(555) 210-6650",
    fax: "(555) 210-6651",
    specialtySlug: "gastroenterology",
  },
  {
    id: "june-castellanos",
    name: "Dr. June Castellanos",
    credentials: "MD, FAAOS",
    specialty: "Orthopedic Surgery",
    subSpecialty: "Hip & Knee Reconstruction",
    office: "51 Ironwood Drive, Suite 110, Alder Bay, NY 11048",
    phone: "(555) 210-7702",
    fax: "(555) 210-7703",
    specialtySlug: "orthopedics",
  },
  {
    id: "elias-thornbury",
    name: "Dr. Elias Thornbury",
    credentials: "MD",
    specialty: "Sports Medicine",
    subSpecialty: "Shoulder & Elbow Arthroscopy",
    office: "51 Ironwood Drive, Suite 130, Alder Bay, NY 11048",
    phone: "(555) 210-7718",
    fax: "(555) 210-7719",
    specialtySlug: "orthopedics",
  },
  {
    id: "sofia-arbelaez",
    name: "Dr. Sofia Arbeláez",
    credentials: "MD, MS",
    specialty: "Spine Surgery",
    subSpecialty: "Minimally Invasive Spine",
    office: "51 Ironwood Drive, Suite 205, Alder Bay, NY 11048",
    phone: "(555) 210-7740",
    fax: "(555) 210-7741",
    specialtySlug: "orthopedics",
  },
  {
    id: "reuben-ashford",
    name: "Dr. Reuben Ashford",
    credentials: "MD, FAAN",
    specialty: "Neurology",
    subSpecialty: "Stroke & Vascular Neurology",
    office: "1400 Harborline Ave, Suite 500, Fairmont Ridge, NY 11042",
    phone: "(555) 210-8830",
    fax: "(555) 210-8831",
    specialtySlug: "neurology",
  },
  {
    id: "imani-fairweather",
    name: "Dr. Imani Fairweather",
    credentials: "MD",
    specialty: "Neurology",
    subSpecialty: "Epilepsy & Clinical Neurophysiology",
    office: "1400 Harborline Ave, Suite 510, Fairmont Ridge, NY 11042",
    phone: "(555) 210-8844",
    fax: "(555) 210-8845",
    specialtySlug: "neurology",
  },
  {
    id: "gregor-lindqvist",
    name: "Dr. Gregor Lindqvist",
    credentials: "MD, PhD",
    specialty: "Neurosurgery",
    subSpecialty: "Skull Base & Tumor Surgery",
    office: "1400 Harborline Ave, Suite 545, Fairmont Ridge, NY 11042",
    phone: "(555) 210-8860",
    fax: "(555) 210-8861",
    specialtySlug: "neurology",
  },
  {
    id: "aveline-rousseau",
    name: "Dr. Aveline Rousseau",
    credentials: "MD, FACOG",
    specialty: "Obstetrics & Gynecology",
    subSpecialty: "Maternal-Fetal Medicine",
    office: "310 Larkspur Court, Suite 240, Fairmont Ridge, NY 11042",
    phone: "(555) 210-9915",
    fax: "(555) 210-9916",
    specialtySlug: "womens-health",
  },
  {
    id: "tobias-nkemelu",
    name: "Dr. Tobias Nkemelu",
    credentials: "MD",
    specialty: "Gynecology",
    subSpecialty: "Minimally Invasive Pelvic Surgery",
    office: "310 Larkspur Court, Suite 250, Fairmont Ridge, NY 11042",
    phone: "(555) 210-9928",
    fax: "(555) 210-9929",
    specialtySlug: "womens-health",
  },
  {
    id: "marisol-delgado",
    name: "Marisol Delgado",
    credentials: "CNM, MSN",
    specialty: "Midwifery",
    subSpecialty: "Birth Center & Postpartum Care",
    office: "310 Larkspur Court, Suite 120, Fairmont Ridge, NY 11042",
    phone: "(555) 210-9940",
    fax: "(555) 210-9941",
    specialtySlug: "womens-health",
  },
  {
    id: "callum-whitfield",
    name: "Dr. Callum Whitfield",
    credentials: "MD, FACP",
    specialty: "Internal Medicine",
    subSpecialty: "Adult Primary Care",
    office: "9 Meridian Square, Suite 40, Alder Bay, NY 11048",
    phone: "(555) 210-3301",
    fax: "(555) 210-3302",
    specialtySlug: "primary-care",
  },
  {
    id: "yuki-tanabe",
    name: "Dr. Yuki Tanabe",
    credentials: "MD",
    specialty: "Family Medicine",
    subSpecialty: "Telehealth & Same-Day Care",
    office: "9 Meridian Square, Suite 55, Alder Bay, NY 11048",
    phone: "(555) 210-3318",
    fax: "(555) 210-3319",
    specialtySlug: "primary-care",
  },
  {
    id: "adaeze-morrow",
    name: "Adaeze Morrow",
    credentials: "FNP-BC",
    specialty: "Primary Care",
    subSpecialty: "Chronic Disease Management",
    office: "9 Meridian Square, Suite 60, Alder Bay, NY 11048",
    phone: "(555) 210-3325",
    fax: "(555) 210-3326",
    specialtySlug: "primary-care",
  },
];

export const conditionsIndex: string[] = Array.from(
  new Set(specialtyGroups.flatMap((g) => g.conditions)),
).sort((a, b) => a.localeCompare(b));

export const hospitalInfo = {
  name: "Gura Hospital",
  address: "1400 Harborline Avenue, Fairmont Ridge, NY 11042",
  phone: "(555) 210-0000",
  hours: "7 Days a Week | 24 Hours a Day",
};

export const insuranceProviders = [
  "Cedarline Health",
  "Northstar Mutual",
  "Blue Harbor PPO",
  "Meridian Care Advantage",
  "Statewide Medicaid (demo)",
  "Self-pay / No insurance",
];
// TODO(prod): this is a fictional published roster for the demo site, not a live
// payer/eligibility API. Voice check_insurance matches against this list only.
