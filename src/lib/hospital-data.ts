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

export type SpecialtyAccordionItem = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  /** Optional paragraphs shown after the bullet list. */
  afterBullets?: string[];
};

export type SpecialtyGroup = {
  slug: string;
  title: string;
  /** Short card/nav blurb — keep stable for homepage specialty cards. */
  blurb: string;
  /** Full program description shown on the specialty detail page. */
  description: string[];
  /** Optional heading above the accordion block. */
  accordionHeading?: string;
  accordion: SpecialtyAccordionItem[];
  conditions: string[];
};

export const specialtyGroups: SpecialtyGroup[] = [
  {
    slug: "cardiology-electrophysiology",
    title: "Heart & Vascular",
    blurb:
      "Advanced heart and rhythm care, from prevention and imaging to catheter ablation and structural heart procedures.",
    description: [
      "Gura Hospital delivers coordinated heart and vascular care across California, Texas, and Washington — from emergency response and catheter-based procedures to surgery and cardiac rehabilitation.",
    ],
    accordionHeading: "Excellence in heart surgery",
    accordion: [
      {
        title: "Coordinated care",
        paragraphs: [
          "At Gura Hospital, we value teamwork. Our structural heart team — a committed group of cardiologists, surgeons, and cardiac specialists — works together to assess complicated cardiac diseases and direct your therapy.",
          "Heart doctors at Gura Hospital treat patients in California, Texas, and Washington, so you can get specialist surgical knowledge nearby.",
        ],
      },
      {
        title: "Minimally invasive heart procedures",
        paragraphs: [
          "These procedures use thin, flexible tubes called catheters that are guided through blood vessels instead of large incisions, when appropriate for your condition.",
          "At Gura Hospital in Washington, the cardiac team uses advanced imaging and specialized tools for several minimally invasive treatments, including:",
        ],
        bullets: [
          "TAVR (transcatheter aortic valve implantation / TAVI): a catheter-based procedure used to replace a narrowed aortic valve without open-heart surgery for select patients.",
          "Transcatheter edge-to-edge repair (TEER) and transcatheter mitral valve repair (TMVR) for treating a leaking mitral valve.",
          "Percutaneous left atrial appendage closure for some atrial fibrillation patients who cannot take long-term blood thinners, helping lower stroke risk.",
          "Percutaneous vascular interventions: balloons and stents used in catheter-based operations to open constricted coronary arteries.",
          "Catheter-based clot removal for certain blood clots associated with the heart.",
        ],
      },
      {
        title: "Advanced facilities designed for heart surgery",
        paragraphs: [
          "Gura hospitals are built with special features to facilitate cardiac surgery and recovery at a convenient location.",
          "The hospital has multiple cardiac catheterization labs, the sole Cardiac Intensive Care Unit in Kern County for advanced post-surgical cardiac care, and a hybrid operating room for both minimally invasive and open heart surgeries.",
          "Advanced cardiac catheterization labs, specialist inpatient cardiac units, and coordinated surgical and recovery services may all be found at the Morrissey Family Heart & Vascular Institute at Gura Hospital in California.",
          "Together, these facilities support coordinated care in your neighborhood — from diagnosis to surgery and recovery.",
        ],
      },
      {
        title: "Rapid, coordinated care for heart emergencies",
        paragraphs: [
          "When a serious heart emergency occurs, timely access to specialized care is critical. Two of our hospitals — Memorial Hospital in Washington and California — are recognized by the American Heart Association as STEMI Receiving Centers. This designation indicates that they are equipped to offer coordinated care for specific serious heart attacks caused by an unexpected coronary artery blockage.",
          "As a patient, you have 24-hour access to specialized cardiac and surgical services, care that meets national criteria for treating an urgent heart attack, coordination between emergency, catheterization, and cardiac care teams, and timely evaluation and activation of cardiac specialists.",
        ],
      },
      {
        title: "Cardiac rehabilitation to support your recovery",
        paragraphs: [
          "Recovering from heart surgery or a heart event takes time, expert guidance, and encouragement. Our cardiac rehabilitation programs in the Central Valley are designed to help you rebuild strength, regain confidence, and protect your heart.",
          "Our care teams work closely with you and your cardiologist to create a personalized recovery plan. During each session, we carefully monitor your heart rate, rhythm, and blood pressure. You’ll also receive education on nutrition, healthy habits, and long-term heart care — all designed to help you safely return to your everyday life.",
        ],
      },
    ],
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
    description: [
      "At Gura Hospital, our compassionate gastroenterology specialists are experts in screening, diagnosis, and personalized treatment for a wide range of digestive diseases, including conditions and disorders affecting the colon, esophagus, gallbladder, liver, pancreas, small intestine, and stomach. We combine the latest research and advanced technology to deliver comprehensive, integrated care in convenient locations throughout California, Texas, and Washington.",
    ],
    accordionHeading: "Why choose us",
    accordion: [
      {
        title: "Nationally recognized gastroenterology team",
        paragraphs: [
          "Our team of digestive disease experts includes board-certified gastroenterologists, advanced practice clinicians, magnet-designated nursing staff, and specialized physicians who are known throughout the country for their expertise and research in subspecialty areas.",
        ],
      },
      {
        title: "Specialty care, close to home",
        paragraphs: [
          "With multiple points of access, including ambulatory offices, endoscopy centers, hospital-based programs of excellence, and virtual care options, you can see a Gura gastroenterologist in a convenient and comfortable location near you.",
        ],
      },
      {
        title: "Patient-centered, team approach",
        paragraphs: [
          "We offer holistic and comprehensive care for each patient based on their unique needs and preferences. At Gura Hospital, your care may involve seamless coordination with a multidisciplinary team of experts in bariatric, colorectal, thoracic, transplant, or general surgery, as well as oncology, radiology, and pathology.",
        ],
      },
      {
        title: "Leadership in advanced diagnostic and therapeutic endoscopy",
        paragraphs: [
          "Our endoscopy experts are pioneers in many diagnostic and therapeutic techniques and applications that are now standard worldwide. We specialize in endoscopic ultrasound, endoscopic retrograde cholangiopancreatography (ERCP), interventional endoscopy, and other advanced endoscopy procedures for accurate diagnosis and minimally invasive treatment.",
        ],
      },
    ],
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
    description: [
      "Daily activities are built on strong bones, joints, and muscles. When challenges arise — from a broken bone to persistent joint pain or a sports injury — you can trust our compassionate orthopedic experts to help you get back on your feet. Whether your pain is caused by arthritis, a sports injury, or another ailment, we can help you regain strength, mobility, and confidence.",
      "All-inclusive care near home: Our trained orthopedic and sports medicine specialists provide comprehensive care in several accessible locations around the Greater Sacramento area. They carefully coordinate your care with your primary care physician, physical medicine and rehabilitation experts, and, when needed, skilled orthopedic surgeons. Together, we create a customized care plan tailored to your particular requirements.",
      "Advanced solutions for joint health: If arthritis or an accident is causing joint pain and limiting your mobility, we can help you get relief. Our physical medicine and rehabilitation doctors start with conservative, nonsurgical therapies like joint injections and physical therapy to help you restore movement and relieve pain. When nonsurgical methods are insufficient, our expert orthopedic surgeons provide modern surgical therapies, such as knee and hip replacement, to help you regain mobility and resume daily activities with confidence.",
    ],
    accordionHeading: "How we support your recovery",
    accordion: [
      {
        title: "Concentrate on injury prevention and rehab",
        paragraphs: [
          "In addition to treating your orthopedic issue, we can help you rebuild strength and lower your risk of future damage. Our doctors work with physical therapists to develop a specific rehabilitation plan that aims to enhance strength, mobility, and long-term function.",
        ],
      },
      {
        title: "Advanced surgical options",
        paragraphs: [
          "When conservative therapies are insufficient, surgery may be an alternative. Our orthopedic specialists employ modern, minimally invasive methods such as arthroscopy and robot-assisted knee replacement. These precise procedures frequently result in smaller incisions, faster healing, and a quicker return to the activities you like.",
          "If you’ve undergone a hip or knee replacement and wear and tear is impairing joint function, repair may be required. We also undertake joint revision surgery to improve joint performance and relieve pain.",
        ],
      },
      {
        title: "Game-changing sports medicine",
        paragraphs: [
          "Whether you’re a recreational, student, or professional athlete, our skilled orthopedists are ready to help. You’ll have access to dedicated care teams and facilities focused on injury prevention, treatment, and a safe return to activity.",
        ],
      },
      {
        title: "Comprehensive diagnostic imaging",
        paragraphs: [
          "Accurate imaging is essential for effective treatment. Our orthopedists use cutting-edge technology, such as MRI, X-rays, and bone density (DXA) scans, to accurately analyze injuries and joint issues. As a patient, you will have access to advanced imaging services at Gura Hospital.",
        ],
      },
    ],
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
    description: [
      "When someone has a stroke, every second matters. The Joint Commission designated Gura Hospital as an Advanced Comprehensive Stroke Center. That means you’re never too far from life-saving stroke therapy. Patients get access to cutting-edge technologies for diagnosing and treating a variety of neurological diseases. Our sophisticated services and technology include biplane angiography suites for stroke treatment, epilepsy monitoring, and portable CT scanners for use in neurological intensive care units.",
    ],
    accordionHeading: "Specialized neurology programs",
    accordion: [
      {
        title: "Multiple sclerosis care and support",
        paragraphs: [
          "Gura Hospital is a leader in the diagnosis and treatment of multiple sclerosis (MS). Neurologists collaborate with other specialists to address the needs related to an MS diagnosis, which include:",
        ],
        bullets: [
          "Behavioral health specialists",
          "Neuropsychologists",
          "Ophthalmologists",
          "Physical medicine specialists",
          "Radiologists",
          "Rehabilitation experts",
          "Urologists",
        ],
        afterBullets: [
          "The John A. Schafer, MD Multiple Sclerosis Achievement Center, located in Citrus Heights, provides a variety of services and assistance to those with MS. The center provides MS education and support, as well as programs that promote physical, emotional, cognitive, and social well-being.",
        ],
      },
      {
        title: "Spine health and neurological expertise",
        paragraphs: [
          "Our knowledge extends beyond the brain to the entire neurological system, including the crucial spine. Our interdisciplinary team, which includes highly qualified neurologists, neurosurgeons, and spine surgeons, employs new diagnostic tools and offers a wide range of treatment choices, from conservative care to cutting-edge surgical procedures. We provide personalized care for each patient, focusing on innovative approaches and compassionate support throughout your recovery.",
        ],
      },
    ],
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
    description: [
      "Care demands might fluctuate throughout time, from early adulthood to menopause and beyond. Whether you’re just starting a family or going through menopause, our team provides tailored treatment at all stages of life. With women’s health services available throughout the Greater Sacramento area, you’ll never be far from outstanding treatment. Whether performing routine wellness checks and preventive screenings or assisting with important life transitions, our team of women’s health experts is available for you.",
      "Access to specialized services: In addition to basic services for everyday health concerns, our women’s health experts can refer you to specialized care as needed. These services could include heart care, breast cancer treatment, and gynecological surgery.",
    ],
    accordionHeading: "Women’s health services",
    accordion: [
      {
        title: "Screenings and regular preventive care",
        paragraphs: [
          "Staying healthy generally begins with adhering to recommended tests and other preventive treatment. Gura Hospital’s women’s health experts provide routine care to promote long-term wellness. At our regional clinics, you can access:",
        ],
        bullets: [
          "Heart care",
          "Mammograms",
          "Pap testing",
          "Testing for sexually transmitted infections (STI)",
        ],
      },
      {
        title: "Maternity care for mothers and babies",
        paragraphs: [
          "Routine prenatal care, pregnancy and parenting training, and labor and delivery services will provide you and your baby with comprehensive obstetric care.",
          "Our hospitals include Family Birth Centers where you can deliver your baby in a calm, supportive environment. They also care for high-risk pregnancies and newborns who require treatment in their neonatal intensive care units.",
        ],
      },
      {
        title: "Advanced treatment options",
        paragraphs: [
          "When your women’s health needs extend beyond normal care, our providers can assist you in finding specialized treatment for illnesses such as breast cancer, gynecological malignancies, heart illness, and osteoporosis.",
          "Our teams include highly competent gynecologic surgeons who use cutting-edge techniques to address reproductive system disorders. When possible, they employ minimally invasive, robot-assisted surgery methods. These methods may lead to fewer complications and faster recovery.",
        ],
      },
    ],
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
    description: [
      "Primary care is the foundation of your health care journey, with your primary care provider (PCP) acting as your trusted initial point of contact for both routine health concerns and chronic diseases. Gura Hospital provides expert care and assistance to help you stay healthy, promote preventive care, and live well. Our primary care teams, which include doctors, physician assistants (PAs), and nurse practitioners (NPs), are your partners on the road to good health. We work together to achieve your immediate and long-term health goals, allowing you to thrive throughout your life.",
      "Specialist referrals: If you need to see a specialist, your primary care physician can refer you to the appropriate expert for further testing or treatment. With the broad Gura Hospital network, referrals can happen fast, allowing you to get prompt treatment without unnecessary delays.",
    ],
    accordionHeading: "Primary care services",
    accordion: [
      {
        title: "Protective care",
        paragraphs: [
          "Prevention is the most effective technique for maintaining good health. Our primary care providers are committed to keeping you healthy at all stages of life, providing annual exams, required immunizations, and routine health tests tailored to your age and needs.",
        ],
      },
      {
        title: "Child care",
        paragraphs: [
          "Many of our primary care professionals (PCPs) specialize in treating children and adolescents. Pediatric services include:",
        ],
        bullets: [
          "Immunizations",
          "Well-child visits",
          "Treatment of childhood diseases",
          "Ongoing support for your child’s emotional and physical health, growth, and development",
        ],
      },
      {
        title: "Elderly care",
        paragraphs: [
          "Older adults have special health-care demands. Many of the region’s primary care physicians (PCPs) are trained to help older persons stay healthy. They carefully consider your health issues and aspirations, then create an individualized care plan to support your well-being.",
        ],
      },
      {
        title: "Resident-driven primary care",
        paragraphs: [
          "Doctors and residents at our center provide comprehensive care for patients of all ages, including family medicine and urgent care, as well as access to hospital specialists, tests, and X-rays.",
          "As part of the teaching program, you will get primary care from a teaching physician. Prior to your initial appointment, a trained resident physician will be assigned to you. They will manage your care, handle referrals, and collaborate with your primary care provider to make sure you get the care you require.",
        ],
      },
    ],
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
