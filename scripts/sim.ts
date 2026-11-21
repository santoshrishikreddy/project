import { start, step, prompt, type AgentState, type Input, type Output } from "../src/lib/agent";
import { group } from "../src/lib/engine";
import { parse, extractNumbers, normalize } from "../src/lib/nlu";
import { SCHEMES } from "../src/data/schemes";
import { DICT } from "../src/lib/i18n";
import type { Lang } from "../src/lib/types";

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`);
};

console.log("schemes:", SCHEMES.length);
// dictionary completeness
const keys = (o: unknown, pre = ""): string[] =>
  typeof o === "object" && o !== null && !Array.isArray(o)
    ? Object.entries(o).flatMap(([k, v]) => keys(v, pre + k + "."))
    : [pre];
eq("hi dict keys", keys(DICT.hi).sort(), keys(DICT.en).sort());
eq("te dict keys", keys(DICT.te).sort(), keys(DICT.en).sort());

// numbers
eq("hindi 45", extractNumbers(normalize("मेरी उम्र पैंतालीस साल है")).map((n) => n.v), [45]);
eq("hindi 90", extractNumbers(normalize("नब्बे"))[0]?.v, 90);
eq("telugu 25", extractNumbers(normalize("ఇరవై ఐదు")).map((n) => n.v), [25]);
eq("english 'thirty five'", extractNumbers(normalize("thirty five")).map((n) => n.v), [35]);
eq("devanagari digits", extractNumbers(normalize("उम्र ४५")).map((n) => n.v), [45]);

// age parsing
const age = (t: string, l: Lang = "en") => parse(t, l, "age").slots.age;
eq("age exact", age("I am 45 years old"), [45, 45]);
eq("age approx", age("around 40"), [37, 43]);
eq("age decade", age("in my forties"), [40, 49]);
eq("age late 30s", age("late 30s"), [37, 39]);
eq("age thirty something", age("thirty something"), [30, 39]);
eq("age range", age("between 30 and 40"), [30, 40]);
eq("age self-correct", age("25 no wait sorry 35"), [35, 35]);
eq("age ambiguous", parse("I'm 25 and 35", "en", "age").ambiguous?.values, [[25, 25], [35, 35]]);
eq("age vague", parse("I don't remember", "en", "age").vagueAge, true);
eq("age birth year", age("born in 1985"), [new Date().getFullYear() - 1985, new Date().getFullYear() - 1985]);
eq("age hindi", age("मेरी उम्र 52 साल है", "hi"), [52, 52]);
eq("age telugu", age("నా వయసు 61", "te"), [61, 61]);
eq("age old", age("I am an old man"), [60, 90]);

// enums
eq("gender woman", parse("I am a woman", "en", "gender").slots.gender, "female");
eq("gender hindi", parse("मैं महिला हूँ", "hi", "gender").slots.gender, "female");
eq("gender telugu", parse("నేను మహిళను", "te", "gender").slots.gender, "female");
eq("gender male", parse("male", "en", "gender").slots.gender, "male");
eq("gender ambiguous", parse("male and female", "en", "gender").ambiguous?.values, ["female", "male"]);
eq("category SC", parse("I belong to SC", "en", "category").slots.category, "sc");
eq("category telugu ST", parse("నేను ఎస్టీ", "te", "category").slots.category, "st");
eq("category BC", parse("BC", "en", "category").slots.category, "obc");
eq("category general weak", parse("general", "en", "category").slots.category, "general");
eq("occupation farmer", parse("I do farming", "en", "occupation").slots.occupation, "farmer");
eq("occupation telugu", parse("నేను రైతును", "te", "occupation").slots.occupation, "farmer");
eq("occupation jobseeker beats job", parse("I am looking for a job", "en", "occupation").slots.occupation, "jobseeker");
eq("occupation farm labour", parse("I am a farm labourer", "en", "occupation").slots.occupation, "labour");
eq("occupation hindi", parse("मैं मजदूर हूँ", "hi", "occupation").slots.occupation, "labour");
eq("income lakh", parse("2 lakh", "en", "income").slots.income, [2, 2]);
eq("income monthly", parse("10000 per month", "en", "income").slots.income, [1.2, 1.2]);
eq("income hindi", parse("दो लाख", "hi", "income").slots.income, [2, 2]);
eq("income range", parse("between 1 and 2 lakh", "en", "income").slots.income, [1, 2]);
eq("state telugu", parse("తెలంగాణ", "te", "state").slots.state, "telangana");
eq("level class 10", parse("class 10", "en", "studentLevel").slots.studentLevel, "class9_10");
eq("level college", parse("engineering college", "en", "studentLevel").slots.studentLevel, "college");

// yes/no
const yn = (t: string, f: "disability" | "yn" = "yn") => parse(t, "en", f).yn;
eq("yes", yn("yes"), true);
eq("no", yn("no I don't"), false);
eq("hindi haan", parse("हाँ", "hi", "yn").yn, true);
eq("hindi nahin hai", parse("नहीं है", "hi", "yn").yn, false);
eq("telugu avunu", parse("అవును", "te", "yn").yn, true);
eq("telugu ledu", parse("లేదు", "te", "yn").yn, false);
eq("yes-no ambiguous", parse("yes no", "en", "disability").ambiguous?.values, [true, false]);
eq("yes then correct to no", yn("yes, actually no"), false);
eq("unknown", parse("I don't know", "en", "disability").intent, "unknown");
eq("hindi unknown", parse("पता नहीं", "hi", "disability").intent, "unknown");

// name
eq("name en", parse("my name is ravi kumar", "en", "name").name, "Ravi Kumar");
eq("name hi", parse("मेरा नाम रवि है", "hi", "name").name, "रवि");
eq("name te", parse("నా పేరు రవి", "te", "name").name, "రవి");
{ const sl = parse("I'm Ravi, 45, male, SC", "en", "name").slots; eq("name multi", [sl.age, sl.gender, sl.category], [[45, 45], "male", "sc"]); }

// ---------------------------- scenarios ----------------------------
function run(title: string, lang: Lang, inputs: (string | Input)[]): { s: AgentState; log: string[] } {
  console.log(`\n=== ${title} ===`);
  let out: Output = start(lang);
  const log: string[] = [];
  console.log("  🤖", out.say.join(" "));
  for (const inp of inputs) {
    const input: Input = typeof inp === "string" ? { type: "text", text: inp } : inp;
    console.log("  👤", typeof inp === "string" ? inp : JSON.stringify(inp));
    out = step(out.state, input, lang);
    console.log("  🤖", out.say.join(" ").slice(0, 190));
    log.push(...out.say);
  }
  const g = group(out.state.profile);
  console.log(`  → asked=${out.state.asked} eligible=${g.eligible.map((e) => e.scheme.id).join(",")}`);
  console.log(`  → maybe=${g.maybe.map((e) => e.scheme.id).join(",")}`);
  return { s: out.state, log };
}

// helper: answer whatever the agent asks using a fixed "truth" table
function auto(title: string, lang: Lang, first: string[], truth: Record<string, unknown>, say = true): { s: AgentState; qs: string[] } {
  console.log(`\n=== ${title} ===`);
  let out: Output = start(lang);
  const qs: string[] = [];
  console.log("  🤖", out.say.join(" ").slice(0, 120));
  for (const t of first) {
    console.log("  👤", t);
    out = step(out.state, { type: "text", text: t }, lang);
    console.log("  🤖", out.say.join(" ").slice(0, 170));
  }
  let guard = 0;
  while (out.state.ask && guard++ < 15) {
    if (out.state.conflict) {
      console.log("  ⚠ conflict:", out.say.join(" ").slice(0, 120));
      break;
    }
    const ask = out.state.ask;
    const key = ask.kind === "field" ? ask.field! : ask.kind;
    qs.push(ask.kind === "field" ? ask.field! : `${ask.kind}:${ask.t}`);
    let v = truth[key];
    if ((ask.kind === "ageT" || ask.kind === "incT")) v = truth[`${ask.kind}`] ?? false;
    if (v === undefined) v = false;
    if (say) console.log("  👤 (tap)", key, JSON.stringify(v));
    out = step(out.state, { type: "value", field: ask.field ?? "name", value: v }, lang);
  }
  const g = group(out.state.profile);
  console.log(`  → asked=${out.state.asked} followups=${out.state.followups}  questions: ${qs.join(", ")}`);
  console.log(`  → ELIGIBLE: ${g.eligible.map((e) => e.scheme.id).join(", ")}`);
  console.log(`  → MAYBE: ${g.maybe.map((e) => e.scheme.id).join(", ")}`);
  return { s: out.state, qs };
}
const elig = (s: AgentState) => group(s.profile).eligible.map((e) => e.scheme.id);

// 1. Farmer, SC, 45, male, owns land, Telangana, poor
{
  const r = auto("Farmer SC male 45 (one sentence)", "en", ["I'm Ravi, 45 years old, male, SC, a farmer"], {
    land: true, bpl: true, income: [0, 1], state: "telangana", area: "rural", disability: false, minority: false,
  });
  const ids = elig(r.s);
  eq("pm-kisan", ids.includes("pm-kisan"), true);
  eq("not pm-kmy (age 45)", ids.includes("pm-kmy"), false);
  eq("rythu-bharosa", ids.includes("rythu-bharosa"), true);
  eq("nsfdc (SC loan)", ids.includes("nsfdc"), true);
  eq("pmay-g", ids.includes("pmay-g"), true);
  eq("not andhra annadata", ids.includes("annadata"), false);
  eq("asked <= 10", r.s.asked <= 10, true);
}

// 2. Vague caller
{
  const r = auto("Vague caller (about forty, woman, unknown caste, homemaker)", "en", ["call me Meena", "around forty", "woman", "I don't know", "homemaker"], {
    bpl: true, state: "andhra", area: "urban", income: [1, 2.5], widow: false, pregnant: false, daughter: true, schoolChild: true,
    ageT: false, minority: false, disability: false,
  });
  eq("age interval refined or kept", Array.isArray(r.s.profile.age), true);
  eq("category skipped", r.s.profile.skipped.includes("category"), true);
  console.log("  profile:", JSON.stringify(r.s.profile));
}

// 3. Contradictory callers
{
  let out: Output = start("en");
  for (const t of ["Sam", "25", "male", "general", "I am retired and 70 years old"]) out = step(out.state, { type: "text", text: t }, "en");
  console.log("\n=== Contradiction: changed age ===\n  🤖", out.say.join(" "));
  eq("raised 'changed' conflict", out.state.conflict?.type, "changed");
  const r2 = step(out.state, { type: "resolve", index: 1 }, "en");
  eq("age now 70", r2.state.profile.age, [70, 70]);
  eq("occupation retired", r2.state.profile.occupation, "retired");
}
{
  let out: Output = start("en");
  for (const t of ["Sam", "30", "female", "sc", "farmer"]) out = step(out.state, { type: "text", text: t }, "en");
  console.log("\n=== Contradiction: yes and no ===\n  ask:", JSON.stringify(out.state.ask));
  out = step(out.state, { type: "text", text: "yes and no" }, "en");
  console.log("  🤖", out.say.join(" "));
  eq("ambiguous yes/no conflict", out.state.conflict?.type, "ambiguous");
}
{
  let out: Output = start("en");
  for (const t of ["Tom", "10", "male", "general", "I am a farmer"]) out = step(out.state, { type: "text", text: t }, "en");
  console.log("\n=== Implausible: 10-year-old farmer ===\n  🤖", out.say.join(" "));
  eq("implausible conflict", out.state.conflict?.code, "ageOcc");
  const keep = step(out.state, { type: "resolve", index: 2 }, "en");
  eq("keep as is dismisses", keep.state.dismissed, ["ageOcc"]);
}
{
  let out: Output = start("en");
  for (const t of ["Tom", "30", "male", "general", "I am pregnant"]) out = step(out.state, { type: "text", text: t }, "en");
  console.log("\n=== Implausible: pregnant man ===\n  🤖", out.say.join(" "));
  eq("male pregnant conflict", out.state.conflict?.code, "male");
}
{
  let out: Output = start("en");
  for (const t of ["Asha", "28", "female", "st"]) out = step(out.state, { type: "text", text: t }, "en");
  out = step(out.state, { type: "text", text: "I'm 25, no wait, sorry, 35" }, "en");
  console.log("\n=== Self-correction in one sentence ===\n  🤖", out.say.join(" "));
  console.log("  age:", JSON.stringify(out.state.profile.age), "conflict:", out.state.conflict?.type);
}

// 4. Student ST girl
{
  const r = auto("Student ST girl 16", "en", ["Lakshmi", "16", "woman", "ST", "student"], {
    studentLevel: "class11_12", income: [1, 2.5], bpl: false, state: "other", area: "rural", minority: false, disability: false,
  });
  const ids = elig(r.s);
  eq("st-post eligible", ids.includes("st-post"), true);
  eq("not sc-post", ids.includes("sc-post"), false);
  eq("asks studentLevel early", r.qs.indexOf("studentLevel") <= 1, true);
}

// 5. Telugu widow
{
  const r = auto("Telugu widow 62 (voice)", "te", ["నా పేరు సీత", "62", "మహిళ", "ఎస్సీ", "కూలీ"], {
    bpl: true, widow: true, state: "telangana", area: "rural", disability: false, income: [0, 1], minority: false,
  });
  const ids = elig(r.s);
  eq("ignoaps (62 BPL)", ids.includes("ignoaps"), true);
  eq("ts-cheyutha", ids.includes("ts-cheyutha"), true);
  eq("no widow pension at 62? (40-79 BPL)", ids.includes("ignwps"), true);
  console.log("  last prompt:", prompt(r.s, "te"));
}

// 6. Hindi senior
{
  const r = auto("Hindi senior 72", "hi", ["मेरा नाम राम है", "मेरी उम्र 72 साल है", "पुरुष", "सामान्य"], {
    occupation: "retired", bpl: false, income: [2.5, 5], state: "other", area: "urban", disability: false, minority: false,
  });
  eq("vay vandana", elig(r.s).includes("vay-vandana"), true);
}

// 7. Max questions across random personas
{
  const hist: Record<number, number> = {};
  let max = 0;
  let total = 0;
  let n = 0;
  const genders = ["male", "female"];
  const cats = ["general", "obc", "sc", "st"];
  const occs = ["farmer", "student", "labour", "artisan", "business", "salaried", "jobseeker", "homemaker", "retired"];
  for (const g of genders) for (const c of cats) for (const o of occs) for (const a of [17, 28, 45, 65]) {
    let out = start("en");
    out = step(out.state, { type: "value", field: "name", value: "X" }, "en");
    out = step(out.state, { type: "value", field: "age", value: [a, a] }, "en");
    out = step(out.state, { type: "value", field: "gender", value: g }, "en");
    out = step(out.state, { type: "value", field: "category", value: c }, "en");
    let guard = 0;
    while (out.state.ask && guard++ < 20) {
      if (out.state.conflict) {
        const c = out.state.conflict;
        out = step(out.state, { type: "resolve", index: c.type === "implausible" ? (c.fields ?? []).length : 0 }, "en");
        continue;
      }
      const ask = out.state.ask;
      let v: unknown = false;
      if (ask.kind === "field") {
        const f = ask.field!;
        if (f === "occupation") v = o;
        else if (f === "income") v = [1, 2.5];
        else if (f === "state") v = "telangana";
        else if (f === "area") v = "rural";
        else if (f === "studentLevel") v = "college";
        else v = false;
        out = step(out.state, { type: "value", field: f, value: v }, "en");
      } else {
        out = step(out.state, { type: "value", field: ask.field!, value: true }, "en");
      }
    }
    max = Math.max(max, out.state.asked); hist[out.state.asked] = (hist[out.state.asked] ?? 0) + 1;
    total += out.state.asked;
    n++;
  }
  console.log('histogram', JSON.stringify(hist));
  console.log(`\npersonas=${n} avgQuestions=${(total / n).toFixed(2)} maxQuestions=${max}`);
  eq("max questions <= 11", max <= 11, true);
}

console.log(fails === 0 ? "\nALL PASSED" : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
