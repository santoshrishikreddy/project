import type { Category, Field, Gender, Lang, Occupation, StateKey, StudentLevel } from "./types";

/* ------------------------------------------------------------------ */
/* Multilingual (English / Hindi / Telugu, plus romanised Hinglish)     */
/* natural-language understanding for short spoken answers.             */
/* Handles vague ("around 40"), contradictory ("yes… no"), self-        */
/* correcting ("25, sorry, 35") and multi-fact ("Ravi, 45, farmer").    */
/* ------------------------------------------------------------------ */

export type Intent = "yes" | "no" | "unknown" | "skip" | "repeat" | "results" | "more" | "restart" | "switch";
export type Expected = Field | "name" | "yn" | null;

export interface Parsed {
  intent?: Intent;
  switchTo?: Lang;
  slots: Partial<Record<Field, unknown>>;
  ambiguous?: { field: Field; values: unknown[] };
  name?: string;
  yn?: boolean;
  vagueAge?: boolean;
  corrected: boolean;
}

/* ----------------------------- helpers ----------------------------- */

const DIGITS: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
  "౦": "0", "౧": "1", "౨": "2", "౩": "3", "౪": "4", "౫": "5", "౬": "6", "౭": "7", "౮": "8", "౯": "9",
};

export function normalize(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFC")
    .replace(/[०-९౦-౯]/g, (c) => DIGITS[c] ?? c)
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”"।॥.,!?;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const isLatin = (s: string) => /^[\x20-\x7e]+$/.test(s);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Pattern syntax: "abc" = word-prefix (Latin) / substring (Indic); "abc!" = whole word; "=abc" = whole token. */
function matchPos(norm: string, pat: string): number {
  if (pat.startsWith("=")) {
    const want = pat.slice(1);
    let idx = 0;
    let last = -1;
    for (const tok of norm.split(" ")) {
      if (tok === want) last = idx;
      idx += tok.length + 1;
    }
    return last;
  }
  if (isLatin(pat)) {
    const exact = pat.endsWith("!");
    const body = esc(exact ? pat.slice(0, -1) : pat);
    const re = new RegExp(`(^|[^a-z0-9])${body}${exact ? "($|[^a-z0-9])" : ""}`, "g");
    let last = -1;
    let m: RegExpExecArray | null;
    while ((m = re.exec(norm))) {
      last = m.index + m[1].length;
      if (m[0].length === 0) re.lastIndex++;
    }
    return last;
  }
  return norm.lastIndexOf(pat);
}

function lastPos(norm: string, pats: string[]): number {
  let best = -1;
  for (const p of pats) best = Math.max(best, matchPos(norm, p));
  return best;
}

interface Lex {
  s: string[]; // strong: always applied
  w?: string[]; // weak: only when this field is the one being asked
}

function findAll<T extends string>(
  norm: string,
  lex: Record<T, Lex>,
  field: Field,
  expected: Expected,
): { key: T; pos: number }[] {
  const hits: { key: T; pos: number }[] = [];
  for (const key of Object.keys(lex) as T[]) {
    const l = lex[key];
    let pos = lastPos(norm, l.s);
    if (l.w && expected === field) pos = Math.max(pos, lastPos(norm, l.w));
    if (pos >= 0) hits.push({ key, pos });
  }
  return hits;
}

/* ----------------------------- lexicons ----------------------------- */

const GENDER: Record<Gender, Lex> = {
  female: {
    s: ["female!", "woman!", "women!", "girl!", "lady!", "mahila", "ladki", "aurat", "महिला", "औरत", "लड़की", "स्त्री", "ఆడ", "స్త్రీ", "మహిళ", "అమ్మాయి", "ఆడది"],
  },
  male: {
    s: ["male!", "man!", "men!", "boy!", "gentleman", "purush", "aadmi", "ladka", "आदमी", "पुरुष", "लड़का", "मर्द", "మగ", "పురుష", "అబ్బాయి"],
  },
  other: {
    s: ["transgender", "trans!", "third gender", "ट्रांसजेंडर", "किन्नर", "ట్రాన్స్", "హిజ్రా"],
    w: ["other!", "others!", "अन्य", "दूसरा", "ఇతర"],
  },
};

const CATEGORY: Record<Category, Lex> = {
  general: {
    s: ["ews!", "unreserved", "सामान्य वर्ग", "ఈడబ్ల్యూఎస్", "అగ్ర కుల"],
    w: ["general!", "open!", "forward", "oc!", "सामान्य", "जनरल", "జనరల్", "ఓసీ", "ఓపెన్"],
  },
  obc: {
    s: ["obc!", "o b c", "other backward", "bc!", "ओबीसी", "अन्य पिछड़ा", "బీసీ", "ఓబీసీ", "వెనుకబడిన"],
    w: ["backward", "पिछड़ा", "पिछड़े", "b c!"],
  },
  sc: {
    s: ["sc!", "scheduled caste", "dalit", "एससी", "अनुसूचित जाति", "दलित", "ఎస్సీ", "షెడ్యూల్డ్ కులం", "దళిత"],
    w: ["s c!"],
  },
  st: {
    s: ["st!", "scheduled tribe", "tribal", "adivasi", "एसटी", "अनुसूचित जनजाति", "आदिवासी", "జనజాతి", "ఎస్టీ", "గిరిజన", "ఆదివాసి"],
    w: ["s t!"],
  },
};

const OCCUPATION: Record<Occupation, Lex> = {
  farmer: { s: ["farm", "cultivat", "kisan", "agricultur", "kheti", "किसान", "खेती", "కిసాన్", "వ్యవసాయ", "రైతు"] },
  student: {
    s: ["student!", "students!", "studying", "i study", "school!", "college!", "पढ़ाई", "पढ़ रहा", "पढ़ रही", "विद्यार्थी", "छात्र", "स्टूडेंट", "చదువుతున్న", "చదువు", "విద్యార్థి", "స్టూడెంట్"],
  },
  labour: {
    s: ["labour", "labor", "daily wage", "coolie", "construction", "mazdoor", "majdoor", "worker!", "मजदूर", "मज़दूर", "दिहाड़ी", "कूली", "కూలీ", "కూలి", "కార్మిక", "దినసరి"],
  },
  artisan: {
    s: ["artisan", "weaver", "potter", "carpenter", "tailor", "blacksmith", "craft", "barber", "cobbler", "mistri", "बुनकर", "कुम्हार", "दर्जी", "बढ़ई", "मिस्त्री", "कारीगर", "लोहार", "నేత", "కుమ్మరి", "వడ్రంగి", "దర్జీ", "చేనేత", "కమ్మరి", "శిల్పి", "చేతివృత్తి"],
  },
  business: {
    s: ["business", "shop!", "shopkeeper", "vendor", "trader", "hawker", "selling", "dukan", "vyapar", "दुकान", "व्यापार", "व्यवसाय", "ठेला", "रेहड़ी", "वेंडर", "వ్యాపార", "దుకాణం"],
  },
  salaried: {
    s: ["salaried", "employee", "private job", "government job", "govt job", "teacher!", "job!", "naukri", "नौकरी", "कर्मचारी", "ఉద్యోగం", "ఉద్యోగి"],
  },
  jobseeker: {
    s: ["unemploy", "jobless", "looking for", "need a job", "need work", "want a job", "want work", "no job", "no work", "searching for", "berozgar", "बेरोजगार", "बेरोज़गार", "नौकरी चाहिए", "काम चाहिए", "काम की तलाश", "నిరుద్యోగి", "ఉద్యోగం లేదు", "పని లేదు", "ఉద్యోగం కావాలి", "పని కావాలి", "పని వెతుక"],
  },
  homemaker: {
    s: ["housewife", "homemaker", "home maker", "household work", "house wife", "गृहिणी", "गृहणी", "घर का काम", "ఇల్లాలు", "గృహిణి", "ఇంటి పని"],
  },
  retired: { s: ["retired", "pensioner", "retirement", "सेवानिवृत्त", "रिटायर", "పదవీ విరమణ", "రిటైర్డ్", "రిటైర్"] },
};

const STATE: Record<StateKey, Lex> = {
  telangana: { s: ["telangana", "తెలంగాణ", "तेलंगाना", "hyderabad", "హైదరాబాద్", "warangal", "వరంగల్", "karimnagar", "khammam", "nizamabad", "nalgonda"] },
  andhra: { s: ["andhra", "ఆంధ్ర", "आंध्र", "vijayawada", "విజయవాడ", "visakha", "విశాఖ", "guntur", "గుంటూరు", "tirupati", "తిరుపతి", "nellore", "kurnool", "కర్నూలు"] },
  other: {
    s: ["maharashtra", "karnataka", "tamil", "kerala", "bihar", "uttar pradesh", "madhya pradesh", "rajasthan", "gujarat", "odisha", "orissa", "bengal", "punjab", "haryana", "delhi", "assam", "jharkhand", "chhattisgarh", "other state", "another state", "महाराष्ट्र", "कर्नाटक", "तमिल", "केरल", "बिहार", "उत्तर प्रदेश", "मध्य प्रदेश", "राजस्थान", "गुजरात", "ओडिशा", "बंगाल", "पंजाब", "हरियाणा", "दिल्ली", "दूसरे राज्य", "दूसरा राज्य", "మహారాష్ట్ర", "కర్ణాటక", "తమిళ", "కేరళ", "బీహార్", "ఉత్తర ప్రదేశ్", "ఇతర రాష్ట్ర"],
  },
};

const AREA: Record<"rural" | "urban", Lex> = {
  rural: { s: ["village", "rural", "gaon", "gram!", "गाँव", "गांव", "ग्रामीण", "పల్లె", "గ్రామం", "గ్రామీణ", "ఊరు"] },
  urban: { s: ["town!", "city", "urban", "municipal", "shahar", "शहर", "नगर", "कस्बा", "పట్టణం", "నగరం", "సిటీ", "టౌన్"] },
};

const LEVEL: Record<StudentLevel, Lex> = {
  college: {
    s: ["college", "degree", "b.tech", "btech", "b tech", "engineering", "iti!", "diploma", "graduat", "polytechnic", "university", "mbbs", "nursing", "कॉलेज", "डिग्री", "आईटीआई", "डिप्लोमा", "इंजीनियरिंग", "కాలేజీ", "డిగ్రీ", "ఐటీఐ", "డిప్లొమా", "ఇంజనీరింగ్", "యూనివర్సిటీ", "పాలిటెక్నిక్"],
  },
  class11_12: {
    s: ["intermediate", "plus two", "plus 2", "+2", "inter!", "11th", "12th", "ग्यारहवीं", "बारहवीं", "इंटर", "ఇంటర్"],
  },
  class9_10: {
    s: ["9th", "10th", "ninth", "tenth", "matric", "ssc!", "नौवीं", "दसवीं", "పదో తరగతి", "పదవ తరగతి", "టెన్త్", "నవమ"],
  },
  class1_8: { s: ["primary", "upper primary", "प्राथमिक", "ప్రాథమిక"] },
};

const MINORITY = ["muslim", "christian", "sikh", "buddhist", "jain!", "parsi", "zoroastrian", "minority", "मुस्लिम", "ईसाई", "सिख", "बौद्ध", "जैन", "पारसी", "अल्पसंख्यक", "ముస్లిం", "క్రైస్తవ", "క్రిస్టియన్", "సిక్కు", "బౌద్ధ", "జైన", "పార్సీ", "మైనారిటీ"];
const DISABILITY = ["disab", "handicap", "divyang", "physically challenged", "wheelchair", "blind!", "deaf!", "विकलांग", "दिव्यांग", "अपंग", "వికలాంగ", "దివ్యాంగ", "అంగవైకల్య"];
const WIDOW = ["widow", "विधवा", "వితంతు"];
const PREGNANT = ["pregnan", "expecting a baby", "गर्भवती", "प्रेग्नेंट", "గర్భవతి", "గర్భిణి"];
const BPL = ["bpl!", "below poverty", "antyodaya", "pink card", "pink ration", "yellow card", "white card", "white ration", "बीपीएल", "गरीबी रेखा", "అంత్యోదయ", "తెల్ల రేషన్", "తెల్ల కార్డు", "పేదరిక"];
const LAND = ["own land", "my land", "have land", "acre", "hectare", "एकड़", "हेक्टेयर", "जमीन है", "ज़मीन है", "ఎకరా", "ఎకరాలు", "పొలం ఉంది", "భూమి ఉంది"];

const NEG = ["no!", "not!", "don't", "do not", "never", "without", "nahi", "nahin", "नहीं", "नही", "లేదు", "కాదు", "లేరు"];

const YES_STRONG = ["yes!", "yeah", "yep", "yup", "sure!", "ok!", "okay", "correct", "right!", "true!", "haan", "haa!", "han!", "ji!", "हाँ", "हां", "जी", "सही", "అవును", "ఔను", "సరే", "అవు", "కరెక్ట్"];
const YES_WEAK = ["i do", "i have", "have!", "do!", "=है", "=हैं", "=हूँ", "=हूं", "=ho", "ఉంది", "ఉన్నాయి", "ఉన్నారు", "ఉన్నది"];
const NO = ["no!", "nope", "not!", "don't", "do not", "never", "nahi", "nahin", "नहीं", "नही", "=ना", "=नो", "నో", "లేదు", "కాదు", "లేవు", "వద్దు", "లేరు", "గలత్"];
const UNKNOWN = ["don't know", "dont know", "do not know", "not sure", "no idea", "unsure", "i forgot", "forgot", "can't say", "cannot say", "maybe!", "not certain", "pata nahi", "pata nahin", "maloom nahi", "पता नहीं", "पता नही", "मालूम नहीं", "मालूम नही", "पक्का नहीं", "याद नहीं", "शायद", "తెలియదు", "తెలీదు", "తెలియట్లేదు", "గుర్తు లేదు", "చెప్పలేను", "బహుశా"];
const SKIP = ["skip", "pass!", "rather not", "don't want to", "do not want to", "prefer not", "not telling", "no comment", "छोड़ो", "छोड़ दो", "नहीं बताना", "नहीं बताऊँगा", "नहीं बताऊंगी", "చెప్పను", "చెప్పడం ఇష్టం లేదు"];
const REPEAT = ["repeat", "say that again", "say again", "once more", "pardon", "didn't understand", "did not understand", "फिर से बोल", "दोबारा", "दुबारा", "दोहराओ", "समझ नहीं आया", "మళ్ళీ చెప్పండి", "మళ్లీ చెప్పండి", "మళ్ళీ చెప్పు", "మళ్లీ చెప్పు", "ఇంకోసారి", "అర్థం కాలేదు"];
const RESULTS = ["show result", "show my", "show scheme", "enough", "stop asking", "that's all", "that is all", "no more question", "done!", "finish", "बस", "परिणाम", "दिखाओ", "योजनाएं दिखाइए", "योजना दिखाओ", "చాలు", "ఫలితాలు", "చూపించు", "చూపించండి"];
const MORE = ["more question", "ask more", "और सवाल", "और प्रश्न", "ఇంకా ప్రశ్నలు", "మరిన్ని ప్రశ్నలు"];
const RESTART = ["start over", "restart", "begin again", "फिर से शुरू", "दोबारा शुरू", "మళ్ళీ మొదలు", "మళ్లీ మొదలు", "కొత్తగా మొదలు"];
const CORRECTION = ["actually", "sorry", "i mean", "no wait", "wait", "correction", "rather", "not that", "oh no", "నిజానికి", "అంటే", "కాదు కాదు", "క్షమించండి", "दरअसल", "मतलब", "सॉरी", "गलती", "नहीं नहीं", "रुको", "ruko", "matlab", "darasal", "galat", "ఆగండి"];

const LANG_WORDS: Record<Lang, string[]> = {
  en: ["english", "अंग्रेजी", "अंग्रेज़ी", "ఇంగ్లీష్", "ఇంగ్లిష్"],
  hi: ["hindi", "हिंदी", "हिन्दी", "హిందీ"],
  te: ["telugu", "तेलुगु", "తెలుగు", "తెలుగులో"],
};

const APPROX = ["around", "about", "approx", "roughly", "nearly", "almost", "close to", "maybe", "perhaps", "something like", "lagbhag", "karib", "kareeb", "shayad", "लगभग", "करीब", "क़रीब", "शायद", "तकरीबन", "దాదాపు", "సుమారు", "బహుశా", "ఇంచుమించు"];
const AGE_WORDS = ["age", "aged", "years", "year", "yrs", "old!", "umr", "saal", "उम्र", "साल", "वर्ष", "वर्षीय", "వయసు", "వయస్సు", "ఏళ్ళు", "ఏళ్లు", "సంవత్సర", "ఏండ్లు"];
const INCOME_CUES = ["income", "earn", "salary", "wage", "lakh", "lac!", "lacs!", "thousand", "rupee", "rs!", "कमाई", "आय", "कमाते", "लाख", "हज़ार", "हजार", "रुपये", "సంపాద", "ఆదాయం", "లక్ష", "వేల", "రూపాయ"];

/* ---------------------------- numbers ------------------------------ */

const EN: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

const HI_LIST =
  "एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस तैंतालीस चौवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उनासी अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे".split(
    " ",
  );

const HI: Record<string, number> = {
  पांच: 5, छः: 6, छे: 6, पन्द्रह: 15, ग्यारा: 11, बारा: 12, तेरा: 13, चौदा: 14, सोला: 16, सत्रा: 17, अठारा: 18, बाइस: 22, तेइस: 23, पचीस: 25, अठाईस: 28, पैंतिस: 35, पैतीस: 35,
  ek: 1, char: 4, paanch: 5, panch: 5, chhe: 6, chhah: 6, saat: 7, aath: 8, nau: 9, das: 10,
  gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15, solah: 16, satrah: 17, atharah: 18, unnis: 19,
  bees: 20, pachis: 25, pachchis: 25, tees: 30, paintis: 35, chalis: 40, chaalis: 40, paintalis: 45, pachas: 50, pachaas: 50,
  pachpan: 55, painsath: 65, sattar: 70, assi: 80, nabbe: 90,
};
HI_LIST.forEach((w, i) => {
  HI[w] = i + 1;
});

const TE: Record<string, number> = {
  ఒకటి: 1, ఒక: 1, రెండు: 2, మూడు: 3, నాలుగు: 4, ఐదు: 5, అయిదు: 5, ఆరు: 6, ఏడు: 7, ఎనిమిది: 8, తొమ్మిది: 9, పది: 10,
  పదకొండు: 11, పన్నెండు: 12, పదమూడు: 13, పద్నాలుగు: 14, పధ్నాలుగు: 14, పదిహేను: 15, పదహారు: 16, పదిహేడు: 17, పద్దెనిమిది: 18, పంతొమ్మిది: 19,
  ఇరవై: 20, ముప్పై: 30, నలభై: 40, యాభై: 50, యభై: 50, ఏభై: 50, అరవై: 60, డెబ్బై: 70, ఎనభై: 80, తొంభై: 90,
};

const WORDS: Record<string, number> = { ...EN, ...HI, ...TE };
const isTens = (n: number) => n >= 20 && n % 10 === 0 && n <= 90;

interface Num {
  v: number;
  pos: number;
  word: boolean;
}

export function extractNumbers(norm: string): Num[] {
  const out: Num[] = [];
  const re = /\d+(?:\.\d+)?|[^\s\d\-–—,]+/gu;
  let m: RegExpExecArray | null;
  let prevIdx = -1;
  let tokIdx = 0;
  while ((m = re.exec(norm))) {
    const tok = m[0];
    const idx = tokIdx++;
    if (/^\d/.test(tok)) {
      out.push({ v: parseFloat(tok), pos: m.index, word: false });
      prevIdx = idx;
      continue;
    }
    const v = WORDS[tok];
    if (v === undefined) continue;
    const last = out[out.length - 1];
    if (last && last.word && isTens(last.v) && v >= 1 && v <= 9 && prevIdx === idx - 1) {
      last.v += v;
    } else {
      out.push({ v, pos: m.index, word: true });
    }
    prevIdx = idx;
  }
  return out;
}

const RANGE_MARK = /between|\bto\b|\d\s*[-–—]\s*\d|के बीच|से .+ (तक|के बीच)|నుండి|నుంచి|మధ్య|\d\s*से\s*\d/u;

interface AgeRes {
  range?: [number, number];
  ambiguous?: number[];
  vague?: boolean;
}

const DECADES: Record<string, number> = {
  twenties: 2, thirties: 3, forties: 4, fifties: 5, sixties: 6, seventies: 7, eighties: 8,
};
const TENS_WORD: Record<string, number> = { twenty: 2, thirty: 3, forty: 4, fifty: 5, sixty: 6, seventy: 7, eighty: 8 };

function clampAge(a: number, b: number): [number, number] {
  return [Math.max(0, Math.round(a)), Math.min(110, Math.round(b))];
}

function parseAge(norm: string, mode: "age" | "name" | "other", corrected: boolean): AgeRes | null {
  const hasAgeWord = lastPos(norm, AGE_WORDS) >= 0 || /(?:i am|i'm|im|मैं|मै|నేను)\s*\d{1,3}(?!\d)/u.test(norm);
  const expectedAge = mode === "age";
  // While asking for a name, a bare number is almost certainly the age ("Ravi, 45, farmer").
  if (!expectedAge && !hasAgeWord && mode !== "name") return null;
  const descriptive = expectedAge || hasAgeWord;

  // decades: "40s", "in my forties", "thirty something", "late 30s"
  const dm = norm.match(/(early|mid|late)?\s*(\d)0s\b/);
  const dw = norm.match(/(early|mid|late)?\s*(twenties|thirties|forties|fifties|sixties|seventies|eighties)/);
  const sm = norm.match(/(twenty|thirty|forty|fifty|sixty|seventy|eighty)\s*(something|odd)/);
  const dec = dm ? Number(dm[2]) : dw ? DECADES[dw[2]] : sm ? TENS_WORD[sm[1]] : undefined;
  if (dec !== undefined) {
    const mod = (dm?.[1] ?? dw?.[1]) as string | undefined;
    const base = dec * 10;
    if (mod === "early") return { range: [base, base + 3] };
    if (mod === "mid") return { range: [base + 4, base + 6] };
    if (mod === "late") return { range: [base + 7, base + 9] };
    return { range: [base, base + 9] };
  }

  const nums = extractNumbers(norm);
  const year = new Date().getFullYear();

  // birth year
  const by = nums.find((n) => !n.word && n.v >= 1900 && n.v <= year);
  if (by) {
    const a = year - by.v;
    if (a >= 0 && a <= 110) return { range: [a, a] };
  }

  const cand = nums.filter((n) => n.v > 0 && n.v <= 120);
  if (cand.length === 0) {
    if (!descriptive) return null;
    // descriptive cues
    if (/\b(elderly|senior citizen|old man|old woman|aged)\b|बुज़ुर्ग|बुजुर्ग|बूढ़|వృద్ధ|ముసలి/u.test(norm)) return { range: [60, 90] };
    if (/\b(teen|teenager|teenage)\b|किशोर|టీనేజ్/u.test(norm)) return { range: [13, 19] };
    if (/\b(child|kid|baby)\b|बच्च|పిల్ల/u.test(norm)) return { range: [3, 12] };
    if (/middle[- ]aged|अधेड़|మధ్య వయస్/u.test(norm)) return { range: [40, 55] };
    if (/\b(young|youth)\b|जवान|युवा|యువ/u.test(norm)) return { range: [18, 35] };
    return { vague: true };
  }

  if (cand.length >= 2) {
    const distinct = [...new Set(cand.map((c) => c.v))];
    if (distinct.length >= 2) {
      if (RANGE_MARK.test(norm) && !corrected) {
        const lo = Math.min(distinct[0], distinct[1]);
        const hi = Math.max(distinct[0], distinct[1]);
        return { range: clampAge(lo, hi) };
      }
      if (corrected) {
        const last = [...cand].sort((a, b) => a.pos - b.pos)[cand.length - 1];
        return { range: [last.v, last.v] };
      }
      return { ambiguous: distinct };
    }
  }

  const n = cand[0].v;
  if (lastPos(norm, APPROX) >= 0) return { range: clampAge(n - 3, n + 3) };
  return { range: [n, n] };
}

/* ------------------------------ income ------------------------------ */

function unitMul(u: string | undefined): number | undefined {
  if (!u) return undefined;
  if (/^(lakhs?|lacs?|lac|लाख|లక్షలు|లక్ష)$/u.test(u)) return 1;
  if (/^(thousand|k|हज़ार|हजार|వేలు|వేల)$/u.test(u)) return 0.01;
  if (/^(crore|करोड़|కోటి)$/u.test(u)) return 100;
  return undefined;
}

function parseIncome(norm: string): [number, number] | null {
  if (/no income|zero income|nothing|कोई आय नहीं|कुछ नहीं|ఆదాయం లేదు|ఏమీ లేదు/u.test(norm)) return [0, 1];
  const re = /(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|lac|लाख|లక్షలు|లక్ష|thousand|k(?![a-z])|हज़ार|हजार|వేలు|వేల|crore|करोड़|కోటి)?/gu;
  const found: { v: number; unit?: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm))) found.push({ v: parseFloat(m[1]), unit: unitMul(m[2]) });
  // number words with unit (e.g. "two lakh")
  if (found.length === 0) {
    for (const n of extractNumbers(norm)) {
      const after = norm.slice(n.pos).split(" ")[1];
      found.push({ v: n.v, unit: unitMul(after) });
    }
  }
  if (found.length === 0) return null;
  const monthly = /month|monthly|महीन|माह|मासिक|నెల/u.test(norm);
  const toLakh = (f: { v: number; unit?: number }, fallbackUnit?: number): number => {
    const u = f.unit ?? fallbackUnit;
    let lakh: number;
    if (u !== undefined) lakh = f.v * u;
    else if (f.v >= 1000) lakh = f.v / 100000;
    else lakh = f.v; // bare small number: assume lakh per year
    return monthly ? lakh * 12 : lakh;
  };
  const clamp = (x: number) => Math.min(100, Math.max(0, Math.round(x * 100) / 100));
  if (found.length >= 2 && RANGE_MARK.test(norm)) {
    const u2 = found[1].unit;
    const a = toLakh(found[0], u2);
    const b = toLakh(found[1]);
    return [clamp(Math.min(a, b)), clamp(Math.max(a, b))];
  }
  const v = clamp(toLakh(found[0]));
  return [v, v];
}

/* ------------------------------ name -------------------------------- */

const NAME_STOP = new Set([
  "a", "an", "the", "is", "am", "are", "and", "i", "my", "name", "hai", "hain", "hoon", "hun", "hu", "mera", "naam", "years", "old", "yes", "ok", "okay", "hello", "hi", "namaste", "from", "in", "sir", "madam",
  "है", "हैं", "हूँ", "हूं", "हु", "नमस्ते", "मेरा", "नाम", "उम्र", "साल", "అండి", "అండీ", "అని", "ఉంది", "ఏమిటి", "నమస్కారం", "నా", "పేరు", "నేను", "मैं", "मै", "और", "మరియు",
]);

function looksLikeSlot(tok: string): boolean {
  const n = normalize(tok);
  const all: string[] = [];
  for (const lex of [GENDER, CATEGORY, OCCUPATION] as Record<string, Lex>[]) {
    for (const k of Object.keys(lex)) all.push(...lex[k].s);
  }
  return lastPos(n, all) >= 0;
}

function titleCase(s: string): string {
  return s.replace(/(^|\s)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());
}

export function parseName(text: string): string | undefined {
  let t = text
    .replace(/[0-9०-९౦-౯]+/g, " ")
    .replace(/[.,!?;:()"“”।]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const markers = [
    /(?:my name is|name is|this is|i am|i'm|im|call me|it is|it's|myself|mera naam|my name)\s+/i,
    /(?:मेरा नाम|नाम है|नाम|मैं|मै)\s+/,
    /(?:నా పేరు|పేరు|నేను)\s+/,
  ];
  for (const re of markers) {
    const m = re.exec(t);
    if (m) {
      t = t.slice(m.index + m[0].length);
      break;
    }
  }
  const out: string[] = [];
  for (const tok of t.split(" ").filter(Boolean)) {
    const low = tok.toLowerCase();
    if (NAME_STOP.has(low) || NAME_STOP.has(tok)) {
      if (out.length) break;
      continue;
    }
    if (looksLikeSlot(tok)) break;
    out.push(tok);
    if (out.length === 2) break;
  }
  if (!out.length) return undefined;
  const name = out.join(" ");
  return isLatin(name) ? titleCase(name.toLowerCase()) : name;
}

/* ------------------------------ parse ------------------------------- */

const BOOL_LEX: { field: Field; pats: string[] }[] = [
  { field: "minority", pats: MINORITY },
  { field: "disability", pats: DISABILITY },
  { field: "widow", pats: WIDOW },
  { field: "pregnant", pats: PREGNANT },
  { field: "bpl", pats: BPL },
  { field: "land", pats: LAND },
];

export function parse(text: string, _lang: Lang, expected: Expected): Parsed {
  const norm = normalize(text);
  const out: Parsed = { slots: {}, corrected: false };
  if (!norm) return out;
  out.corrected = lastPos(norm, CORRECTION) >= 0;

  const words = norm.split(" ").length;

  // ---- language switch ("telugu", "speak hindi") ----
  for (const l of Object.keys(LANG_WORDS) as Lang[]) {
    if (lastPos(norm, LANG_WORDS[l]) >= 0 && (words <= 5 || /speak|talk|language|बोल|भाषा|మాట్లాడ|భాష/u.test(norm))) {
      out.intent = "switch";
      out.switchTo = l;
      return out;
    }
  }

  // ---- control intents ----
  if (lastPos(norm, RESTART) >= 0) return { ...out, intent: "restart" };
  if (lastPos(norm, MORE) >= 0) return { ...out, intent: "more" };
  if (lastPos(norm, REPEAT) >= 0 && expected !== "name") return { ...out, intent: "repeat" };
  if (lastPos(norm, RESULTS) >= 0 && expected !== "name") return { ...out, intent: "results" };

  const exp = expected;
  const field = (f: Field) => exp === f;

  // ---- enumerations ----
  const amb = (f: Field, values: unknown[]) => {
    if (!out.ambiguous) out.ambiguous = { field: f, values };
  };
  const setEnum = <T extends string>(f: Field, hits: { key: T; pos: number }[]) => {
    if (hits.length === 0) return;
    if (hits.length === 1) {
      out.slots[f] = hits[0].key;
      return;
    }
    if (out.corrected) {
      out.slots[f] = [...hits].sort((a, b) => a.pos - b.pos)[hits.length - 1].key;
      return;
    }
    amb(f, hits.map((h) => h.key));
  };

  setEnum("gender", findAll(norm, GENDER, "gender", exp));
  setEnum("category", findAll(norm, CATEGORY, "category", exp));

  // occupation (with overrides)
  {
    let hits = findAll(norm, OCCUPATION, "occupation", exp);
    if (hits.some((h) => h.key === "jobseeker")) hits = hits.filter((h) => h.key !== "salaried" && h.key !== "business");
    if (/farm\s*(labou?r|worker)|agricultur\w*\s*(labou?r|worker)|कृषि\s*मजदूर|खेतिहर|వ్యవసాయ\s*కూలీ/u.test(norm)) {
      hits = hits.filter((h) => h.key !== "farmer");
    }
    if (hits.some((h) => h.key === "student") && hits.some((h) => h.key === "retired")) {
      /* keep both -> ambiguity */
    }
    setEnum("occupation", hits);
  }

  setEnum("state", findAll(norm, STATE, "state", exp));
  setEnum("area", findAll(norm, AREA, "area", exp));

  // study level
  {
    const hits = findAll(norm, LEVEL, "studentLevel", exp);
    const m1 =
      norm.match(/(?:class|std|standard|grade|कक्षा|क्लास|క్లాస్|తరగతి)\s*(\d{1,2})/u) ??
      norm.match(/(\d{1,2})\s*(?:th|st|nd|rd)(?![a-z])/);
    const n = m1 ? Number(m1[1]) : 0;
    const key: StudentLevel | null = n >= 1 && n <= 8 ? "class1_8" : n >= 9 && n <= 10 ? "class9_10" : n >= 11 && n <= 12 ? "class11_12" : null;
    // an explicit class number beats keyword guesses
    if (key) setEnum("studentLevel", [{ key, pos: m1?.index ?? 0 }]);
    else setEnum("studentLevel", hits);
  }

  // ---- age ----
  {
    const a = parseAge(norm, exp === "age" ? "age" : exp === "name" ? "name" : "other", out.corrected);
    if (a) {
      if (a.range) out.slots.age = a.range;
      else if (a.ambiguous) amb("age", a.ambiguous.map((n) => [n, n] as [number, number]));
      else if (a.vague && exp === "age") out.vagueAge = true;
    }
  }

  // ---- income ----
  if (exp === "income" || (lastPos(norm, INCOME_CUES) >= 0 && exp !== "age")) {
    const inc = parseIncome(norm);
    if (inc) {
      // avoid double-reading the income number as an age
      if (exp === "income") delete out.slots.age;
      out.slots.income = inc;
    }
  }

  // ---- yes / no (for boolean questions and thresholds) ----
  const isBoolExpected = exp === "yn" || exp === "disability" || exp === "bpl" || exp === "minority" || exp === "land" || exp === "widow" || exp === "pregnant" || exp === "daughter" || exp === "schoolChild";

  const unknownPos = lastPos(norm, UNKNOWN);
  const skipPos = lastPos(norm, SKIP);

  if (isBoolExpected) {
    const target: Field | null = exp === "yn" ? null : (exp as Field);
    if (unknownPos >= 0) out.intent = "unknown";
    else if (skipPos >= 0) out.intent = "skip";
    else {
      const no = lastPos(norm, NO);
      const yesS = lastPos(norm, YES_STRONG);
      const yesW = no < 0 && yesS < 0 ? lastPos(norm, YES_WEAK) : -1;
      let val: boolean | undefined;
      if (no >= 0 && yesS >= 0) {
        if (out.corrected) val = yesS > no;
        else {
          if (target) amb(target, [true, false]);
          else out.ambiguous = { field: "bpl", values: [true, false] };
        }
      } else if (no >= 0) val = false;
      else if (yesS >= 0 || yesW >= 0) val = true;
      if (val !== undefined) {
        out.yn = val;
        if (target) out.slots[target] = val;
      }
    }
  } else {
    // opportunistic positive facts: "I'm a widow", "I have a disability"
    const neg = lastPos(norm, NEG) >= 0;
    for (const { field: f, pats } of BOOL_LEX) {
      if (lastPos(norm, pats) >= 0 && !neg && !field(f)) out.slots[f] = true;
    }
    if (exp === "name") {
      if (skipPos >= 0 || unknownPos >= 0) out.intent = "skip";
    } else if (exp !== null) {
      if (unknownPos >= 0) out.intent = "unknown";
      else if (skipPos >= 0) out.intent = "skip";
    }
  }

  if (exp === "name") out.name = parseName(text);

  return out;
}
