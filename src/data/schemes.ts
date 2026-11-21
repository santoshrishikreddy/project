import type {
  ApplyMode,
  BoolField,
  Criterion,
  DocKey,
  EnumField,
  L3,
  Occupation,
  Scheme,
  Sector,
} from "../lib/types";

/* ------------------------------------------------------------------ */
/* Tiny DSL used to convert scheme rules into structured criteria.      */
/* ------------------------------------------------------------------ */
const age = (min?: number, max?: number): Criterion => ({ f: "age", min, max });
const inc = (max: number): Criterion => ({ f: "income", max });
const oneOf = (f: EnumField, ...v: string[]): Criterion => ({ f, in: v });
const yes = (f: BoolField): Criterion => ({ f, is: true });
const occ = (...v: Occupation[]): Criterion => oneOf("occupation", ...v);
const level = (...v: string[]): Criterion => oneOf("studentLevel", ...v);

interface Opts {
  any?: Criterion[][];
  note?: L3;
  docs: DocKey[];
  mode: ApplyMode;
  url?: string;
  w?: number;
  state?: boolean;
}

function S(
  id: string,
  cats: Sector[],
  name: L3,
  benefit: L3,
  rules: Criterion[],
  o: Opts,
): Scheme {
  return { id, cats, name, benefit, rules, ...o };
}

/* ------------------------------------------------------------------ */
/* Documents                                                            */
/* ------------------------------------------------------------------ */
export const DOCS: Record<DocKey, L3> = {
  aadhaar: ["Aadhaar card", "आधार कार्ड", "ఆధార్ కార్డు"],
  bank: ["Bank passbook", "बैंक पासबुक", "బ్యాంక్ పాస్‌బుక్"],
  photo: ["Passport photo", "पासपोर्ट फोटो", "పాస్‌పోర్ట్ ఫోటో"],
  income: ["Income certificate", "आय प्रमाण पत्र", "ఆదాయ ధృవీకరణ పత్రం"],
  caste: ["Caste certificate", "जाति प्रमाण पत्र", "కుల ధృవీకరణ పత్రం"],
  age: ["Age proof (birth or school certificate)", "आयु प्रमाण (जन्म या स्कूल प्रमाण पत्र)", "వయసు రుజువు (జన్మ లేదా స్కూల్ సర్టిఫికేట్)"],
  address: ["Address proof", "पता प्रमाण", "చిరునామా రుజువు"],
  ration: ["Ration card", "राशन कार्ड", "రేషన్ కార్డు"],
  land: ["Land records (pattadar passbook / 7-12)", "ज़मीन के कागज़ (खसरा / खतौनी)", "భూమి పత్రాలు (పట్టాదారు పాస్‌బుక్)"],
  disability: ["Disability certificate / UDID card", "दिव्यांग प्रमाण पत्र / यूडीआईडी कार्ड", "వికలాంగ ధృవీకరణ పత్రం / యూడీఐడీ కార్డు"],
  school: ["School or college ID and marksheet", "स्कूल/कॉलेज आईडी और मार्कशीट", "స్కూల్/కాలేజీ ఐడీ, మార్కుల పత్రం"],
  mobile: ["Mobile number linked to Aadhaar", "आधार से जुड़ा मोबाइल नंबर", "ఆధార్‌తో అనుసంధానమైన మొబైల్ నంబర్"],
  pregnancy: ["Pregnancy / mother-child (MCP) card", "गर्भावस्था / मातृ-शिशु (एमसीपी) कार्ड", "గర్భధారణ / తల్లి-బిడ్డ (ఎంసీపీ) కార్డు"],
  marriage: ["Marriage invitation or proof", "विवाह का निमंत्रण या प्रमाण", "పెళ్లి శుభలేఖ లేదా రుజువు"],
  trade: ["Business or vending proof", "व्यवसाय या वेंडिंग प्रमाण", "వ్యాపారం లేదా వెండింగ్ రుజువు"],
};

/* Shared benefit text for the many "low-interest loan" corporations. */
const LOAN: L3 = [
  "Low-interest loans and training to start or grow your own work",
  "अपना काम शुरू करने या बढ़ाने के लिए कम ब्याज पर ऋण और प्रशिक्षण",
  "సొంత పని మొదలుపెట్టడానికి లేదా పెంచుకోవడానికి తక్కువ వడ్డీ రుణాలు, శిక్షణ",
];
const LOAN_DOCS: DocKey[] = ["aadhaar", "photo", "bank", "income", "caste"];
const SCHOLAR_DOCS: DocKey[] = ["aadhaar", "bank", "school", "income", "caste"];
const PENSION_DOCS: DocKey[] = ["aadhaar", "age", "bank", "ration", "photo"];
const NSP = "https://scholarships.gov.in";

export const SCHEMES: Scheme[] = [
  /* ============================ JOBS & SKILLS ============================ */
  S(
    "mgnregs",
    ["jobs", "social"],
    ["MGNREGA (100 days of work)", "मनरेगा (100 दिन का काम)", "ఉపాధి హామీ (100 రోజుల పని)"],
    [
      "Guaranteed 100 days of paid work every year for rural families",
      "ग्रामीण परिवारों को हर साल 100 दिन के काम की गारंटी",
      "గ్రామీణ కుటుంబాలకు ప్రతి ఏడాది 100 రోజుల పని హామీ",
    ],
    [oneOf("area", "rural"), age(18)],
    {
      note: [
        "Adult willing to do manual work. Get a job card from the Gram Panchayat.",
        "अकुशल शारीरिक काम के लिए तैयार वयस्क। ग्राम पंचायत से जॉब कार्ड बनवाएँ।",
        "శారీరక పని చేయడానికి సిద్ధమైన పెద్దలు. గ్రామ పంచాయతీ నుండి జాబ్ కార్డు తీసుకోండి.",
      ],
      docs: ["aadhaar", "bank", "photo", "address"],
      mode: "panchayat",
      url: "https://nrega.nic.in",
      w: 3,
    },
  ),
  S(
    "pmkvy",
    ["jobs"],
    ["PM Kaushal Vikas Yojana (free skill training)", "पीएम कौशल विकास योजना (मुफ़्त प्रशिक्षण)", "పీఎం కౌశల్ వికాస్ యోజన (ఉచిత శిక్షణ)"],
    [
      "Free short skill course with a certificate and job support",
      "प्रमाण पत्र और नौकरी में मदद के साथ मुफ़्त कौशल कोर्स",
      "సర్టిఫికేట్, ఉద్యోగ సహాయంతో ఉచిత నైపుణ్య శిక్షణ",
    ],
    [age(15, 45), occ("jobseeker", "labour", "homemaker", "artisan")],
    { docs: ["aadhaar", "bank", "photo", "age"], mode: "online", url: "https://www.skillindia.gov.in", w: 2 },
  ),
  S(
    "ddu-gky",
    ["jobs"],
    ["DDU-GKY (rural youth skills & jobs)", "डीडीयू-जीकेवाई (ग्रामीण युवा कौशल)", "డీడీయూ-జీకేవై (గ్రామీణ యువత నైపుణ్యాలు)"],
    [
      "Free training and a job placement for poor rural youth",
      "गरीब ग्रामीण युवाओं के लिए मुफ़्त प्रशिक्षण और नौकरी",
      "పేద గ్రామీణ యువతకు ఉచిత శిక్షణ, ఉద్యోగం",
    ],
    [oneOf("area", "rural"), age(15, 35), yes("bpl"), occ("jobseeker", "labour", "homemaker")],
    { docs: ["aadhaar", "age", "ration", "photo", "bank"], mode: "office", url: "https://ddugky.gov.in", w: 2 },
  ),
  S(
    "ncs",
    ["jobs"],
    ["National Career Service (free job portal)", "राष्ट्रीय कैरियर सेवा (मुफ़्त जॉब पोर्टल)", "జాతీయ కెరీర్ సర్వీస్ (ఉచిత జాబ్ పోర్టల్)"],
    [
      "Free job search, job matching and career advice",
      "मुफ़्त नौकरी खोज, जॉब मैचिंग और करियर सलाह",
      "ఉచిత ఉద్యోగ శోధన, ఉద్యోగ సరిపోలిక, కెరీర్ సలహా",
    ],
    [age(18), occ("jobseeker", "student", "labour", "homemaker", "artisan")],
    { docs: ["aadhaar", "mobile"], mode: "online", url: "https://www.ncs.gov.in", w: 1 },
  ),
  S(
    "naps",
    ["jobs"],
    ["Apprenticeship (earn while you learn)", "अप्रेंटिसशिप (सीखते हुए कमाएँ)", "అప్రెంటిస్‌షిప్ (నేర్చుకుంటూ సంపాదించండి)"],
    [
      "On-the-job training in a company with a monthly stipend",
      "कंपनी में काम सीखें और हर महीने वजीफ़ा पाएँ",
      "కంపెనీలో పని నేర్చుకుంటూ నెలవారీ స్టైపెండ్ పొందండి",
    ],
    [age(14), occ("jobseeker", "student")],
    { docs: ["aadhaar", "school", "photo", "bank"], mode: "online", url: "https://www.apprenticeshipindia.gov.in", w: 2 },
  ),
  S(
    "pm-internship",
    ["jobs"],
    ["PM Internship Scheme", "पीएम इंटर्नशिप योजना", "పీఎం ఇంటర్న్‌షిప్ పథకం"],
    [
      "12-month paid internship in top companies: ₹5,000 a month plus ₹6,000 once",
      "बड़ी कंपनियों में 12 महीने की इंटर्नशिप: ₹5,000 प्रति माह और ₹6,000 एक बार",
      "పెద్ద కంపెనీల్లో 12 నెలల ఇంటర్న్‌షిప్: నెలకు ₹5,000, ఒకసారి ₹6,000",
    ],
    [age(21, 24), inc(8), occ("jobseeker")],
    {
      note: [
        "No one in your family should have a government job. You must not be in full-time study or a job.",
        "परिवार में कोई सरकारी नौकरी में न हो। आप पूर्णकालिक पढ़ाई या नौकरी में न हों।",
        "కుటుంబంలో ఎవరికీ ప్రభుత్వ ఉద్యోగం ఉండకూడదు. మీరు పూర్తి సమయం చదువు లేదా ఉద్యోగంలో ఉండకూడదు.",
      ],
      docs: ["aadhaar", "bank", "school", "mobile"],
      mode: "online",
      url: "https://pminternship.mca.gov.in",
      w: 2,
    },
  ),
  S(
    "eshram",
    ["jobs", "social"],
    ["e-Shram card (unorganised workers)", "ई-श्रम कार्ड (असंगठित श्रमिक)", "ఈ-శ్రమ్ కార్డు (అసంఘటిత కార్మికులు)"],
    [
      "Free ₹2 lakh accident insurance and access to worker schemes",
      "₹2 लाख का मुफ़्त दुर्घटना बीमा और श्रमिक योजनाओं का लाभ",
      "₹2 లక్షల ఉచిత ప్రమాద బీమా, కార్మిక పథకాల లాభం",
    ],
    [age(16, 59), occ("labour", "artisan", "farmer", "business")],
    {
      note: [
        "You should not be an EPFO/ESIC member or an income tax payer.",
        "आप ईपीएफओ/ईएसआईसी सदस्य या आयकर दाता न हों।",
        "మీరు ఈపీఎఫ్ఓ/ఈఎస్ఐసీ సభ్యులు లేదా ఆదాయపు పన్ను చెల్లింపుదారులు కాకూడదు.",
      ],
      docs: ["aadhaar", "bank", "mobile"],
      mode: "csc",
      url: "https://eshram.gov.in",
      w: 3,
    },
  ),
  S(
    "bocw",
    ["jobs", "social"],
    ["Construction workers welfare board", "निर्माण श्रमिक कल्याण बोर्ड", "భవన నిర్మాణ కార్మిక సంక్షేమ బోర్డు"],
    [
      "Pension, medical, education and housing help for registered construction workers",
      "पंजीकृत निर्माण श्रमिकों को पेंशन, इलाज, शिक्षा और मकान में मदद",
      "నమోదైన నిర్మాణ కార్మికులకు పింఛను, వైద్యం, విద్య, ఇంటి సహాయం",
    ],
    [age(18, 60), occ("labour")],
    {
      note: [
        "You must have worked 90 days in construction in the last year and register with the State BOCW board.",
        "पिछले साल निर्माण में 90 दिन काम किया हो और राज्य बोर्ड में पंजीकरण कराएँ।",
        "గత ఏడాది నిర్మాణ రంగంలో 90 రోజులు పని చేసి ఉండాలి, రాష్ట్ర బోర్డులో నమోదు చేసుకోండి.",
      ],
      docs: ["aadhaar", "bank", "photo", "address", "age"],
      mode: "office",
      w: 2,
    },
  ),
  S(
    "govt-reservation",
    ["jobs", "inclusion"],
    ["Reservation in government jobs", "सरकारी नौकरियों में आरक्षण", "ప్రభుత్వ ఉద్యోగాల్లో రిజర్వేషన్"],
    [
      "Reserved posts in central jobs: SC 15%, ST 7.5%, OBC 27%, EWS 10%",
      "केंद्रीय नौकरियों में आरक्षण: एससी 15%, एसटी 7.5%, ओबीसी 27%, ईडब्ल्यूएस 10%",
      "కేంద్ర ఉద్యోగాల్లో రిజర్వేషన్: ఎస్సీ 15%, ఎస్టీ 7.5%, బీసీ 27%, ఈడబ్ల్యూఎస్ 10%",
    ],
    [age(18)],
    {
      any: [[oneOf("category", "sc", "st", "obc")], [oneOf("category", "general"), inc(8)]],
      note: [
        "Keep a valid caste or EWS certificate ready when a job advertisement comes.",
        "नौकरी का विज्ञापन आने पर वैध जाति या ईडब्ल्यूएस प्रमाण पत्र तैयार रखें।",
        "ఉద్యోగ ప్రకటన వచ్చినప్పుడు సరైన కుల లేదా ఈడబ్ల్యూఎస్ సర్టిఫికేట్ సిద్ధంగా ఉంచండి.",
      ],
      docs: ["caste", "income", "age", "aadhaar"],
      mode: "office",
      w: 2,
    },
  ),
  S(
    "pm-vishwakarma",
    ["business", "jobs"],
    ["PM Vishwakarma (artisans)", "पीएम विश्वकर्मा (कारीगर)", "పీఎం విశ్వకర్మ (చేతివృత్తులవారు)"],
    [
      "₹15,000 toolkit, free training with ₹500 a day, loan up to ₹3 lakh at 5%",
      "₹15,000 का टूलकिट, ₹500 रोज़ के साथ मुफ़्त प्रशिक्षण, 5% पर ₹3 लाख तक ऋण",
      "₹15,000 టూల్‌కిట్, రోజుకు ₹500తో ఉచిత శిక్షణ, 5% వడ్డీతో ₹3 లక్షల వరకు రుణం",
    ],
    [age(18), occ("artisan")],
    {
      note: [
        "You must work in one of 18 traditional trades (carpenter, weaver, potter, tailor, etc.) and not be a government employee.",
        "18 पारंपरिक कामों (बढ़ई, बुनकर, कुम्हार, दर्जी आदि) में से एक करते हों और सरकारी कर्मचारी न हों।",
        "18 సంప్రదాయ వృత్తుల్లో (వడ్రంగి, నేతపని, కుమ్మరి, దర్జీ మొదలైనవి) ఒకటి చేస్తూ, ప్రభుత్వ ఉద్యోగి కాకూడదు.",
      ],
      docs: ["aadhaar", "bank", "mobile", "trade"],
      mode: "csc",
      url: "https://pmvishwakarma.gov.in",
      w: 3,
    },
  ),

  /* ============================ BUSINESS & LOANS ============================ */
  S(
    "mudra",
    ["business"],
    ["PM MUDRA loan", "पीएम मुद्रा ऋण", "పీఎం ముద్ర రుణం"],
    [
      "Loan up to ₹20 lakh for a small business, no collateral needed",
      "छोटे व्यवसाय के लिए ₹20 लाख तक ऋण, गारंटी की ज़रूरत नहीं",
      "చిన్న వ్యాపారానికి ₹20 లక్షల వరకు రుణం, తాకట్టు అవసరం లేదు",
    ],
    [age(18), occ("business", "artisan", "jobseeker", "homemaker")],
    {
      note: [
        "For non-farm business (shop, service, small factory). Apply at any bank.",
        "गैर-कृषि व्यवसाय (दुकान, सेवा, छोटा कारखाना) के लिए। किसी भी बैंक में आवेदन करें।",
        "వ్యవసాయేతర వ్యాపారం (దుకాణం, సేవ, చిన్న పరిశ్రమ) కోసం. ఏ బ్యాంకులోనైనా దరఖాస్తు చేయండి.",
      ],
      docs: ["aadhaar", "photo", "address", "bank", "trade"],
      mode: "bank",
      url: "https://www.mudra.org.in",
      w: 3,
    },
  ),
  S(
    "pmegp",
    ["business", "jobs"],
    ["PMEGP (start your own unit)", "पीएमईजीपी (अपनी इकाई शुरू करें)", "పీఎంఈజీపీ (సొంత యూనిట్ ప్రారంభం)"],
    [
      "Loan with 15–35% government subsidy to start a new small enterprise",
      "नया छोटा उद्यम शुरू करने के लिए 15–35% सरकारी सब्सिडी के साथ ऋण",
      "కొత్త చిన్న పరిశ్రమ కోసం 15–35% ప్రభుత్వ సబ్సిడీతో రుణం",
    ],
    [age(18), occ("jobseeker", "business", "artisan", "homemaker", "labour")],
    {
      note: [
        "Only for new projects. 8th pass is needed for bigger projects.",
        "केवल नई परियोजनाओं के लिए। बड़ी परियोजनाओं के लिए 8वीं पास ज़रूरी है।",
        "కొత్త ప్రాజెక్టులకు మాత్రమే. పెద్ద ప్రాజెక్టులకు 8వ తరగతి పాస్ కావాలి.",
      ],
      docs: ["aadhaar", "photo", "bank", "age", "caste"],
      mode: "online",
      url: "https://www.kviconline.gov.in/pmegpeportal",
      w: 2,
    },
  ),
  S(
    "standup",
    ["business", "women", "inclusion"],
    ["Stand-Up India", "स्टैंड-अप इंडिया", "స్టాండ్-అప్ ఇండియా"],
    [
      "Bank loan of ₹10 lakh to ₹1 crore for a new business by women, SC or ST",
      "महिलाओं, एससी या एसटी के नए व्यवसाय के लिए ₹10 लाख से ₹1 करोड़ तक बैंक ऋण",
      "మహిళలు, ఎస్సీ, ఎస్టీల కొత్త వ్యాపారానికి ₹10 లక్షల నుండి ₹1 కోటి వరకు బ్యాంక్ రుణం",
    ],
    [age(18)],
    {
      any: [[oneOf("category", "sc")], [oneOf("category", "st")], [oneOf("gender", "female")]],
      note: [
        "For a new first-time business in manufacturing, services or trading.",
        "विनिर्माण, सेवा या व्यापार में पहली बार शुरू होने वाले नए व्यवसाय के लिए।",
        "తయారీ, సేవలు లేదా వ్యాపారంలో మొదటిసారి ప్రారంభించే కొత్త వ్యాపారం కోసం.",
      ],
      docs: ["aadhaar", "photo", "caste", "address", "bank"],
      mode: "bank",
      url: "https://www.standupmitra.in",
      w: 2,
    },
  ),
  S(
    "svanidhi",
    ["business"],
    ["PM SVANidhi (street vendors)", "पीएम स्वनिधि (रेहड़ी-पटरी वाले)", "పీఎం స్వనిధి (వీధి వ్యాపారులు)"],
    [
      "Working-capital loan from ₹10,000 up to ₹50,000 for street vendors",
      "रेहड़ी-पटरी वालों के लिए ₹10,000 से ₹50,000 तक कार्यशील पूँजी ऋण",
      "వీధి వ్యాపారులకు ₹10,000 నుండి ₹50,000 వరకు పని రుణం",
    ],
    [age(18), occ("business")],
    {
      note: [
        "You must be a street vendor with a vending certificate or ID from the municipality.",
        "आपके पास नगरपालिका का वेंडिंग प्रमाण पत्र या पहचान पत्र होना चाहिए।",
        "మున్సిపాలిటీ నుండి వెండింగ్ సర్టిఫికేట్ లేదా ఐడీ ఉన్న వీధి వ్యాపారి అయి ఉండాలి.",
      ],
      docs: ["aadhaar", "mobile", "trade", "bank"],
      mode: "online",
      url: "https://pmsvanidhi.mohua.gov.in",
      w: 2,
    },
  ),
  S(
    "day-nrlm",
    ["business", "women"],
    ["DAY-NRLM / Lakhpati Didi", "डे-एनआरएलएम / लखपति दीदी", "డే-ఎన్ఆర్ఎల్ఎం / లక్షాధికారి దీదీ"],
    [
      "Join a women's self-help group: cheap loans, training and a path to ₹1 lakh yearly income",
      "महिला स्वयं सहायता समूह से जुड़ें: सस्ते ऋण, प्रशिक्षण और सालाना ₹1 लाख आय का रास्ता",
      "మహిళా స్వయం సహాయక సంఘంలో చేరండి: తక్కువ వడ్డీ రుణాలు, శిక్షణ, ఏడాదికి ₹1 లక్ష ఆదాయం",
    ],
    [oneOf("area", "rural"), oneOf("gender", "female"), age(18), yes("bpl")],
    { docs: ["aadhaar", "bank", "photo", "ration"], mode: "panchayat", url: "https://aajeevika.gov.in", w: 2 },
  ),
  S(
    "day-nulm",
    ["business", "jobs"],
    ["DAY-NULM (urban livelihood)", "डे-एनयूएलएम (शहरी आजीविका)", "డే-ఎన్‌యూఎల్ఎం (పట్టణ జీవనోపాధి)"],
    [
      "Skill training and cheap loans for urban poor to start work",
      "शहरी गरीबों के लिए कौशल प्रशिक्षण और काम शुरू करने को सस्ते ऋण",
      "పట్టణ పేదలకు నైపుణ్య శిక్షణ, పని మొదలుపెట్టడానికి తక్కువ వడ్డీ రుణాలు",
    ],
    [oneOf("area", "urban"), yes("bpl"), age(18, 60)],
    { docs: ["aadhaar", "photo", "bank", "ration"], mode: "office", url: "https://nulm.gov.in", w: 1 },
  ),
  S(
    "nsfdc",
    ["business", "inclusion"],
    ["NSFDC loans for SC", "एनएसएफडीसी ऋण (अनुसूचित जाति)", "ఎన్ఎస్ఎఫ్‌డీసీ రుణాలు (ఎస్సీ)"],
    LOAN,
    [age(18, 60), oneOf("category", "sc")],
    { docs: LOAN_DOCS, mode: "office", url: "https://nsfdc.nic.in", w: 1 },
  ),
  S(
    "nbcfdc",
    ["business", "inclusion"],
    ["NBCFDC loans for OBC", "एनबीसीएफडीसी ऋण (ओबीसी)", "ఎన్‌బీసీఎఫ్‌డీసీ రుణాలు (బీసీ)"],
    LOAN,
    [age(18, 55), oneOf("category", "obc")],
    { docs: LOAN_DOCS, mode: "office", url: "https://nbcfdc.gov.in", w: 1 },
  ),
  S(
    "nstfdc",
    ["business", "inclusion"],
    ["NSTFDC loans for ST", "एनएसटीएफडीसी ऋण (अनुसूचित जनजाति)", "ఎన్ఎస్టీఎఫ్‌డీసీ రుణాలు (ఎస్టీ)"],
    LOAN,
    [age(18, 60), oneOf("category", "st")],
    { docs: LOAN_DOCS, mode: "office", w: 1 },
  ),
  S(
    "nmdfc",
    ["business", "inclusion"],
    ["NMDFC loans for minorities", "एनएमडीएफसी ऋण (अल्पसंख्यक)", "ఎన్ఎండీఎఫ్‌సీ రుణాలు (మైనారిటీ)"],
    LOAN,
    [age(18, 55), yes("minority")],
    { docs: LOAN_DOCS, mode: "office", url: "https://nmdfc.org", w: 1 },
  ),
  S(
    "smile",
    ["inclusion", "business"],
    ["SMILE (transgender persons)", "स्माइल (ट्रांसजेंडर व्यक्ति)", "స్మైల్ (ట్రాన్స్‌జెండర్ వ్యక్తులు)"],
    [
      "Scholarships, skill training, loans and health cover for transgender persons",
      "ट्रांसजेंडर व्यक्तियों के लिए छात्रवृत्ति, कौशल प्रशिक्षण, ऋण और स्वास्थ्य कवर",
      "ట్రాన్స్‌జెండర్ వ్యక్తులకు స్కాలర్‌షిప్, నైపుణ్య శిక్షణ, రుణాలు, ఆరోగ్య రక్షణ",
    ],
    [oneOf("gender", "other")],
    {
      note: [
        "Get a Transgender ID certificate from the national portal first.",
        "पहले राष्ट्रीय पोर्टल से ट्रांसजेंडर पहचान प्रमाण पत्र बनवाएँ।",
        "ముందుగా జాతీయ పోర్టల్ నుండి ట్రాన్స్‌జెండర్ గుర్తింపు సర్టిఫికేట్ తీసుకోండి.",
      ],
      docs: ["aadhaar", "bank", "photo", "address"],
      mode: "online",
      url: "https://transgender.dosje.gov.in",
      w: 2,
    },
  ),
  S(
    "van-dhan",
    ["inclusion", "jobs"],
    ["PM Van Dhan (tribal livelihoods)", "पीएम वन धन (आदिवासी आजीविका)", "పీఎం వన్ ధన్ (గిరిజన జీవనోపాధి)"],
    [
      "Join a tribal group to process and sell forest produce at better prices",
      "वन उपज को प्रसंस्कृत कर बेहतर दाम पर बेचने के लिए आदिवासी समूह से जुड़ें",
      "అటవీ ఉత్పత్తులను ప్రాసెస్ చేసి మంచి ధరకు అమ్మడానికి గిరిజన సమూహంలో చేరండి",
    ],
    [oneOf("category", "st"), oneOf("area", "rural")],
    {
      note: [
        "Forest-produce gatherers form groups of about 20 people.",
        "वन उपज इकट्ठा करने वाले लगभग 20 लोगों के समूह बनाते हैं।",
        "అటవీ ఉత్పత్తులు సేకరించేవారు సుమారు 20 మందితో సమూహం ఏర్పరుస్తారు.",
      ],
      docs: ["aadhaar", "caste", "bank"],
      mode: "office",
      w: 1,
    },
  ),

  /* ============================ FARMERS ============================ */
  S(
    "pm-kisan",
    ["agri", "social"],
    ["PM-KISAN", "पीएम-किसान", "పీఎం-కిసాన్"],
    [
      "₹6,000 a year in three instalments, straight to your bank account",
      "सीधे बैंक खाते में साल में तीन किस्तों में ₹6,000",
      "నేరుగా బ్యాంక్ ఖాతాలో ఏడాదికి మూడు విడతల్లో ₹6,000",
    ],
    [occ("farmer"), yes("land")],
    {
      note: [
        "Not for income-tax payers, government employees or pensioners with ₹10,000+ a month.",
        "आयकर दाता, सरकारी कर्मचारी या ₹10,000+ मासिक पेंशन वालों के लिए नहीं।",
        "ఆదాయపు పన్ను చెల్లింపుదారులు, ప్రభుత్వ ఉద్యోగులు, నెలకు ₹10,000+ పింఛను ఉన్నవారికి కాదు.",
      ],
      docs: ["aadhaar", "bank", "land", "mobile"],
      mode: "csc",
      url: "https://pmkisan.gov.in",
      w: 4,
    },
  ),
  S(
    "pm-kmy",
    ["agri", "social"],
    ["PM Kisan Maan-Dhan pension", "पीएम किसान मान-धन पेंशन", "పీఎం కిసాన్ మాన్-ధన్ పింఛను"],
    [
      "₹3,000 a month pension after age 60 for small farmers",
      "छोटे किसानों के लिए 60 वर्ष के बाद ₹3,000 मासिक पेंशन",
      "చిన్న రైతులకు 60 ఏళ్ల తర్వాత నెలకు ₹3,000 పింఛను",
    ],
    [occ("farmer"), yes("land"), age(18, 40)],
    {
      note: [
        "Land up to 2 hectares. You pay a small monthly amount, the government adds the same.",
        "2 हेक्टेयर तक ज़मीन। आप थोड़ी मासिक राशि देते हैं, सरकार उतनी ही जोड़ती है।",
        "2 హెక్టార్ల వరకు భూమి. మీరు కొంత మొత్తం చెల్లిస్తే ప్రభుత్వం అంతే జమ చేస్తుంది.",
      ],
      docs: ["aadhaar", "bank", "land"],
      mode: "csc",
      url: "https://maandhan.in",
      w: 2,
    },
  ),
  S(
    "pmfby",
    ["agri"],
    ["PM Fasal Bima (crop insurance)", "पीएम फसल बीमा", "పీఎం ఫసల్ బీమా (పంట బీమా)"],
    [
      "Crop insurance for only 1.5–2% premium against drought, flood and pests",
      "सूखा, बाढ़ और कीटों से फसल का बीमा, केवल 1.5–2% प्रीमियम",
      "కరువు, వరద, చీడపీడల నుండి పంట బీమా, కేవలం 1.5–2% ప్రీమియం",
    ],
    [occ("farmer")],
    {
      note: [
        "Enrol before the cut-off date of the sowing season, through your bank or CSC.",
        "बुआई के मौसम की अंतिम तिथि से पहले अपने बैंक या सीएससी से पंजीकरण करें।",
        "విత్తనాల సీజన్ గడువు ముందే బ్యాంక్ లేదా సీఎస్సీ ద్వారా నమోదు చేసుకోండి.",
      ],
      docs: ["aadhaar", "bank", "land"],
      mode: "bank",
      url: "https://pmfby.gov.in",
      w: 3,
    },
  ),
  S(
    "kcc",
    ["agri", "business"],
    ["Kisan Credit Card", "किसान क्रेडिट कार्ड", "కిసాన్ క్రెడిట్ కార్డు"],
    [
      "Farm loan up to ₹3 lakh at about 4% interest if repaid on time",
      "समय पर चुकाने पर लगभग 4% ब्याज पर ₹3 लाख तक कृषि ऋण",
      "సమయానికి చెల్లిస్తే సుమారు 4% వడ్డీతో ₹3 లక్షల వరకు వ్యవసాయ రుణం",
    ],
    [occ("farmer"), age(18, 75)],
    { docs: ["aadhaar", "land", "photo", "bank"], mode: "bank", w: 2 },
  ),
  S(
    "rythu-bharosa",
    ["agri"],
    ["Rythu Bharosa (Telangana)", "रायतु भरोसा (तेलंगाना)", "రైతు భరోసా (తెలంగాణ)"],
    [
      "Up to ₹12,000 per acre every year as farming investment support",
      "खेती के निवेश के लिए हर साल प्रति एकड़ ₹12,000 तक",
      "వ్యవసాయ పెట్టుబడి సాయంగా ప్రతి ఏడాది ఎకరాకు ₹12,000 వరకు",
    ],
    [oneOf("state", "telangana"), occ("farmer"), yes("land")],
    { docs: ["aadhaar", "land", "bank"], mode: "office", url: "https://agri.telangana.gov.in", w: 3, state: true },
  ),
  S(
    "annadata",
    ["agri"],
    ["Annadata Sukhibhava (Andhra Pradesh)", "अन्नदाता सुखीभव (आंध्र प्रदेश)", "అన్నదాత సుఖీభవ (ఆంధ్రప్రదేశ్)"],
    [
      "₹20,000 a year for farmer families (₹6,000 PM-KISAN + ₹14,000 state)",
      "किसान परिवारों को साल में ₹20,000 (₹6,000 पीएम-किसान + ₹14,000 राज्य)",
      "రైతు కుటుంబాలకు ఏడాదికి ₹20,000 (₹6,000 పీఎం-కిసాన్ + ₹14,000 రాష్ట్రం)",
    ],
    [oneOf("state", "andhra"), occ("farmer"), yes("land")],
    { docs: ["aadhaar", "land", "bank"], mode: "office", w: 3, state: true },
  ),

  /* ============================ EDUCATION ============================ */
  S(
    "sc-pre",
    ["edu", "inclusion"],
    ["Pre-Matric Scholarship for SC (Class 9–10)", "एससी प्री-मैट्रिक छात्रवृत्ति (कक्षा 9–10)", "ఎస్సీ ప్రీ-మెట్రిక్ స్కాలర్‌షిప్ (9–10 తరగతి)"],
    [
      "Yearly scholarship and allowance for SC students in Class 9–10",
      "कक्षा 9–10 के एससी छात्रों के लिए वार्षिक छात्रवृत्ति और भत्ता",
      "9–10 తరగతి ఎస్సీ విద్యార్థులకు వార్షిక స్కాలర్‌షిప్, భత్యం",
    ],
    [occ("student"), level("class9_10"), oneOf("category", "sc"), inc(2.5)],
    { docs: SCHOLAR_DOCS, mode: "school", url: NSP, w: 2 },
  ),
  S(
    "sc-post",
    ["edu", "inclusion"],
    ["Post-Matric Scholarship for SC", "एससी पोस्ट-मैट्रिक छात्रवृत्ति", "ఎస్సీ పోస్ట్-మెట్రిక్ స్కాలర్‌షిప్"],
    [
      "Course fees and monthly allowance for SC students from Class 11 to PG",
      "कक्षा 11 से पीजी तक एससी छात्रों को फीस और मासिक भत्ता",
      "11వ తరగతి నుండి పీజీ వరకు ఎస్సీ విద్యార్థులకు ఫీజు, నెలవారీ భత్యం",
    ],
    [occ("student"), level("class11_12", "college"), oneOf("category", "sc"), inc(2.5)],
    { docs: SCHOLAR_DOCS, mode: "school", url: NSP, w: 3 },
  ),
  S(
    "st-pre",
    ["edu", "inclusion"],
    ["Pre-Matric Scholarship for ST (Class 9–10)", "एसटी प्री-मैट्रिक छात्रवृत्ति (कक्षा 9–10)", "ఎస్టీ ప్రీ-మెట్రిక్ స్కాలర్‌షిప్ (9–10 తరగతి)"],
    [
      "Yearly scholarship and allowance for ST students in Class 9–10",
      "कक्षा 9–10 के एसटी छात्रों के लिए वार्षिक छात्रवृत्ति और भत्ता",
      "9–10 తరగతి ఎస్టీ విద్యార్థులకు వార్షిక స్కాలర్‌షిప్, భత్యం",
    ],
    [occ("student"), level("class9_10"), oneOf("category", "st"), inc(2.5)],
    { docs: SCHOLAR_DOCS, mode: "school", url: NSP, w: 2 },
  ),
  S(
    "st-post",
    ["edu", "inclusion"],
    ["Post-Matric Scholarship for ST", "एसटी पोस्ट-मैट्रिक छात्रवृत्ति", "ఎస్టీ పోస్ట్-మెట్రిక్ స్కాలర్‌షిప్"],
    [
      "Course fees and monthly allowance for ST students from Class 11 to PG",
      "कक्षा 11 से पीजी तक एसटी छात्रों को फीस और मासिक भत्ता",
      "11వ తరగతి నుండి పీజీ వరకు ఎస్టీ విద్యార్థులకు ఫీజు, నెలవారీ భత్యం",
    ],
    [occ("student"), level("class11_12", "college"), oneOf("category", "st"), inc(2.5)],
    { docs: SCHOLAR_DOCS, mode: "school", url: NSP, w: 3 },
  ),
  S(
    "yasasvi",
    ["edu", "inclusion"],
    ["PM YASASVI scholarship for OBC", "पीएम यशस्वी छात्रवृत्ति (ओबीसी)", "పీఎం యశస్వి స్కాలర్‌షిప్ (బీసీ)"],
    [
      "Scholarship for OBC, EBC and denotified-tribe students in Class 9–12",
      "कक्षा 9–12 के ओबीसी, ईबीसी और विमुक्त जनजाति छात्रों के लिए छात्रवृत्ति",
      "9–12 తరగతి బీసీ, ఈబీసీ, డీఎన్‌టీ విద్యార్థులకు స్కాలర్‌షిప్",
    ],
    [occ("student"), level("class9_10", "class11_12"), oneOf("category", "obc"), inc(2.5)],
    { docs: SCHOLAR_DOCS, mode: "school", url: NSP, w: 2 },
  ),
  S(
    "minority-pre",
    ["edu", "inclusion"],
    ["Pre-Matric Scholarship for minorities", "अल्पसंख्यक प्री-मैट्रिक छात्रवृत्ति", "మైనారిటీ ప్రీ-మెట్రిక్ స్కాలర్‌షిప్"],
    [
      "Scholarship for minority students in Class 9–10 from poor families",
      "गरीब परिवारों के कक्षा 9–10 के अल्पसंख्यक छात्रों के लिए छात्रवृत्ति",
      "పేద కుటుంబాల 9–10 తరగతి మైనారిటీ విద్యార్థులకు స్కాలర్‌షిప్",
    ],
    [occ("student"), level("class9_10"), yes("minority"), inc(1)],
    {
      note: [
        "At least 50% marks in the previous exam.",
        "पिछली परीक्षा में कम से कम 50% अंक।",
        "గత పరీక్షలో కనీసం 50% మార్కులు.",
      ],
      docs: SCHOLAR_DOCS,
      mode: "school",
      url: NSP,
      w: 2,
    },
  ),
  S(
    "minority-post",
    ["edu", "inclusion"],
    ["Post-Matric Scholarship for minorities", "अल्पसंख्यक पोस्ट-मैट्रिक छात्रवृत्ति", "మైనారిటీ పోస్ట్-మెట్రిక్ స్కాలర్‌షిప్"],
    [
      "Fees and allowance for minority students from Class 11 to PG",
      "कक्षा 11 से पीजी तक अल्पसंख्यक छात्रों के लिए फीस और भत्ता",
      "11వ తరగతి నుండి పీజీ వరకు మైనారిటీ విద్యార్థులకు ఫీజు, భత్యం",
    ],
    [occ("student"), level("class11_12", "college"), yes("minority"), inc(2)],
    {
      note: [
        "At least 50% marks in the previous exam.",
        "पिछली परीक्षा में कम से कम 50% अंक।",
        "గత పరీక్షలో కనీసం 50% మార్కులు.",
      ],
      docs: SCHOLAR_DOCS,
      mode: "school",
      url: NSP,
      w: 2,
    },
  ),
  S(
    "nmms",
    ["edu"],
    ["National Means-cum-Merit Scholarship", "राष्ट्रीय मीन्स-कम-मेरिट छात्रवृत्ति", "జాతీయ మీన్స్-కమ్-మెరిట్ స్కాలర్‌షిప్"],
    [
      "₹12,000 a year for bright poor students from Class 9 to 12",
      "कक्षा 9 से 12 तक होनहार गरीब छात्रों को ₹12,000 सालाना",
      "9 నుండి 12 తరగతి వరకు ప్రతిభావంతులైన పేద విద్యార్థులకు ఏడాదికి ₹12,000",
    ],
    [occ("student"), level("class1_8"), age(11, 16), inc(3.5)],
    {
      note: [
        "Class 8 student of a government or aided school who passes the NMMS exam.",
        "सरकारी या सहायता प्राप्त स्कूल का कक्षा 8 का छात्र जो एनएमएमएस परीक्षा पास करे।",
        "ప్రభుత్వ/ఎయిడెడ్ స్కూల్ 8వ తరగతి విద్యార్థి, ఎన్ఎంఎంఎస్ పరీక్షలో ఉత్తీర్ణత సాధించాలి.",
      ],
      docs: SCHOLAR_DOCS,
      mode: "school",
      url: NSP,
      w: 2,
    },
  ),
  S(
    "csss",
    ["edu"],
    ["Central Sector Scholarship (college)", "केंद्रीय क्षेत्र छात्रवृत्ति (कॉलेज)", "కేంద్ర రంగ స్కాలర్‌షిప్ (కాలేజీ)"],
    [
      "₹12,000–20,000 a year for top-scoring college students from poor families",
      "गरीब परिवारों के अव्वल कॉलेज छात्रों को सालाना ₹12,000–20,000",
      "పేద కుటుంబాల ప్రతిభావంతులైన కాలేజీ విద్యార్థులకు ఏడాదికి ₹12,000–20,000",
    ],
    [occ("student"), level("college"), inc(4.5)],
    {
      note: [
        "You need to be above the 80th percentile in your Class 12 board exam.",
        "कक्षा 12 बोर्ड परीक्षा में 80वें पर्सेंटाइल से ऊपर होना चाहिए।",
        "12వ తరగతి బోర్డు పరీక్షలో 80 పర్సంటైల్ పైన ఉండాలి.",
      ],
      docs: SCHOLAR_DOCS,
      mode: "school",
      url: NSP,
      w: 2,
    },
  ),
  S(
    "pragati",
    ["edu", "women"],
    ["Pragati scholarship for girls", "प्रगति छात्रवृत्ति (छात्राएँ)", "ప్రగతి స్కాలర్‌షిప్ (బాలికలు)"],
    [
      "₹50,000 a year for girls in AICTE-approved diploma or degree courses",
      "एआईसीटीई मान्य डिप्लोमा या डिग्री में पढ़ रही छात्राओं को सालाना ₹50,000",
      "ఏఐసీటీఈ గుర్తింపు డిప్లొమా/డిగ్రీ చదువుతున్న అమ్మాయిలకు ఏడాదికి ₹50,000",
    ],
    [oneOf("gender", "female"), occ("student"), level("college"), inc(8)],
    {
      note: [
        "Maximum two girls per family.",
        "एक परिवार से अधिकतम दो लड़कियाँ।",
        "ఒక కుటుంబం నుండి గరిష్ఠంగా ఇద్దరు అమ్మాయిలు.",
      ],
      docs: SCHOLAR_DOCS,
      mode: "school",
      url: NSP,
      w: 2,
    },
  ),
  S(
    "pm-poshan",
    ["edu", "women"],
    ["PM POSHAN (school meals)", "पीएम पोषण (स्कूल भोजन)", "పీఎం పోషణ్ (స్కూల్ భోజనం)"],
    [
      "Free hot cooked meal on every school day in Class 1–8 (government and aided schools)",
      "सरकारी और सहायता प्राप्त स्कूलों में कक्षा 1–8 को हर दिन मुफ़्त गर्म भोजन",
      "ప్రభుత్వ/ఎయిడెడ్ స్కూళ్లలో 1–8 తరగతులకు ప్రతి రోజు ఉచిత వేడి భోజనం",
    ],
    [occ("student"), level("class1_8"), age(3, 15)],
    { docs: ["school"], mode: "school", w: 2 },
  ),

  /* ============================ HEALTH ============================ */
  S(
    "pmjay",
    ["health"],
    ["Ayushman Bharat PM-JAY", "आयुष्मान भारत पीएम-जय", "ఆయుష్మాన్ భారత్ పీఎం-జేఏవై"],
    [
      "₹5 lakh free hospital treatment per family every year",
      "हर परिवार को हर साल ₹5 लाख तक मुफ़्त अस्पताल इलाज",
      "ప్రతి కుటుంబానికి ఏడాదికి ₹5 లక్షల వరకు ఉచిత ఆసుపత్రి చికిత్స",
    ],
    [yes("bpl")],
    {
      note: [
        "Your family must be on the SECC / state list. Check with your Aadhaar at an Ayushman Mitra desk.",
        "आपका परिवार एसईसीसी / राज्य सूची में होना चाहिए। आधार लेकर आयुष्मान मित्र से जाँच करें।",
        "మీ కుటుంబం ఎస్ఈసీసీ / రాష్ట్ర జాబితాలో ఉండాలి. ఆధార్‌తో ఆయుష్మాన్ మిత్ర వద్ద తనిఖీ చేయండి.",
      ],
      docs: ["aadhaar", "ration", "mobile"],
      mode: "hospital",
      url: "https://pmjay.gov.in",
      w: 4,
    },
  ),
  S(
    "vay-vandana",
    ["health", "social"],
    ["Ayushman Vay Vandana (70+)", "आयुष्मान वय वंदना (70+)", "ఆయుష్మాన్ వయ వందన (70+)"],
    [
      "₹5 lakh free health cover for every citizen aged 70 and above, any income",
      "70 वर्ष और उससे अधिक उम्र के हर नागरिक को ₹5 लाख का मुफ़्त स्वास्थ्य कवर",
      "70 ఏళ్లు పైబడిన ప్రతి పౌరునికి ఆదాయంతో సంబంధం లేకుండా ₹5 లక్షల ఉచిత ఆరోగ్య రక్షణ",
    ],
    [age(70)],
    {
      docs: ["aadhaar", "age", "mobile"],
      mode: "online",
      url: "https://beneficiary.nha.gov.in",
      w: 4,
    },
  ),
  S(
    "jsy",
    ["health", "women"],
    ["Janani Suraksha Yojana", "जननी सुरक्षा योजना", "జననీ సురక్షా యోజన"],
    [
      "Cash help for delivering your baby in a government or approved hospital",
      "सरकारी या मान्य अस्पताल में प्रसव कराने पर नकद सहायता",
      "ప్రభుత్వ లేదా గుర్తింపు పొందిన ఆసుపత్రిలో ప్రసవానికి నగదు సాయం",
    ],
    [oneOf("gender", "female"), yes("pregnant")],
    {
      any: [[yes("bpl")], [oneOf("category", "sc")], [oneOf("category", "st")]],
      note: [
        "In some states every woman is covered.",
        "कुछ राज्यों में सभी महिलाएँ पात्र हैं।",
        "కొన్ని రాష్ట్రాల్లో అందరు మహిళలకూ వర్తిస్తుంది.",
      ],
      docs: ["aadhaar", "pregnancy", "bank", "ration"],
      mode: "hospital",
      w: 2,
    },
  ),
  S(
    "pmmvy",
    ["women", "health"],
    ["PM Matru Vandana Yojana", "पीएम मातृ वंदना योजना", "పీఎం మాతృ వందన యోజన"],
    [
      "₹5,000 in instalments for pregnant and new mothers (₹6,000 for a second girl child)",
      "गर्भवती और नई माताओं को किस्तों में ₹5,000 (दूसरी बेटी पर ₹6,000)",
      "గర్భిణులు, కొత్త తల్లులకు విడతల్లో ₹5,000 (రెండో ఆడపిల్లకు ₹6,000)",
    ],
    [oneOf("gender", "female"), yes("pregnant"), age(19)],
    {
      note: [
        "Not for women who get paid maternity leave from a government job.",
        "सरकारी नौकरी में सवेतन मातृत्व अवकाश पाने वाली महिलाओं के लिए नहीं।",
        "ప్రభుత్వ ఉద్యోగంలో వేతనంతో ప్రసూతి సెలవు పొందే మహిళలకు కాదు.",
      ],
      docs: ["aadhaar", "pregnancy", "bank"],
      mode: "hospital",
      url: "https://pmmvy.wcd.gov.in",
      w: 3,
    },
  ),
  S(
    "jan-aushadhi",
    ["health"],
    ["Jan Aushadhi Kendra (cheap medicines)", "जन औषधि केंद्र (सस्ती दवाइयाँ)", "జన ఔషధి కేంద్రం (చౌక మందులు)"],
    [
      "Quality generic medicines at 50–90% lower prices, for everyone",
      "सबके लिए गुणवत्ता वाली जेनेरिक दवाइयाँ 50–90% कम दाम पर",
      "అందరికీ నాణ్యమైన జనరిక్ మందులు 50–90% తక్కువ ధరకు",
    ],
    [],
    { docs: [], mode: "visit", url: "https://janaushadhi.gov.in", w: 1 },
  ),
  S(
    "adip",
    ["disability", "health"],
    ["ADIP (free aids for disabled)", "एडीआईपी (दिव्यांगों को मुफ़्त उपकरण)", "ఏడీఐపీ (వికలాంగులకు ఉచిత పరికరాలు)"],
    [
      "Free wheelchair, tricycle, hearing aid and other aids",
      "मुफ़्त व्हीलचेयर, तिपहिया साइकिल, सुनने की मशीन और अन्य उपकरण",
      "ఉచిత వీల్‌చైర్, ట్రైసైకిల్, వినికిడి యంత్రం, ఇతర పరికరాలు",
    ],
    [yes("disability"), inc(2.7)],
    {
      docs: ["disability", "aadhaar", "income", "photo"],
      mode: "office",
      url: "https://disabilityaffairs.gov.in",
      w: 2,
    },
  ),
  S(
    "aarogyasri-ts",
    ["health"],
    ["Aarogyasri (Telangana)", "आरोग्यश्री (तेलंगाना)", "ఆరోగ్యశ్రీ (తెలంగాణ)"],
    [
      "Cashless treatment up to ₹10 lakh per family every year",
      "हर परिवार को हर साल ₹10 लाख तक कैशलेस इलाज",
      "ప్రతి కుటుంబానికి ఏడాదికి ₹10 లక్షల వరకు నగదు రహిత చికిత్స",
    ],
    [oneOf("state", "telangana"), yes("bpl")],
    {
      docs: ["aadhaar", "ration"],
      mode: "hospital",
      url: "https://www.aarogyasri.telangana.gov.in",
      w: 3,
      state: true,
    },
  ),
  S(
    "aarogyasri-ap",
    ["health"],
    ["Dr NTR Vaidya Seva / Aarogyasri (Andhra Pradesh)", "डॉ एनटीआर वैद्य सेवा / आरोग्यश्री (आंध्र प्रदेश)", "డా. ఎన్టీఆర్ వైద్య సేవ / ఆరోగ్యశ్రీ (ఆంధ్రప్రదేశ్)"],
    [
      "Cashless treatment for families with income up to ₹5 lakh",
      "₹5 लाख तक आय वाले परिवारों को कैशलेस इलाज",
      "₹5 లక్షల వరకు ఆదాయం ఉన్న కుటుంబాలకు నగదు రహిత చికిత్స",
    ],
    [oneOf("state", "andhra"), inc(5)],
    { docs: ["aadhaar", "ration"], mode: "hospital", w: 3, state: true },
  ),

  /* ============================ HOUSING ============================ */
  S(
    "pmay-g",
    ["housing"],
    ["PM Awas Yojana – Gramin", "पीएम आवास योजना – ग्रामीण", "పీఎం ఆవాస్ యోజన – గ్రామీణ"],
    [
      "₹1.2 lakh (plains) or ₹1.3 lakh (hills) to build a pucca house, plus toilet money and 90 days of work",
      "पक्का घर बनाने के लिए ₹1.2 लाख (मैदान) या ₹1.3 लाख (पहाड़), साथ में शौचालय और 90 दिन काम",
      "పక్కా ఇల్లు కట్టడానికి ₹1.2 లక్షలు (మైదానం) / ₹1.3 లక్షలు (కొండ ప్రాంతం), మరుగుదొడ్డి సాయం, 90 రోజుల పని",
    ],
    [oneOf("area", "rural"), yes("bpl")],
    {
      note: [
        "You must not own a pucca house and must be on the Awaas+ / SECC list.",
        "आपके पास पक्का घर न हो और आप आवास+ / एसईसीसी सूची में हों।",
        "మీకు పక్కా ఇల్లు ఉండకూడదు, ఆవాస్+ / ఎస్ఈసీసీ జాబితాలో ఉండాలి.",
      ],
      docs: ["aadhaar", "bank", "ration", "photo", "address"],
      mode: "panchayat",
      url: "https://pmayg.nic.in",
      w: 4,
    },
  ),
  S(
    "pmay-u",
    ["housing"],
    ["PM Awas Yojana – Urban 2.0", "पीएम आवास योजना – शहरी 2.0", "పీఎం ఆవాస్ యోజన – పట్టణ 2.0"],
    [
      "Up to ₹2.5 lakh help to buy, build or rent a home for urban families",
      "शहरी परिवारों को घर खरीदने, बनाने या किराए पर लेने में ₹2.5 लाख तक मदद",
      "పట్టణ కుటుంబాలకు ఇల్లు కొనడానికి, కట్టడానికి, అద్దెకు తీసుకోవడానికి ₹2.5 లక్షల వరకు సాయం",
    ],
    [oneOf("area", "urban"), inc(9), age(18)],
    {
      note: [
        "Your family must not own a pucca house. Family income up to ₹9 lakh.",
        "आपके परिवार के पास पक्का घर न हो। पारिवारिक आय ₹9 लाख तक।",
        "మీ కుటుంబానికి పక్కా ఇల్లు ఉండకూడదు. కుటుంబ ఆదాయం ₹9 లక్షల వరకు.",
      ],
      docs: ["aadhaar", "income", "bank", "address"],
      mode: "online",
      url: "https://pmaymis.gov.in",
      w: 3,
    },
  ),
  S(
    "indiramma",
    ["housing"],
    ["Indiramma Housing (Telangana)", "इंदिरम्मा आवास (तेलंगाना)", "ఇందిరమ్మ ఇళ్లు (తెలంగాణ)"],
    [
      "₹5 lakh help to build a house for poor families who own a plot",
      "अपना प्लॉट रखने वाले गरीब परिवारों को घर बनाने के लिए ₹5 लाख की मदद",
      "సొంత స్థలం ఉన్న పేద కుటుంబాలకు ఇల్లు కట్టడానికి ₹5 లక్షల సాయం",
    ],
    [oneOf("state", "telangana"), yes("bpl")],
    {
      note: [
        "You need your own house site. SC and ST families get first priority.",
        "आपके पास अपना मकान स्थल होना चाहिए। एससी/एसटी परिवारों को प्राथमिकता।",
        "మీకు సొంత ఇంటి స్థలం ఉండాలి. ఎస్సీ, ఎస్టీ కుటుంబాలకు ముందు ప్రాధాన్యత.",
      ],
      docs: ["aadhaar", "ration", "address", "photo"],
      mode: "office",
      w: 3,
      state: true,
    },
  ),

  /* ============================ PENSION, FOOD & INSURANCE ============================ */
  S(
    "pmjjby",
    ["social"],
    ["PM Jeevan Jyoti Bima", "पीएम जीवन ज्योति बीमा", "పీఎం జీవన్ జ్యోతి బీమా"],
    [
      "₹2 lakh life insurance for only ₹436 a year",
      "केवल ₹436 सालाना में ₹2 लाख का जीवन बीमा",
      "కేవలం ఏడాదికి ₹436తో ₹2 లక్షల జీవిత బీమా",
    ],
    [age(18, 50)],
    {
      note: [
        "You need a bank account; the premium is auto-debited.",
        "बैंक खाता ज़रूरी है; प्रीमियम अपने-आप कटता है।",
        "బ్యాంక్ ఖాతా అవసరం; ప్రీమియం ఆటోమేటిక్‌గా కట్ అవుతుంది.",
      ],
      docs: ["aadhaar", "bank", "mobile"],
      mode: "bank",
      url: "https://jansuraksha.gov.in",
      w: 2,
    },
  ),
  S(
    "pmsby",
    ["social"],
    ["PM Suraksha Bima", "पीएम सुरक्षा बीमा", "పీఎం సురక్ష బీమా"],
    [
      "₹2 lakh accident insurance for only ₹20 a year",
      "केवल ₹20 सालाना में ₹2 लाख का दुर्घटना बीमा",
      "కేవలం ఏడాదికి ₹20తో ₹2 లక్షల ప్రమాద బీమా",
    ],
    [age(18, 70)],
    {
      docs: ["aadhaar", "bank", "mobile"],
      mode: "bank",
      url: "https://jansuraksha.gov.in",
      w: 2,
    },
  ),
  S(
    "apy",
    ["social"],
    ["Atal Pension Yojana", "अटल पेंशन योजना", "అటల్ పెన్షన్ యోజన"],
    [
      "Fixed pension of ₹1,000 to ₹5,000 a month after age 60",
      "60 वर्ष के बाद ₹1,000 से ₹5,000 तक तय मासिक पेंशन",
      "60 ఏళ్ల తర్వాత నెలకు ₹1,000 నుండి ₹5,000 వరకు నిర్ణీత పింఛను",
    ],
    [age(18, 40)],
    {
      note: [
        "Not for income-tax payers. You need a bank account.",
        "आयकर दाताओं के लिए नहीं। बैंक खाता ज़रूरी है।",
        "ఆదాయపు పన్ను చెల్లింపుదారులకు కాదు. బ్యాంక్ ఖాతా అవసరం.",
      ],
      docs: ["aadhaar", "bank", "mobile"],
      mode: "bank",
      url: "https://jansuraksha.gov.in",
      w: 2,
    },
  ),
  S(
    "nfsa",
    ["social"],
    ["Free ration (PM Garib Kalyan Anna Yojana)", "मुफ़्त राशन (पीएम गरीब कल्याण अन्न योजना)", "ఉచిత రేషన్ (పీఎం గరీబ్ కళ్యాణ్ అన్న యోజన)"],
    [
      "5 kg free grain per person every month on your ration card",
      "राशन कार्ड पर हर व्यक्ति को हर महीने 5 किलो मुफ़्त अनाज",
      "రేషన్ కార్డుపై ప్రతి వ్యక్తికి నెలకు 5 కిలోల ఉచిత ధాన్యం",
    ],
    [yes("bpl")],
    { docs: ["aadhaar", "ration", "photo", "address"], mode: "office", url: "https://nfsa.gov.in", w: 3 },
  ),
  S(
    "aay",
    ["social"],
    ["Antyodaya Anna Yojana", "अंत्योदय अन्न योजना", "అంత్యోదయ అన్న యోజన"],
    [
      "35 kg grain a month per family at ₹1–3 per kg for the poorest families",
      "सबसे गरीब परिवारों को हर महीने 35 किलो अनाज ₹1–3 प्रति किलो पर",
      "అత్యంత పేద కుటుంబాలకు నెలకు 35 కిలోల ధాన్యం కిలో ₹1–3కి",
    ],
    [yes("bpl")],
    {
      any: [[occ("labour", "artisan", "farmer")], [yes("widow")], [yes("disability")], [age(60)]],
      note: [
        "Yellow ration card for the poorest of the poor.",
        "सबसे गरीब परिवारों के लिए पीला राशन कार्ड।",
        "అత్యంత పేదలకు పసుపు రేషన్ కార్డు.",
      ],
      docs: ["ration", "aadhaar", "income"],
      mode: "office",
      w: 2,
    },
  ),
  S(
    "ignoaps",
    ["social"],
    ["Old-age pension (IGNOAPS)", "वृद्धावस्था पेंशन (इंदिरा गांधी राष्ट्रीय)", "వృద్ధాప్య పింఛను (ఇందిరా గాంధీ జాతీయ)"],
    [
      "₹200–500 a month central pension for poor elders (states add more)",
      "गरीब बुज़ुर्गों को ₹200–500 मासिक केंद्रीय पेंशन (राज्य और जोड़ते हैं)",
      "పేద వృద్ధులకు నెలకు ₹200–500 కేంద్ర పింఛను (రాష్ట్రాలు అదనంగా ఇస్తాయి)",
    ],
    [age(60), yes("bpl")],
    { docs: PENSION_DOCS, mode: "panchayat", url: "https://nsap.nic.in", w: 3 },
  ),
  S(
    "ignwps",
    ["social", "women"],
    ["Widow pension (IGNWPS)", "विधवा पेंशन (इंदिरा गांधी राष्ट्रीय)", "వితంతు పింఛను (ఇందిరా గాంధీ జాతీయ)"],
    [
      "₹300 a month central pension for poor widows (states add more)",
      "गरीब विधवाओं को ₹300 मासिक केंद्रीय पेंशन (राज्य और जोड़ते हैं)",
      "పేద వితంతువులకు నెలకు ₹300 కేంద్ర పింఛను (రాష్ట్రాలు అదనంగా ఇస్తాయి)",
    ],
    [oneOf("gender", "female"), yes("widow"), age(40, 79), yes("bpl")],
    { docs: [...PENSION_DOCS, "address"], mode: "panchayat", url: "https://nsap.nic.in", w: 3 },
  ),
  S(
    "igndps",
    ["social", "disability"],
    ["Disability pension (IGNDPS)", "दिव्यांग पेंशन (इंदिरा गांधी राष्ट्रीय)", "వికలాంగ పింఛను (ఇందిరా గాంధీ జాతీయ)"],
    [
      "₹300 a month central pension for people with severe disability (states add more)",
      "गंभीर दिव्यांगता वालों को ₹300 मासिक केंद्रीय पेंशन (राज्य और जोड़ते हैं)",
      "తీవ్ర వైకల్యం ఉన్నవారికి నెలకు ₹300 కేంద్ర పింఛను (రాష్ట్రాలు అదనంగా ఇస్తాయి)",
    ],
    [yes("disability"), age(18, 79), yes("bpl")],
    {
      note: [
        "Disability of 80% or more.",
        "80% या अधिक दिव्यांगता।",
        "80% లేదా అంతకంటే ఎక్కువ వైకల్యం.",
      ],
      docs: ["disability", "aadhaar", "age", "bank", "ration"],
      mode: "panchayat",
      url: "https://nsap.nic.in",
      w: 3,
    },
  ),
  S(
    "jan-dhan",
    ["social", "business"],
    ["PM Jan Dhan bank account", "पीएम जन धन बैंक खाता", "పీఎం జన్ ధన్ బ్యాంక్ ఖాతా"],
    [
      "Zero-balance bank account with RuPay card and ₹2 lakh accident cover",
      "रुपे कार्ड और ₹2 लाख दुर्घटना कवर के साथ ज़ीरो बैलेंस खाता",
      "రూపే కార్డు, ₹2 లక్షల ప్రమాద రక్షణతో జీరో బ్యాలెన్స్ ఖాతా",
    ],
    [age(10)],
    {
      note: [
        "Only if you do not have a bank account yet.",
        "केवल तभी जब आपका बैंक खाता न हो।",
        "మీకు ఇంకా బ్యాంక్ ఖాతా లేకపోతేనే.",
      ],
      docs: ["aadhaar", "photo", "mobile", "address"],
      mode: "bank",
      url: "https://pmjdy.gov.in",
      w: 2,
    },
  ),
  S(
    "vayoshri",
    ["social", "health"],
    ["Rashtriya Vayoshri Yojana", "राष्ट्रीय वयोश्री योजना", "రాష్ట్రీయ వయోశ్రీ యోజన"],
    [
      "Free spectacles, hearing aids, walking sticks and wheelchairs for poor elders",
      "गरीब बुज़ुर्गों को मुफ़्त चश्मा, सुनने की मशीन, छड़ी और व्हीलचेयर",
      "పేద వృద్ధులకు ఉచిత కళ్లజోడు, వినికిడి యంత్రం, కర్ర, వీల్‌చైర్",
    ],
    [age(60), yes("bpl")],
    { docs: ["aadhaar", "age", "ration", "photo"], mode: "office", w: 1 },
  ),
  S(
    "ts-cheyutha",
    ["social"],
    ["Aasara / Cheyutha pension (Telangana)", "आसरा / चेयूता पेंशन (तेलंगाना)", "ఆసరా / చేయూత పింఛను (తెలంగాణ)"],
    [
      "Monthly pension for poor elders, widows and disabled people",
      "गरीब बुज़ुर्गों, विधवाओं और दिव्यांगों को मासिक पेंशन",
      "పేద వృద్ధులు, వితంతువులు, వికలాంగులకు నెలవారీ పింఛను",
    ],
    [oneOf("state", "telangana"), yes("bpl")],
    {
      any: [[age(57)], [yes("widow")], [yes("disability")]],
      docs: ["aadhaar", "age", "ration", "bank"],
      mode: "office",
      w: 3,
      state: true,
    },
  ),
  S(
    "ap-ntr-bharosa",
    ["social"],
    ["NTR Bharosa pension (Andhra Pradesh)", "एनटीआर भरोसा पेंशन (आंध्र प्रदेश)", "ఎన్టీఆర్ భరోసా పింఛను (ఆంధ్రప్రదేశ్)"],
    [
      "₹4,000 a month for poor elders and widows, ₹6,000 for disabled people",
      "गरीब बुज़ुर्गों और विधवाओं को ₹4,000 मासिक, दिव्यांगों को ₹6,000",
      "పేద వృద్ధులు, వితంతువులకు నెలకు ₹4,000, వికలాంగులకు ₹6,000",
    ],
    [oneOf("state", "andhra"), yes("bpl")],
    {
      any: [[age(60)], [yes("widow")], [yes("disability")]],
      docs: ["aadhaar", "age", "ration", "bank"],
      mode: "office",
      w: 3,
      state: true,
    },
  ),
  S(
    "gruha-jyothi",
    ["social", "housing"],
    ["Gruha Jyothi (Telangana)", "गृह ज्योति (तेलंगाना)", "గృహ జ్యోతి (తెలంగాణ)"],
    [
      "Free electricity up to 200 units a month",
      "हर महीने 200 यूनिट तक मुफ़्त बिजली",
      "నెలకు 200 యూనిట్ల వరకు ఉచిత విద్యుత్",
    ],
    [oneOf("state", "telangana"), yes("bpl")],
    { docs: ["ration", "aadhaar", "address"], mode: "office", w: 2, state: true },
  ),

  /* ============================ WOMEN & CHILDREN ============================ */
  S(
    "pm-ujjwala",
    ["women", "social"],
    ["PM Ujjwala Yojana", "पीएम उज्ज्वला योजना", "పీఎం ఉజ్వల యోజన"],
    [
      "Free LPG gas connection with stove for women of poor families",
      "गरीब परिवारों की महिलाओं को चूल्हे के साथ मुफ़्त एलपीजी कनेक्शन",
      "పేద కుటుంబాల మహిళలకు స్టవ్‌తో ఉచిత గ్యాస్ కనెక్షన్",
    ],
    [oneOf("gender", "female"), age(18), yes("bpl")],
    {
      docs: ["aadhaar", "ration", "bank", "photo", "address"],
      mode: "office",
      url: "https://www.pmuy.gov.in",
      w: 3,
    },
  ),
  S(
    "ssy",
    ["women", "social"],
    ["Sukanya Samriddhi Yojana", "सुकन्या समृद्धि योजना", "సుకన్య సమృద్ధి యోజన"],
    [
      "High-interest (about 8.2%), tax-free savings for your daughter's future",
      "बेटी के भविष्य के लिए ऊँचे ब्याज (लगभग 8.2%) वाली कर-मुक्त बचत",
      "కుమార్తె భవిష్యత్తు కోసం అధిక వడ్డీ (సుమారు 8.2%) పన్ను రహిత పొదుపు",
    ],
    [yes("daughter")],
    {
      note: [
        "Daughter must be under 10 years. Open the account at a post office or bank.",
        "बेटी 10 वर्ष से कम की हो। डाकघर या बैंक में खाता खोलें।",
        "కుమార్తె వయసు 10 ఏళ్ల లోపు ఉండాలి. పోస్టాఫీసు లేదా బ్యాంకులో ఖాతా తెరవండి.",
      ],
      docs: ["aadhaar", "age", "photo", "address"],
      mode: "bank",
      url: "https://www.indiapost.gov.in",
      w: 3,
    },
  ),
  S(
    "drone-didi",
    ["women", "jobs"],
    ["Namo Drone Didi", "नमो ड्रोन दीदी", "నమో డ్రోన్ దీదీ"],
    [
      "Women's self-help groups get a farm drone (80% subsidy, up to ₹8 lakh) and training to earn",
      "महिला स्वयं सहायता समूहों को कृषि ड्रोन (80% सब्सिडी, ₹8 लाख तक) और कमाई का प्रशिक्षण",
      "మహిళా స్వయం సహాయక సంఘాలకు వ్యవసాయ డ్రోన్ (80% సబ్సిడీ, ₹8 లక్షల వరకు), సంపాదన శిక్షణ",
    ],
    [oneOf("gender", "female"), oneOf("area", "rural"), age(18, 50)],
    {
      note: [
        "You must be a member of a women's self-help group.",
        "आप महिला स्वयं सहायता समूह की सदस्य हों।",
        "మీరు మహిళా స్వయం సహాయక సంఘ సభ్యురాలు అయి ఉండాలి.",
      ],
      docs: ["aadhaar", "bank", "photo"],
      mode: "office",
      w: 1,
    },
  ),
  S(
    "oscs",
    ["women"],
    ["One Stop Centre & Women Helpline 181", "वन स्टॉप सेंटर और महिला हेल्पलाइन 181", "వన్ స్టాప్ సెంటర్, మహిళా హెల్ప్‌లైన్ 181"],
    [
      "Free shelter, police, legal and medical help for women facing violence. Call 181.",
      "हिंसा झेल रही महिलाओं को मुफ़्त आश्रय, पुलिस, कानूनी और चिकित्सा मदद। 181 पर कॉल करें।",
      "హింసను ఎదుర్కొనే మహిళలకు ఉచిత ఆశ్రయం, పోలీసు, న్యాయ, వైద్య సహాయం. 181కు కాల్ చేయండి.",
    ],
    [oneOf("gender", "female")],
    { docs: [], mode: "visit", w: 1 },
  ),
  S(
    "icds",
    ["women", "health"],
    ["Poshan 2.0 (Anganwadi nutrition)", "पोषण 2.0 (आंगनवाड़ी पोषण)", "పోషణ్ 2.0 (అంగన్‌వాడీ పోషణ)"],
    [
      "Free nutrition food and health check-ups for children under 6, pregnant and nursing mothers",
      "6 साल से छोटे बच्चों, गर्भवती और धात्री माताओं को मुफ़्त पोषण आहार और जाँच",
      "6 ఏళ్ల లోపు పిల్లలు, గర్భిణులు, బాలింతలకు ఉచిత పోషకాహారం, ఆరోగ్య పరీక్షలు",
    ],
    [],
    {
      any: [[age(0, 6)], [yes("pregnant")]],
      docs: ["aadhaar", "pregnancy"],
      mode: "hospital",
      w: 2,
    },
  ),
  S(
    "stree-shakti",
    ["women"],
    ["Stree Shakti free bus (Andhra Pradesh)", "स्त्री शक्ति मुफ़्त बस (आंध्र प्रदेश)", "స్త్రీ శక్తి ఉచిత బస్సు (ఆంధ్రప్రదేశ్)"],
    [
      "Free travel for women in Andhra Pradesh state buses",
      "आंध्र प्रदेश की राज्य बसों में महिलाओं को मुफ़्त यात्रा",
      "ఆంధ్రప్రదేశ్ ఆర్టీసీ బస్సుల్లో మహిళలకు ఉచిత ప్రయాణం",
    ],
    [oneOf("state", "andhra"), oneOf("gender", "female", "other")],
    {
      note: [
        "Show Aadhaar or any valid ID card.",
        "आधार या कोई मान्य पहचान पत्र दिखाएँ।",
        "ఆధార్ లేదా ఏదైనా చెల్లుబాటు అయ్యే ఐడీ చూపించండి.",
      ],
      docs: ["aadhaar"],
      mode: "visit",
      w: 2,
      state: true,
    },
  ),
  S(
    "mahalakshmi-ts",
    ["women"],
    ["Mahalakshmi free bus (Telangana)", "महालक्ष्मी मुफ़्त बस (तेलंगाना)", "మహాలక్ష్మి ఉచిత బస్సు (తెలంగాణ)"],
    [
      "Free travel for women and girls in Telangana state buses",
      "तेलंगाना की राज्य बसों में महिलाओं और लड़कियों को मुफ़्त यात्रा",
      "తెలంగాణ ఆర్టీసీ బస్సుల్లో మహిళలు, బాలికలకు ఉచిత ప్రయాణం",
    ],
    [oneOf("state", "telangana"), oneOf("gender", "female", "other")],
    {
      note: [
        "Show Aadhaar or any valid ID card.",
        "आधार या कोई मान्य पहचान पत्र दिखाएँ।",
        "ఆధార్ లేదా ఏదైనా చెల్లుబాటు అయ్యే ఐడీ చూపించండి.",
      ],
      docs: ["aadhaar"],
      mode: "visit",
      w: 2,
      state: true,
    },
  ),
  S(
    "kalyana-lakshmi",
    ["women", "inclusion"],
    ["Kalyana Lakshmi / Shaadi Mubarak (Telangana)", "कल्याण लक्ष्मी / शादी मुबारक (तेलंगाना)", "కళ్యాణ లక్ష్మి / షాదీ ముబారక్ (తెలంగాణ)"],
    [
      "₹1,00,116 help for a girl's marriage in poor SC, ST, BC or minority families",
      "गरीब एससी, एसटी, बीसी या अल्पसंख्यक परिवारों में लड़की की शादी पर ₹1,00,116 की मदद",
      "పేద ఎస్సీ, ఎస్టీ, బీసీ, మైనారిటీ కుటుంబాల్లో అమ్మాయి పెళ్లికి ₹1,00,116 సాయం",
    ],
    [oneOf("state", "telangana"), oneOf("gender", "female"), age(18), inc(2)],
    {
      any: [[oneOf("category", "sc")], [oneOf("category", "st")], [oneOf("category", "obc")], [yes("minority")]],
      note: [
        "Apply before the marriage. The bride must be 18 or older.",
        "शादी से पहले आवेदन करें। दुल्हन 18 वर्ष या अधिक की हो।",
        "పెళ్లికి ముందే దరఖాస్తు చేయండి. వధువు వయసు 18 లేదా అంతకంటే ఎక్కువ ఉండాలి.",
      ],
      docs: ["aadhaar", "caste", "income", "age", "bank", "marriage"],
      mode: "office",
      w: 3,
      state: true,
    },
  ),
  S(
    "talliki-vandanam",
    ["women", "edu"],
    ["Talliki Vandanam (Andhra Pradesh)", "तल्लिकी वंदनम (आंध्र प्रदेश)", "తల్లికి వందనం (ఆంధ్రప్రదేశ్)"],
    [
      "₹15,000 a year for mothers whose children go to school",
      "जिनके बच्चे स्कूल जाते हैं उन माताओं को सालाना ₹15,000",
      "పిల్లలు బడికి వెళ్తున్న తల్లులకు ఏడాదికి ₹15,000",
    ],
    [oneOf("state", "andhra"), oneOf("gender", "female"), yes("schoolChild")],
    {
      note: [
        "Your child needs at least 75% school attendance.",
        "आपके बच्चे की स्कूल में कम से कम 75% उपस्थिति हो।",
        "మీ పిల్లల బడి హాజరు కనీసం 75% ఉండాలి.",
      ],
      docs: ["aadhaar", "bank", "ration", "school"],
      mode: "office",
      w: 3,
      state: true,
    },
  ),

  /* ============================ DISABILITY ============================ */
  S(
    "nhfdc",
    ["disability", "business"],
    ["NHFDC loans for disabled", "एनएचएफडीसी ऋण (दिव्यांग)", "ఎన్‌హెచ్‌ఎఫ్‌డీసీ రుణాలు (వికలాంగులు)"],
    [
      "Low-interest loans for self-employment of persons with disability",
      "दिव्यांग व्यक्तियों को स्वरोज़गार के लिए कम ब्याज पर ऋण",
      "వికలాంగులకు స్వయం ఉపాధి కోసం తక్కువ వడ్డీ రుణాలు",
    ],
    [yes("disability"), age(18, 60)],
    { docs: ["disability", "aadhaar", "income", "photo", "bank"], mode: "office", url: "https://nhfdc.nic.in", w: 1 },
  ),
  S(
    "pwd-scholarship",
    ["disability", "edu"],
    ["Scholarships for students with disability", "दिव्यांग छात्रों के लिए छात्रवृत्ति", "వికలాంగ విద్యార్థులకు స్కాలర్‌షిప్"],
    [
      "Pre-matric, post-matric and top-class scholarships for students with disability",
      "दिव्यांग छात्रों के लिए प्री-मैट्रिक, पोस्ट-मैट्रिक और टॉप क्लास छात्रवृत्ति",
      "వికలాంగ విద్యార్థులకు ప్రీ-మెట్రిక్, పోస్ట్-మెట్రిక్, టాప్ క్లాస్ స్కాలర్‌షిప్",
    ],
    [yes("disability"), occ("student"), inc(2.5)],
    { docs: ["disability", ...SCHOLAR_DOCS], mode: "school", url: NSP, w: 2 },
  ),
  S(
    "pwd-jobs",
    ["disability", "jobs"],
    ["Reservation in government jobs for disabled", "दिव्यांगों के लिए सरकारी नौकरी में आरक्षण", "వికలాంగులకు ప్రభుత్వ ఉద్యోగాల్లో రిజర్వేషన్"],
    [
      "4% of government posts are reserved for persons with benchmark disability",
      "सरकारी पदों का 4% बेंचमार्क दिव्यांगता वाले व्यक्तियों के लिए आरक्षित",
      "ప్రభుత్వ పోస్టుల్లో 4% బెంచ్‌మార్క్ వైకల్యం ఉన్నవారికి రిజర్వ్",
    ],
    [yes("disability"), age(18)],
    {
      note: [
        "You need a UDID card.",
        "आपके पास यूडीआईडी कार्ड होना चाहिए।",
        "మీ దగ్గర యూడీఐడీ కార్డు ఉండాలి.",
      ],
      docs: ["disability", "aadhaar", "age"],
      mode: "online",
      url: "https://www.swavlambancard.gov.in",
      w: 2,
    },
  ),
];

export const SCHEME_BY_ID: Record<string, Scheme> = Object.fromEntries(SCHEMES.map((s) => [s.id, s]));
