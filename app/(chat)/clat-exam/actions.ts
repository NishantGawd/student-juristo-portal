"use server";

import { generateObject, generateText } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import pdf from "pdf-parse";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { trackUserActivity } from "@/lib/activity/tracking";
import { getAiCreditCost } from "@/lib/ai/model-access";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  canUseClatModel,
  type ClatModelTier,
  getClatModelOption,
  getDefaultClatModelTier,
} from "@/lib/clat-model-access";
import { db } from "@/lib/db";
import { getUserUsage, updateUserUsage } from "@/lib/db/queries";
import {
  examProfile,
  type Quiz,
  type QuizQuestion,
  quiz,
  quizQuestion,
} from "@/lib/db/schema";
import { getLimit } from "@/lib/usage/plan-limits";
import {
  CLAT_DURATION_SECONDS,
  CLAT_NEGATIVE_MARK,
  CLAT_SECTIONS,
  CLAT_TOTAL_QUESTIONS,
  type ClatSectionName,
  calculateClatScore,
  decorateQuestionWithSection,
  getMockDistribution,
  normalizeClatSection,
  stripQuestionSection,
} from "./clat-config";

const CLAT_SECTION_PROMPTS: Record<ClatSectionName, string> = {
  "English Language": `You are generating CLAT-pattern English Language questions.
Each question must be based on a reading comprehension passage of 200-350 words.
Use editorial, literary criticism, philosophy, legal policy, or social commentary themes.
Ask one question that tests main idea, inference, vocabulary in context, tone, or structure.
Format the question field exactly as: "**Passage:** [passage text]\\n\\n**Question:** [question text]"`,

  "Current Affairs & GK": `You are generating CLAT-pattern Current Affairs and General Knowledge questions.
The current year is 2026. Prioritize important developments from 2025 and 2026.
Cover Indian polity, legal developments, major Supreme Court judgments, international affairs, awards, appointments, economics, and sports.
No passage is required. Keep questions crisp, factual, and exam-relevant.`,

  "Legal Reasoning": `You are generating CLAT-pattern Legal Reasoning questions.
Each question must be based on a legal principle or passage of 150-250 words.
The passage should describe a legal rule, doctrine, or factual scenario.
Ask one question that tests application of the principle to facts.
Use Indian law concepts such as constitutional law, contracts, torts, criminal law, family law, and statutory interpretation.
Format the question field exactly as: "**Passage:** [passage text]\\n\\n**Question:** [question text]"`,

  "Logical Reasoning": `You are generating CLAT-pattern Logical Reasoning questions.
Each question must be based on a short argument, statement set, or logical puzzle of 100-200 words.
Test assumptions, conclusions, strengthening, weakening, parallel reasoning, flaws, and critical thinking.
Format the question field exactly as: "**Passage:** [argument or setup]\\n\\n**Question:** [question text]"`,

  "Quantitative Techniques": `You are generating CLAT-pattern Quantitative Techniques questions.
Use Class 10 level arithmetic and data interpretation only.
Test ratios, percentages, averages, profit/loss, data tables, charts described in text, and basic algebra.
Format the question field exactly as: "**Data:** [data or problem setup]\\n\\n**Question:** [question text]"`,
};

const CLAT_PATTERN_CONTEXT = `Official CLAT UG pattern to follow:
- ${CLAT_TOTAL_QUESTIONS} MCQs, ${CLAT_DURATION_SECONDS / 60} minutes.
- 1 mark for every correct answer and ${CLAT_NEGATIVE_MARK} negative mark for every wrong answer.
- Sections and approximate weightage: English Language 20%, Current Affairs including GK 25%, Legal Reasoning 25%, Logical Reasoning 20%, Quantitative Techniques 10%.
- The exam tests comprehension and reasoning skills more than rote legal knowledge.`;

const FAST_MOCK_CONFIG = {
  enabled: true,
  sourceLabel: "CLAT fast mock bank",
};

const TRUSTED_PYQ_PDF_HOSTS = new Set([
  "knowledgenation.co.in",
  "www.knowledgenation.co.in",
  "consortiumofnlus.ac.in",
  "www.consortiumofnlus.ac.in",
]);
const PYQ_PAPER_TEXT_LIMIT = 90_000;
const PYQ_ANSWER_KEY_TEXT_LIMIT = 25_000;

const PYQ_PROMPTS: Record<string, string> = {
  "CLAT 2025":
    "Simulate CLAT 2025 previous-year style questions. Emphasize constitutional developments, Supreme Court decisions, criminal law transition issues, parliamentary affairs, international events, and data interpretation.",
  "CLAT 2024":
    "Simulate CLAT 2024 previous-year style questions. Emphasize new criminal laws, Article 370 litigation, digital privacy, electoral bonds, and legal-current affairs.",
  "CLAT 2023": `Simulate CLAT 2023 previous-year style questions. Emphasize the collegium debate, EWS reservation, cryptocurrency regulation, international affairs, and women's rights judgments.`,
  "CLAT 2022":
    "Simulate CLAT 2022 previous-year style questions. Emphasize COVID-19 legal implications, farm laws repeal, privacy, OTT regulation, and sedition debates.",
  "CLAT 2021":
    "Simulate CLAT 2021 previous-year style questions. Emphasize CAA/NRC, Ayodhya aftermath, Article 370, digital privacy, and migrant worker rights.",
};

const looseOptionSchema = z.union([
  z.string(),
  z
    .object({
      label: z.string().optional(),
      option: z.string().optional(),
      text: z.string().optional(),
      value: z.string().optional(),
      content: z.string().optional(),
    })
    .passthrough(),
]);

const generatedQuestionSchema = z.object({
  section: z.string().optional(),
  questionNumber: z.union([z.number(), z.string()]).optional(),
  number: z.union([z.number(), z.string()]).optional(),
  question: z.string().optional(),
  prompt: z.string().optional(),
  stem: z.string().optional(),
  passage: z.string().optional(),
  data: z.string().optional(),
  options: z.union([z.array(looseOptionSchema), z.record(z.any())]).optional(),
  choices: z.union([z.array(looseOptionSchema), z.record(z.any())]).optional(),
  correctAnswer: z.string().optional(),
  answer: z.string().optional(),
  correctOption: z.string().optional(),
  correct: z.string().optional(),
  explanation: z.string().optional(),
  rationale: z.string().optional(),
});
const OPTION_ANSWER_LABEL_PATTERN = /^(?:option\s*)?([A-D])(?:[).:\s]|$)/i;
const OPTION_TEXT_LABEL_PATTERN = /^\(?[A-D]\)?[).:\s]+/i;

type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
type CleanGeneratedQuestion = {
  section: ClatSectionName;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

const realPyqRequestSchema = z.object({
  year: z.string().min(4),
  set: z.string().optional(),
  paperUrl: z.string().url(),
  answerKeyUrl: z.string().url().optional(),
  questionCount: z.number().int().min(5).max(30).optional(),
});

const CLAT_TOKEN_ESTIMATE_PER_QUESTION: Record<ClatModelTier, number> = {
  mini: 350,
  macro: 550,
  max: 800,
};

function estimateClatGenerationTokens(params: {
  fileContext?: string;
  mode: string;
  modelTier: ClatModelTier;
  questionCount: number;
}) {
  const base = params.mode === "pyq" ? 4000 : 1500;
  const fileContextTokens = params.fileContext
    ? Math.ceil(params.fileContext.length / 4)
    : 0;

  return Math.ceil(
    base +
    params.questionCount * CLAT_TOKEN_ESTIMATE_PER_QUESTION[params.modelTier] +
    fileContextTokens
  );
}

function getUsageDiffForClatModel(modelTier: ClatModelTier, tokens: number) {
  const model = getClatModelOption(modelTier);
  const credits = getAiCreditCost(model.modelId, tokens);

  return {
    tokensDiff: credits,
    miniTokensDiff: modelTier === "mini" ? tokens : 0,
    macroTokensDiff: modelTier === "macro" ? tokens : 0,
    maxTokensDiff: modelTier === "max" ? tokens : 0,
  };
}

async function checkClatGenerationAccess(params: {
  fileContext?: string;
  mode: string;
  modelTier: ClatModelTier;
  questionCount: number;
  userId: string;
}) {
  const userUsage = await getUserUsage(params.userId);
  const plan = userUsage?.plan || "free";

  if (!canUseClatModel(plan, params.modelTier)) {
    const model = getClatModelOption(params.modelTier);
    return {
      allowed: false,
      estimatedTokens: 0,
      error: `${model.label} is not available on your current plan. Free and Spark users can use Mini, Momentum adds Macro, and Peak enables Max analytics.`,
      plan,
      upgradeRequired: true,
    };
  }

  const estimatedTokens = estimateClatGenerationTokens(params);
  const estimatedCredits = getAiCreditCost(
    getClatModelOption(params.modelTier).modelId,
    estimatedTokens
  );
  const limit = getLimit(plan, "tokens");
  const used = Number.parseInt(userUsage?.tokensUsed || "0", 10) || 0;

  if (limit !== -1 && used + estimatedCredits > limit) {
    return {
      allowed: false,
      estimatedTokens,
      error:
        "Your AI credit limit has been reached. Upgrade your plan to keep generating CLAT mocks, quizzes, and legal AI responses.",
      plan,
      upgradeRequired: true,
    };
  }

  return {
    allowed: true,
    estimatedTokens,
    plan,
    upgradeRequired: false,
  };
}

async function readUploadedContext(file: File | null) {
  if (!file || file.size <= 0) {
    return "";
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const pdfData = await pdf(buffer);
      return pdfData.text.substring(0, 20_000);
    }

    return buffer.toString("utf-8").substring(0, 20_000);
  } catch (error) {
    console.error("Failed to parse quiz upload:", error);
    return "";
  }
}

function normalizeTrustedPdfUrl(rawUrl: string) {
  const url = new URL(rawUrl);

  if (
    url.protocol !== "https:" ||
    !TRUSTED_PYQ_PDF_HOSTS.has(url.hostname) ||
    !url.pathname.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("Unsupported PYQ PDF source.");
  }

  return url.toString();
}

async function readRemotePdfContext(rawUrl: string, charLimit: number) {
  const url = normalizeTrustedPdfUrl(rawUrl);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Unable to fetch PDF source: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const pdfData = await pdf(buffer);

  return pdfData.text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .substring(0, charLimit);
}

function stringifyOption(option: unknown) {
  if (typeof option === "string") {
    return option.replace(OPTION_TEXT_LABEL_PATTERN, "").trim();
  }

  if (option && typeof option === "object") {
    const record = option as Record<string, unknown>;
    const value =
      record.text ||
      record.value ||
      record.option ||
      record.content ||
      record.label;

    if (typeof value === "string") {
      return value.replace(OPTION_TEXT_LABEL_PATTERN, "").trim();
    }

    const firstStringValue = Object.values(record).find(
      (item) => typeof item === "string"
    );
    if (typeof firstStringValue === "string") {
      return firstStringValue.replace(OPTION_TEXT_LABEL_PATTERN, "").trim();
    }
  }

  return "";
}

function normalizeOptions(input: unknown) {
  if (Array.isArray(input)) {
    return input.map(stringifyOption).filter(Boolean).slice(0, 4);
  }

  if (input && typeof input === "object") {
    return Object.values(input as Record<string, unknown>)
      .map(stringifyOption)
      .filter(Boolean)
      .slice(0, 4);
  }

  return [];
}

function normalizeCorrectAnswer(
  rawAnswer: string | undefined,
  options: string[]
) {
  if (!rawAnswer) {
    return "";
  }

  const answer = rawAnswer.trim();
  if (options.includes(answer)) {
    return answer;
  }

  const optionLabel = answer.match(OPTION_ANSWER_LABEL_PATTERN)?.[1];
  if (optionLabel) {
    const optionIndex = optionLabel.toUpperCase().charCodeAt(0) - 65;
    return options[optionIndex] || "";
  }

  const fuzzyMatch = options.find(
    (option) =>
      option.toLowerCase().includes(answer.toLowerCase()) ||
      answer.toLowerCase().includes(option.toLowerCase())
  );

  return fuzzyMatch || "";
}

function getGeneratedQuestionNumber(question: GeneratedQuestion) {
  const rawNumber = question.questionNumber || question.number;

  if (typeof rawNumber === "number" && Number.isFinite(rawNumber)) {
    return rawNumber;
  }

  if (typeof rawNumber === "string") {
    const parsed = Number.parseInt(rawNumber.replace(/\D/g, ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function sectionForQuestionNumber(
  questionNumber: number | null,
  index = 0
): ClatSectionName {
  const number = questionNumber || index + 1;

  if (number <= 24) {
    return "English Language";
  }
  if (number <= 54) {
    return "Current Affairs & GK";
  }
  if (number <= 84) {
    return "Legal Reasoning";
  }
  if (number <= 108) {
    return "Logical Reasoning";
  }

  return "Quantitative Techniques";
}

function buildQuestionText(
  section: ClatSectionName,
  question: GeneratedQuestion
) {
  const prompt = question.question || question.prompt || question.stem || "";
  const passage = question.passage || question.data || "";

  if (!passage.trim()) {
    return prompt.trim();
  }

  const label = section === "Quantitative Techniques" ? "Data" : "Passage";
  if (prompt.includes("**Passage:**") || prompt.includes("**Data:**")) {
    return prompt.trim();
  }

  return `**${label}:** ${passage.trim()}\n\n**Question:** ${prompt.trim()}`;
}

function cleanGeneratedQuestion(
  section: ClatSectionName,
  question: GeneratedQuestion
): CleanGeneratedQuestion | null {
  const questionText = buildQuestionText(section, question);
  const options = normalizeOptions(question.options || question.choices);
  const correctAnswer = normalizeCorrectAnswer(
    question.correctAnswer ||
    question.answer ||
    question.correctOption ||
    question.correct,
    options
  );
  const explanation = question.explanation || question.rationale || "";

  if (questionText.length < 12 || options.length !== 4 || !correctAnswer) {
    return null;
  }

  return {
    section,
    options,
    correctAnswer,
    explanation:
      explanation.trim() ||
      "Review the relevant passage, eliminate options that overstate the rule, and choose the option most directly supported by the facts.",
    question: decorateQuestionWithSection(section, questionText),
  };
}

function createBackupQuestion(section: ClatSectionName, index: number) {
  const sectionPrompts: Record<ClatSectionName, string> = {
    "English Language": `**Passage:** A columnist argues that legal education rewards careful reading more than memorisation. The passage says that a good reader should identify the author's claim, the evidence used to support it, and the limits of that evidence.\n\n**Question:** Which skill is most directly emphasized in the passage?`,
    "Current Affairs & GK":
      "Which of the following is most relevant for a CLAT current affairs revision note on Indian polity?",
    "Legal Reasoning":
      "**Passage:** Principle: A person is liable for negligence when they owe a duty of care, breach that duty, and cause foreseeable harm. Facts: A library leaves a loose electrical wire across a reading aisle despite prior complaints. A student trips and is injured.\n\n**Question:** Which conclusion best follows from the principle?",
    "Logical Reasoning": `**Passage:** All effective mock tests should be followed by review. Some students take many mocks but do not review mistakes. The mentor argues that unreviewed mocks rarely improve accuracy.\n\n**Question:** Which assumption does the mentor's argument rely on?`,
    "Quantitative Techniques": `**Data:** In a 20-question sprint, a student answered 15 questions, got 11 correct, 4 wrong, and skipped 5.\n\n**Question:** Using CLAT marking, what is the student's net score?`,
  };
  const optionsBySection: Record<ClatSectionName, string[]> = {
    "English Language": [
      "Identifying claims and supporting evidence",
      "Memorising unrelated legal maxims",
      "Ignoring the author's reasoning",
      "Choosing the longest answer option",
    ],
    "Current Affairs & GK": [
      "A recent constitutional amendment or Supreme Court judgment",
      "A private anecdote unrelated to public affairs",
      "An advanced calculus theorem",
      "A foreign recipe with no legal relevance",
    ],
    "Legal Reasoning": [
      "The library may be liable because the harm was foreseeable after complaints",
      "The library cannot be liable because students always assume all risks",
      "Negligence requires proof of a written contract only",
      "The student must lose because the wire was inside a library",
    ],
    "Logical Reasoning": [
      "Reviewing mistakes is necessary for mocks to improve accuracy",
      "Every student who takes mocks already has perfect accuracy",
      "Mock tests are unrelated to exam performance",
      "The number of mocks matters even if no learning happens",
    ],
    "Quantitative Techniques": ["10", "11", "14", "15"],
  };
  const correctAnswerBySection: Record<ClatSectionName, string> = {
    "English Language": optionsBySection["English Language"][0],
    "Current Affairs & GK": optionsBySection["Current Affairs & GK"][0],
    "Legal Reasoning": optionsBySection["Legal Reasoning"][0],
    "Logical Reasoning": optionsBySection["Logical Reasoning"][0],
    "Quantitative Techniques": optionsBySection["Quantitative Techniques"][0],
  };

  return {
    section,
    question: decorateQuestionWithSection(
      section,
      `${sectionPrompts[section]}\n\nMock item ${index + 1}.`
    ),
    options: optionsBySection[section],
    correctAnswer: correctAnswerBySection[section],
    explanation:
      "This backup item keeps the mock playable if the AI provider returns malformed output. Review the principle, passage, or data directly before choosing.",
  };
}

function createFastMockQuestion(
  section: ClatSectionName,
  index: number,
  profile: typeof examProfile.$inferSelect | undefined,
  difficulty: string
): CleanGeneratedQuestion {
  const weakSection = profile?.weakestSection || "Legal Reasoning";
  const targetNlu = profile?.targetNlu || "a top NLU";
  const serial = index + 1;
  const variant = index % 5;
  const isWeakSection = section === weakSection;
  const pressureNote = isWeakSection
    ? "This item is intentionally trap-heavy because this is marked as your weak section."
    : "This item follows CLAT elimination logic and timing pressure.";

  const dataStart = 40 + index * 3;
  const dataSecond = 60 + index * 2;
  const percentage = 10 + (index % 5) * 5;
  const quantAnswer = String(
    Math.round(dataStart + dataSecond + (dataStart * percentage) / 100)
  );

  const templates: Record<
    ClatSectionName,
    Array<{
      correctAnswer: string;
      explanation: string;
      options: string[];
      prompt: string;
    }>
  > = {
    "English Language": [
      {
        prompt: `**Passage:** A legal education essay argues that speed reading is useful only when it does not weaken comprehension. The author says that CLAT passages reward readers who notice qualifiers, contrast words, and the author's limited claim rather than readers who hunt for familiar words.\n\n**Question:** Which inference is best supported by the passage?`,
        options: [
          "Fast reading must still preserve attention to the author's precise claim",
          "Every familiar legal word should be treated as the answer",
          "Qualifiers are irrelevant in comprehension questions",
          "Slow reading always guarantees a correct answer",
        ],
        correctAnswer:
          "Fast reading must still preserve attention to the author's precise claim",
        explanation:
          "The passage balances speed with comprehension and highlights qualifiers as important.",
      },
      {
        prompt:
          "**Passage:** The writer criticizes debates where speakers quote principles without explaining their limits. According to the writer, a principle becomes meaningful only when applied to facts with care, context, and attention to exceptions.\n\n**Question:** What is the central idea of the passage?",
        options: [
          "Principles need contextual application to be useful",
          "Exceptions should always be ignored",
          "Quoting a rule is better than applying it",
          "Facts have no role in reasoning",
        ],
        correctAnswer: "Principles need contextual application to be useful",
        explanation:
          "The passage repeatedly says principles matter when connected to facts and limits.",
      },
      {
        prompt: `**Passage:** An editorial notes that public institutions gain trust when they explain decisions transparently. It does not claim that every decision will be popular; rather, it says reasons allow citizens to test whether power has been used fairly.\n\n**Question:** The author's tone is best described as:`,
        options: [
          "Reasoned and reform-oriented",
          "Mocking and dismissive",
          "Indifferent to public accountability",
          "Purely celebratory",
        ],
        correctAnswer: "Reasoned and reform-oriented",
        explanation:
          "The author supports transparent reasons as a reform for accountability.",
      },
      {
        prompt:
          "**Passage:** The passage distinguishes disagreement from confusion. Two readers may disagree with a conclusion while still understanding the argument; confusion arises when the evidence and conclusion are not separated.\n\n**Question:** Which skill is emphasized?",
        options: [
          "Separating evidence from conclusion",
          "Avoiding every difficult passage",
          "Choosing answers by length",
          "Memorising conclusions without reasons",
        ],
        correctAnswer: "Separating evidence from conclusion",
        explanation:
          "The passage directly identifies this separation as the way to avoid confusion.",
      },
      {
        prompt:
          "**Passage:** A commentator says that modern exams test patience with ambiguity. The best answers are not always perfect; they are the options least inconsistent with the passage.\n\n**Question:** What approach does the commentator recommend?",
        options: [
          "Choose the option most consistent with the passage",
          "Reject every option that is not perfect",
          "Ignore the passage if options are close",
          "Prefer extreme answers",
        ],
        correctAnswer: "Choose the option most consistent with the passage",
        explanation:
          "The passage recommends selecting the least inconsistent, passage-supported option.",
      },
    ],
    "Current Affairs & GK": [
      {
        prompt:
          "For CLAT current affairs revision, which source should be prioritized for legal and constitutional developments?",
        options: [
          "Recent Supreme Court judgments, statutes, and government policy notes",
          "Unverified social media forwards",
          "Only entertainment headlines",
          "Advanced calculus problem sets",
        ],
        correctAnswer:
          "Recent Supreme Court judgments, statutes, and government policy notes",
        explanation:
          "CLAT GK rewards legally relevant current affairs and constitutional developments.",
      },
      {
        prompt:
          "A student preparing for CLAT wants to revise international affairs efficiently. Which note is most exam-relevant?",
        options: [
          "A summit, treaty, conflict, or institution with India/global governance relevance",
          "A private travel diary",
          "A recipe from a foreign cuisine blog",
          "A celebrity rumor with no public affairs angle",
        ],
        correctAnswer:
          "A summit, treaty, conflict, or institution with India/global governance relevance",
        explanation:
          "International affairs questions usually connect to institutions, treaties, summits, or governance.",
      },
      {
        prompt:
          "Which topic is most suitable for a CLAT legal-current-affairs notebook?",
        options: [
          "A new law, constitutional case, commission report, or rights issue",
          "A fictional character ranking",
          "An unrelated fashion trend",
          "A school timetable with no public relevance",
        ],
        correctAnswer:
          "A new law, constitutional case, commission report, or rights issue",
        explanation:
          "Legal-current-affairs revision should focus on law, policy, rights, and institutions.",
      },
      {
        prompt:
          "When reading a current affairs passage for CLAT, which detail is usually most important?",
        options: [
          "The institution involved and the legal or policy significance",
          "The font used in the article",
          "The number of advertisements on the page",
          "The author's hometown if unrelated",
        ],
        correctAnswer:
          "The institution involved and the legal or policy significance",
        explanation:
          "CLAT tests significance, actors, institutions, and legal-policy context.",
      },
      {
        prompt: "Which revision habit best reduces mistakes in CLAT GK?",
        options: [
          "Grouping events by theme and revising why each event matters",
          "Reading only headlines without context",
          "Skipping legal developments",
          "Memorising random dates without any connection",
        ],
        correctAnswer:
          "Grouping events by theme and revising why each event matters",
        explanation:
          "Theme-based revision improves recall and application in passage-linked GK.",
      },
    ],
    "Legal Reasoning": [
      {
        prompt:
          "**Passage:** Principle: A person is liable for negligence when they owe a duty of care, breach that duty, and cause foreseeable harm. Facts: A coaching centre ignores repeated complaints about a broken staircase light. A student falls on the dark staircase and is injured.\n\n**Question:** Which conclusion best follows?",
        options: [
          "The centre may be liable because the harm was foreseeable after repeated complaints",
          "The centre cannot be liable because students enter at their own risk",
          "Negligence requires a written contract in every case",
          "The student must lose because the injury happened indoors",
        ],
        correctAnswer:
          "The centre may be liable because the harm was foreseeable after repeated complaints",
        explanation:
          "Duty, breach, and foreseeable harm are all indicated by the facts.",
      },
      {
        prompt:
          "**Passage:** Principle: A contract with a minor is void. Facts: R, aged 17, signs an agreement to sell his laptop to S. S pays an advance and later sues R for breach when R refuses to deliver.\n\n**Question:** Applying the principle, what is the result?",
        options: [
          "S cannot enforce the agreement because R is a minor",
          "S must win because an advance was paid",
          "The agreement is valid if the laptop is valuable",
          "Minority has no effect on contracts",
        ],
        correctAnswer: "S cannot enforce the agreement because R is a minor",
        explanation:
          "The principle directly states that a contract with a minor is void.",
      },
      {
        prompt:
          "**Passage:** Principle: Defamation requires a false statement that harms reputation and is communicated to a third person. Facts: A privately writes in a diary that B is dishonest. No one else reads it.\n\n**Question:** Which element is missing?",
        options: [
          "Communication to a third person",
          "A written statement",
          "A reference to B",
          "A negative opinion",
        ],
        correctAnswer: "Communication to a third person",
        explanation:
          "A private diary entry is not communicated to a third person on these facts.",
      },
      {
        prompt: `**Passage:** Principle: Consent obtained by coercion is not free consent. Facts: M signs a sale deed after N threatens to damage M's shop unless M signs immediately.\n\n**Question:** Which option best applies the principle?`,
        options: [
          "M's consent may not be free because it was obtained by threat",
          "The sale deed is always valid because it was signed",
          "Threats are irrelevant to consent",
          "Only courts can give consent",
        ],
        correctAnswer:
          "M's consent may not be free because it was obtained by threat",
        explanation:
          "The facts show a threat used to obtain consent, matching coercion.",
      },
      {
        prompt: `**Passage:** Principle: A person is liable for trespass if they intentionally enter another's land without permission. Facts: P walks through Q's fenced garden to save five minutes, despite a visible sign saying "No Entry".\n\n**Question:** Which conclusion follows?`,
        options: [
          "P may be liable for trespass",
          "P is not liable because he saved time",
          "Trespass requires permanent occupation",
          "A fence removes all property rights",
        ],
        correctAnswer: "P may be liable for trespass",
        explanation:
          "Intentional entry without permission is enough under the stated principle.",
      },
    ],
    "Logical Reasoning": [
      {
        prompt: `**Passage:** The mentor says, "Students who review every mock improve faster. Riya improved after reviewing every mock. Therefore, review alone guarantees improvement for every student."\n\n**Question:** What is the flaw?`,
        options: [
          "It generalizes from one student's experience too broadly",
          "It gives too much statistical data",
          "It proves that mocks are useless",
          "It ignores the existence of Riya",
        ],
        correctAnswer:
          "It generalizes from one student's experience too broadly",
        explanation: "The conclusion overgeneralizes from a single example.",
      },
      {
        prompt:
          "**Passage:** If a student understands assumptions, they can evaluate arguments better. Aman evaluates arguments better this month. The teacher concludes Aman must understand assumptions.\n\n**Question:** Which error is present?",
        options: [
          "Affirming the consequent",
          "Circular definition",
          "Appeal to popularity",
          "Contradiction in terms",
        ],
        correctAnswer: "Affirming the consequent",
        explanation: "The argument treats a sufficient condition as necessary.",
      },
      {
        prompt:
          "**Passage:** A survey of 20 students in one coaching batch found that most prefer evening study. The article concludes that all CLAT aspirants in India prefer evening study.\n\n**Question:** Which criticism is strongest?",
        options: [
          "The sample is too small and narrow for the conclusion",
          "The conclusion is supported by national data",
          "The survey asked too many students",
          "Preference can never be surveyed",
        ],
        correctAnswer: "The sample is too small and narrow for the conclusion",
        explanation:
          "A small, local sample cannot justify a nationwide conclusion.",
      },
      {
        prompt:
          "**Passage:** The author argues that students should take fewer mocks if they are not reviewing mistakes, because repetition without feedback repeats the same errors.\n\n**Question:** Which assumption is required?",
        options: [
          "Feedback from review helps correct repeated errors",
          "All mocks are identical",
          "Mistakes are always random",
          "Taking no tests is the best strategy",
        ],
        correctAnswer: "Feedback from review helps correct repeated errors",
        explanation:
          "The argument depends on review being useful for correcting errors.",
      },
      {
        prompt:
          "**Passage:** All high-scoring attempts require time management. Some accurate students lack time management. Therefore, some accurate students may not produce high-scoring attempts.\n\n**Question:** The conclusion is:",
        options: [
          "Supported by the premises",
          "Contradicted by both premises",
          "About an unrelated topic",
          "A statement of personal taste only",
        ],
        correctAnswer: "Supported by the premises",
        explanation:
          "If time management is required and some accurate students lack it, they may not score highly.",
      },
    ],
    "Quantitative Techniques": [
      {
        prompt: `**Data:** In a mock review, a student solved ${dataStart} Legal questions and ${dataSecond} total non-Legal questions. Legal attempts increased by ${percentage}% in the next week.\n\n**Question:** What is the new combined total after the increase in Legal attempts?`,
        options: [
          quantAnswer,
          String(dataStart + dataSecond),
          String(dataStart + dataSecond + percentage),
          String(dataSecond + percentage),
        ],
        correctAnswer: quantAnswer,
        explanation:
          "Increase Legal attempts by the stated percentage and add the unchanged non-Legal count.",
      },
      {
        prompt: `**Data:** A student answered ${dataStart} questions with ${percentage}% wrong answers. The rest were correct.\n\n**Question:** How many questions were correct?`,
        options: [
          String(Math.round(dataStart * (1 - percentage / 100))),
          String(Math.round(dataStart * (percentage / 100))),
          String(dataStart + percentage),
          String(Math.max(0, dataStart - dataSecond)),
        ],
        correctAnswer: String(Math.round(dataStart * (1 - percentage / 100))),
        explanation:
          "Correct answers equal total answered minus the wrong-answer percentage.",
      },
      {
        prompt: `**Data:** A mini mock has ${dataStart} marks available. A student scores ${Math.round(dataStart * 0.7)} marks.\n\n**Question:** What percentage of marks did the student score?`,
        options: ["70%", "60%", "75%", "80%"],
        correctAnswer: "70%",
        explanation:
          "The score is 70 percent of the available marks by construction.",
      },
      {
        prompt: `**Data:** In a week, a student studied ${dataStart} minutes on day one and ${dataSecond} minutes on day two.\n\n**Question:** What was the average study time over the two days?`,
        options: [
          String((dataStart + dataSecond) / 2),
          String(dataStart + dataSecond),
          String(Math.abs(dataSecond - dataStart)),
          String(dataSecond),
        ],
        correctAnswer: String((dataStart + dataSecond) / 2),
        explanation: "Average equals the sum of both days divided by two.",
      },
      {
        prompt: `**Data:** A student's score rose from ${dataStart} to ${dataSecond}.\n\n**Question:** By how many marks did the score increase?`,
        options: [
          String(dataSecond - dataStart),
          String(dataSecond + dataStart),
          String(dataSecond),
          String(dataStart),
        ],
        correctAnswer: String(dataSecond - dataStart),
        explanation: "Increase equals final score minus initial score.",
      },
    ],
  };

  const template = templates[section][variant];

  return {
    section,
    question: decorateQuestionWithSection(
      section,
      `${template.prompt}\n\n${FAST_MOCK_CONFIG.sourceLabel} item ${serial}. Difficulty: ${difficulty}. Target: ${targetNlu}.`
    ),
    options: template.options,
    correctAnswer: template.correctAnswer,
    explanation: `${template.explanation} ${pressureNote}`,
  };
}

function createFastMockQuestions(params: {
  difficulty: string;
  profile: typeof examProfile.$inferSelect | undefined;
  questionCount: number;
}) {
  return getMockDistribution(params.questionCount).flatMap((item) =>
    Array.from({ length: item.count }, (_, index) =>
      createFastMockQuestion(
        item.section,
        index,
        params.profile,
        params.difficulty
      )
    )
  );
}

async function generateQuestionBatch(params: {
  section: ClatSectionName;
  count: number;
  difficulty: string;
  modeContext: string;
  fileContext: string;
  modelTier: ClatModelTier;
}) {
  const modelId = getClatModelOption(params.modelTier).modelId;
  const model = getLanguageModel(modelId);

  const result = await generateObject({
    model,
    system: `${CLAT_PATTERN_CONTEXT}

${CLAT_SECTION_PROMPTS[params.section]}

${params.modeContext}

Rules:
- Generate exactly ${params.count} original questions for ${params.section}.
- Difficulty: ${params.difficulty}.
- Each question must have exactly 4 options.
- The correctAnswer must exactly match one option.
- Do not include option labels such as A/B/C/D in option text.
- Do not return passage-only objects. Every item needs question, options, correctAnswer, and explanation.
- Prefer the exact keys: question, options, correctAnswer, explanation.
- Keep explanations concise but useful for post-test review.`,
    prompt: params.fileContext
      ? `Context Document Content:\n\n${params.fileContext}\n\nGenerate the ${params.count} ${params.section} questions now.`
      : `Generate the ${params.count} ${params.section} questions now.`,
    schema: z.object({
      questions: z.array(generatedQuestionSchema),
    }),
  });

  return result.object.questions
    .slice(0, params.count)
    .map((question) => cleanGeneratedQuestion(params.section, question))
    .filter(
      (question): question is CleanGeneratedQuestion => question !== null
    );
}

async function generateSectionQuestions(params: {
  section: ClatSectionName;
  count: number;
  difficulty: string;
  modeContext: string;
  fileContext: string;
  modelTier: ClatModelTier;
}) {
  const questions: CleanGeneratedQuestion[] = [];
  const seenQuestions = new Set<string>();
  let attempts = 0;
  const maxAttempts = Math.max(6, Math.ceil(params.count / 3) + 4);

  while (questions.length < params.count && attempts < maxAttempts) {
    const remaining = params.count - questions.length;
    const batchSize = Math.min(remaining, params.count > 20 ? 5 : 8);
    const batch = await generateQuestionBatch({
      ...params,
      count: batchSize,
      modeContext: `${params.modeContext}
Retry context: ${attempts > 0 ? "Previous AI output was incomplete. Return complete MCQ objects only." : "First attempt."}`,
    });

    for (const question of batch) {
      const key = question.question.toLowerCase().slice(0, 180);
      if (!seenQuestions.has(key)) {
        seenQuestions.add(key);
        questions.push(question);
      }
    }

    attempts += 1;
  }

  while (questions.length < params.count) {
    questions.push(createBackupQuestion(params.section, questions.length));
  }

  return questions.slice(0, params.count);
}

export async function generateRealPyqQuizAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const request = realPyqRequestSchema.parse(input);
    const paperUrl = normalizeTrustedPdfUrl(request.paperUrl);
    const answerKeyUrl = request.answerKeyUrl
      ? normalizeTrustedPdfUrl(request.answerKeyUrl)
      : "";
    const questionCount = request.questionCount || 30;
    const userUsage = await getUserUsage(session.user.id);
    const modelTier = getDefaultClatModelTier(userUsage?.plan || "free");
    const access = await checkClatGenerationAccess({
      mode: "pyq",
      modelTier,
      questionCount,
      userId: session.user.id,
    });

    if (!access.allowed) {
      return {
        error: access.error,
        upgradeRequired: access.upgradeRequired,
      };
    }

    const [paperText, answerKeyText] = await Promise.all([
      readRemotePdfContext(paperUrl, PYQ_PAPER_TEXT_LIMIT),
      answerKeyUrl
        ? readRemotePdfContext(answerKeyUrl, PYQ_ANSWER_KEY_TEXT_LIMIT)
        : Promise.resolve(""),
    ]);

    if (paperText.length < 1000) {
      return {
        error:
          "The source PDF could not be read clearly enough to build an interactive PYQ.",
      };
    }

    const model = getLanguageModel(getClatModelOption(modelTier).modelId);
    const result = await generateObject({
      model,
      system: `You are a careful CLAT previous-year paper extraction engine.
Use only the supplied PDF text and answer-key text. Do not invent, rewrite, modernize, or simulate questions.
If any question, option, passage, or answer is truncated or unclear, omit that question.
If the answer key marks a question as withdrawn, omit it.
Return only MCQs whose correctAnswer can be mapped to one of the four returned options.
When questions share a passage or data set, include that source passage/data in the passage or data field for every related question.`,
      prompt: `Extract the first ${questionCount} usable MCQs from this real CLAT previous-year source.

Paper: ${request.year}${request.set ? ` ${request.set}` : ""}
Question paper PDF: ${paperUrl}
Answer key PDF: ${answerKeyUrl || "No separate key supplied; use only answers/explanations embedded in the paper text."}

Return fields:
- questionNumber: source question number if visible
- section: one of English Language, Current Affairs & GK, Legal Reasoning, Logical Reasoning, Quantitative Techniques
- passage or data: exact source passage/data when present
- question: exact question stem from the source
- options: exactly four option texts, without A/B/C/D labels
- correctAnswer: exact option text if possible, otherwise the option letter from the key
- explanation: source solution if present; otherwise a short note that the answer is from the supplied answer key

Question paper text excerpt:
${paperText}

Answer key text excerpt:
${answerKeyText || "No separate answer-key text was supplied."}`,
      schema: z.object({
        questions: z.array(generatedQuestionSchema),
      }),
    });

    const cleanedQuestions: CleanGeneratedQuestion[] = [];
    const seenQuestions = new Set<string>();

    result.object.questions
      .slice(0, questionCount * 2)
      .forEach((question, index) => {
        const questionNumber = getGeneratedQuestionNumber(question);
        const section = normalizeClatSection(
          question.section || sectionForQuestionNumber(questionNumber, index)
        );
        const cleaned = cleanGeneratedQuestion(section, question);

        if (!cleaned) {
          return;
        }

        if (!question.explanation && !question.rationale) {
          cleaned.explanation = `The supplied source${answerKeyUrl ? " answer key" : ""} marks "${cleaned.correctAnswer}" as the correct option. Recheck the linked paper PDF during review for the original passage and context.`;
        }

        const key = stripQuestionSection(cleaned.question)
          .question.toLowerCase()
          .slice(0, 180);
        if (!seenQuestions.has(key)) {
          seenQuestions.add(key);
          cleanedQuestions.push(cleaned);
        }
      });

    if (cleanedQuestions.length < Math.min(10, questionCount)) {
      return {
        error:
          "The real paper could not be converted reliably. Open the PDF for now, or try a paper with a clearer answer key.",
      };
    }

    const [newQuiz] = await db
      .insert(quiz)
      .values({
        userId: session.user.id,
        title: `${request.year} Real PYQ Drill (${cleanedQuestions.length}Q)`,
        subject: "CLAT Full Syllabus",
        topic: `${request.year}${request.set ? ` ${request.set}` : ""}`,
        difficulty: "Previous Year",
        quizType: "pyq",
        totalQuestions: cleanedQuestions.length,
        status: "in_progress",
        documentUrl: paperUrl,
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(quizQuestion).values(
      cleanedQuestions.map((question) => ({
        quizId: newQuiz.id,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      }))
    );

    await updateUserUsage({
      id: session.user.id,
      ...getUsageDiffForClatModel(modelTier, access.estimatedTokens),
    });

    revalidatePath("/clat-exam");

    // Track quiz_started activity
    trackUserActivity({
      userId: session.user.id,
      eventType: "quiz_started",
      sourceTable: "Quiz",
      sourceId: newQuiz.id,
      textPreview: `Started PYQ: ${request.year} (${cleanedQuestions.length}Q)`,
      keywords: ["clat", "pyq", request.year].filter(Boolean),
      metadata: {
        modelTier,
        quizType: "pyq",
        totalQuestions: cleanedQuestions.length,
        year: request.year,
      },
    }).catch(() => { });

    return { success: true, quizId: newQuiz.id };
  } catch (error) {
    console.error("Real PYQ generation failed:", error);
    return {
      error:
        "Failed to convert the source PDF into an interactive PYQ. Please try again.",
    };
  }
}

// ============================================================================
// Save Exam Profile
// ============================================================================

export async function saveExamProfileAction(data: {
  targetExam: string;
  targetYear: string;
  currentClass: string;
  targetNlu: string;
  weakestSection: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const existing = await db.query.examProfile.findFirst({
      where: eq(examProfile.userId, session.user.id),
    });

    const profileData = {
      ...data,
      weakestSection: normalizeClatSection(data.weakestSection),
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(examProfile)
        .set(profileData)
        .where(eq(examProfile.userId, session.user.id));
    } else {
      await db.insert(examProfile).values({
        userId: session.user.id,
        ...profileData,
      });
    }

    revalidatePath("/clat-exam");
    return { success: true };
  } catch (error) {
    console.error("Error saving exam profile:", error);
    return { error: "Failed to save profile" };
  }
}

export async function toggleOptInForUpdatesAction(optedIn: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    await db
      .update(examProfile)
      .set({ optedInForUpdates: optedIn, updatedAt: new Date() })
      .where(eq(examProfile.userId, session.user.id));

    revalidatePath("/clat-exam");
    return { success: true };
  } catch (error) {
    console.error("Error toggling opt in:", error);
    return { error: "Failed to toggle opt in" };
  }
}

// ============================================================================
// Generate Quiz
// ============================================================================

export async function generateQuizAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const subject = (formData.get("subject") as string) || "";
  const topic = (formData.get("topic") as string) || subject;
  const difficulty = (formData.get("difficulty") as string) || "Medium";
  const requestedCount = Number.parseInt(
    (formData.get("questionCount") as string) ||
    (formData.get("numberOfQuestions") as string) ||
    "10",
    10
  );
  const quizType = (formData.get("quizType") as string) || "MCQ";
  const mode = ((formData.get("mode") as string) || "custom").toLowerCase();
  const requestedModelTier = formData.get("modelTier") as string | null;
  const file = formData.get("document") as File | null;
  const fileContext = await readUploadedContext(file);

  try {
    const [profile] = await db
      .select()
      .from(examProfile)
      .where(eq(examProfile.userId, session.user.id))
      .limit(1);

    const questionCount = Number.isFinite(requestedCount)
      ? Math.max(1, Math.min(requestedCount, CLAT_TOTAL_QUESTIONS))
      : 10;
    const userUsage = await getUserUsage(session.user.id);
    const modelTier = ["mini", "macro", "max"].includes(
      requestedModelTier || ""
    )
      ? (requestedModelTier as ClatModelTier)
      : getDefaultClatModelTier(userUsage?.plan || "free");
    const access = await checkClatGenerationAccess({
      fileContext,
      mode,
      modelTier,
      questionCount,
      userId: session.user.id,
    });

    if (!access.allowed) {
      return {
        error: access.error,
        upgradeRequired: access.upgradeRequired,
      };
    }

    let generatedQuestions: CleanGeneratedQuestion[] = [];

    if (mode === "mock" && FAST_MOCK_CONFIG.enabled && !fileContext) {
      generatedQuestions = createFastMockQuestions({
        difficulty,
        profile,
        questionCount,
      });
    } else if (mode === "mock" || mode === "pyq") {
      const distribution = getMockDistribution(questionCount);
      const pyqContext =
        mode === "pyq" ? PYQ_PROMPTS[topic] || PYQ_PROMPTS["CLAT 2025"] : "";
      const modeContext =
        mode === "pyq"
          ? `You are generating PYQ-style CLAT practice. This is an original simulation inspired by previous-year style, not a reproduction of an official paper.
${pyqContext}`
          : `You are generating an original AI-personalized CLAT mock test simulation.
Student profile:
- Target exam: ${profile?.targetExam || "CLAT UG"} ${profile?.targetYear || "upcoming attempt"}
- Dream NLU: ${profile?.targetNlu || "a top NLU"}
- Current stage: ${profile?.currentClass || "not specified"}
- Weakest section: ${profile?.weakestSection || "not specified"}

Match the section mix, timing pressure, and comprehension-heavy style of the official exam. Personalize difficulty, traps, and explanations toward the student's weak section without changing the official distribution.`;

      for (const item of distribution) {
        const questions = await generateSectionQuestions({
          section: item.section,
          count: item.count,
          difficulty,
          modeContext,
          fileContext,
          modelTier,
        });
        generatedQuestions.push(...questions);
      }
    } else {
      const normalizedSubject = normalizeClatSection(subject || topic);
      const safeCount = Math.min(questionCount, 30);
      const modeContext =
        mode === "sectional"
          ? `Generate a sectional CLAT drill for ${normalizedSubject}.`
          : `Generate a CLAT-centric custom drill on "${topic || normalizedSubject}" for ${normalizedSubject}. If context text is provided, prioritize it.`;

      generatedQuestions = await generateSectionQuestions({
        section: normalizedSubject,
        count: safeCount,
        difficulty,
        modeContext,
        fileContext,
        modelTier,
      });
    }

    if (generatedQuestions.length === 0) {
      return {
        error:
          "The quiz could not generate enough questions. Please try a smaller set.",
      };
    }

    const quizTitle =
      mode === "mock"
        ? generatedQuestions.length >= CLAT_TOTAL_QUESTIONS
          ? "CLAT Full Mock Test (120Q)"
          : `CLAT Mini Mock (${generatedQuestions.length}Q)`
        : mode === "pyq"
          ? `${topic} PYQ-Style Paper (${generatedQuestions.length}Q)`
          : mode === "sectional"
            ? `${normalizeClatSection(subject)} Sectional Drill`
            : `${topic || normalizeClatSection(subject)} CLAT Drill`;

    const [newQuiz] = await db
      .insert(quiz)
      .values({
        userId: session.user.id,
        title: quizTitle,
        subject:
          mode === "mock" || mode === "pyq"
            ? "CLAT Full Syllabus"
            : normalizeClatSection(subject || topic),
        topic: topic || subject,
        difficulty,
        quizType: mode === "custom" ? quizType : mode,
        totalQuestions: generatedQuestions.length,
        status: "in_progress",
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(quizQuestion).values(
      generatedQuestions.map((question) => ({
        quizId: newQuiz.id,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      }))
    );

    await updateUserUsage({
      id: session.user.id,
      ...getUsageDiffForClatModel(modelTier, access.estimatedTokens),
    });

    revalidatePath("/clat-exam");

    // Track quiz_started activity
    trackUserActivity({
      userId: session.user.id,
      eventType: "quiz_started",
      sourceTable: "Quiz",
      sourceId: newQuiz.id,
      textPreview: `Started quiz: ${quizTitle}`,
      keywords: [subject, topic, mode, difficulty].filter(Boolean).map(s => s.toLowerCase()),
      metadata: {
        difficulty,
        modelTier,
        quizType: mode,
        subject,
        topic,
        totalQuestions: generatedQuestions.length,
      },
    }).catch(() => { });

    return { success: true, quizId: newQuiz.id };
  } catch (error) {
    console.error("Quiz generation failed:", error);
    return { error: "Failed to generate quiz. Please try again." };
  }
}

// ============================================================================
// Submit Quiz
// ============================================================================

export async function submitQuizAction(
  quizId: string,
  userAnswers: Record<string, string>,
  timesTaken: Record<string, number> = {}
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const quizData = await db.query.quiz.findFirst({
      where: eq(quiz.id, quizId),
    });

    if (!quizData || quizData.userId !== session.user.id) {
      return { error: "Quiz not found" };
    }

    const questions = await db
      .select()
      .from(quizQuestion)
      .where(eq(quizQuestion.quizId, quizId));

    let correctCount = 0;
    const scoreableQuestions = questions.map((question) => {
      const rawAnswer = userAnswers[question.id];
      const userAnswer =
        typeof rawAnswer === "string" && rawAnswer.trim().length > 0
          ? rawAnswer
          : null;
      const timeTaken = Number.isFinite(timesTaken[question.id])
        ? Math.max(0, Math.round(timesTaken[question.id]))
        : null;
      const isCorrect = Boolean(
        userAnswer && userAnswer === question.correctAnswer
      );

      if (isCorrect) {
        correctCount += 1;
      }

      return {
        id: question.id,
        question: question.question,
        correctAnswer: question.correctAnswer,
        userAnswer,
        isCorrect,
        timeTaken,
      };
    });

    for (const question of scoreableQuestions) {
      await db
        .update(quizQuestion)
        .set({
          userAnswer: question.userAnswer,
          isCorrect: question.isCorrect,
          timeTaken: question.timeTaken,
        })
        .where(eq(quizQuestion.id, question.id));
    }

    const scoreSummary = calculateClatScore(scoreableQuestions);

    await db
      .update(quiz)
      .set({
        score: correctCount,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(quiz.id, quizId));

    try {
      const [profile] = await db
        .select()
        .from(examProfile)
        .where(eq(examProfile.userId, session.user.id))
        .limit(1);

      if (profile) {
        const completionBonus = quizData.quizType === "mock" ? 25 : 10;
        const xpEarned = Math.max(
          10,
          Math.round((scoreSummary.accuracy / 100) * 60) + completionBonus
        );
        await db
          .update(examProfile)
          .set({
            xp: (profile.xp || 0) + xpEarned,
            streak: (profile.streak || 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(examProfile.userId, session.user.id));
      }
    } catch (error) {
      console.error("Failed to update quiz XP:", error);
    }

    revalidatePath("/clat-exam");
    revalidatePath(`/clat-exam/${quizId}`);
    revalidatePath(`/clat-exam/${quizId}/take`);

    // Track quiz_completed activity
    trackUserActivity({
      userId: session.user.id,
      eventType: "quiz_completed",
      sourceTable: "Quiz",
      sourceId: quizId,
      textPreview: `Completed quiz: ${quizData.title} (Score: ${correctCount}/${questions.length})`,
      keywords: [quizData.subject, quizData.topic].filter(Boolean).map(s => s.toLowerCase()),
      metadata: {
        quizType: quizData.quizType,
        score: correctCount,
        totalQuestions: questions.length,
        netScore: scoreSummary.netScore,
        accuracy: scoreSummary.accuracy,
      },
    }).catch(() => { });

    return {
      success: true,
      score: correctCount,
      netScore: scoreSummary.netScore,
    };
  } catch (error) {
    console.error("Quiz submission failed:", error);
    return { error: "Failed to submit quiz results." };
  }
}

// ============================================================================
// AI Doubt Solver
// ============================================================================

export async function solveDoubtAction(doubtText: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!doubtText || doubtText.trim().length < 10) {
    return { error: "Please provide a detailed question or passage." };
  }

  try {
    const model = getLanguageModel("google/gemini-3.5-flash");
    const { text } = await generateText({
      model,
      system: `You are Juristo AI, an expert CLAT mentor.
The student has pasted a question, passage, or doubt.
Explain the correct answer if possible, why distractors are tempting, and one exam strategy tip.
Use Indian law or CLAT reasoning where relevant. Keep the answer concise and structured.`,
      prompt: doubtText,
    });

    return { success: true, explanation: text };
  } catch (error) {
    console.error("Doubt solving failed:", error);
    return { error: "Failed to get AI explanation. Please try again." };
  }
}

async function getCompletedQuizQuestions(userId: string, limit = 10) {
  const recentQuizzes = await db
    .select()
    .from(quiz)
    .where(and(eq(quiz.userId, userId), eq(quiz.status, "completed")))
    .orderBy(desc(quiz.createdAt))
    .limit(limit);

  const questions: Array<{
    quiz: Quiz;
    question: QuizQuestion;
    section: ClatSectionName;
    userAnswer: string | null;
    correctAnswer: string;
    questionText: string;
  }> = [];

  for (const item of recentQuizzes) {
    const quizQuestions = await db
      .select()
      .from(quizQuestion)
      .where(eq(quizQuestion.quizId, item.id));

    for (const question of quizQuestions) {
      const parsed = stripQuestionSection(question.question, item.subject);
      questions.push({
        quiz: item,
        question,
        section: parsed.section,
        userAnswer: question.userAnswer,
        correctAnswer: question.correctAnswer,
        questionText: question.question,
      });
    }
  }

  return { recentQuizzes, questions };
}

// ============================================================================
// AI Mock Review
// ============================================================================

export async function generateMockReviewAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const { recentQuizzes, questions } = await getCompletedQuizQuestions(
      session.user.id,
      12
    );

    if (recentQuizzes.length === 0 || questions.length === 0) {
      return {
        review:
          "You have not completed any quizzes yet. Take a mini mock, sectional drill, or PYQ-style paper to unlock a personalized CLAT review.",
        sections: [],
        overallAccuracy: 0,
        netScore: 0,
      };
    }

    const scoreSummary = calculateClatScore(
      questions.map((item) => ({
        question: item.questionText,
        section: item.section,
        userAnswer: item.userAnswer,
        correctAnswer: item.correctAnswer,
      }))
    );

    const sectionSummary = scoreSummary.sections
      .map(
        (section) =>
          `${section.name}: ${section.accuracy}% accuracy, net ${section.netScore.toFixed(2)} (${section.correct} correct, ${section.wrong} wrong, ${section.unanswered} skipped)`
      )
      .join("\n");

    const [profile] = await db
      .select()
      .from(examProfile)
      .where(eq(examProfile.userId, session.user.id))
      .limit(1);

    const model = getLanguageModel("google/gemini-3.5-flash");
    const { text } = await generateText({
      model,
      system: `You are Juristo AI Mock Review Coach.
Analyze CLAT preparation data and give a focused, actionable 4-5 sentence review.
Mention the student's strongest section, weakest section, negative marking risk, and next best practice action.
Be encouraging but specific.`,
      prompt: `Student Profile:
- Target: ${profile?.targetExam || "CLAT"} ${profile?.targetYear || "2026"}
- Dream NLU: ${profile?.targetNlu || "Top NLU"}
- Self-identified weakness: ${profile?.weakestSection || "Unknown"}

Recent Performance:
- Quizzes reviewed: ${recentQuizzes.length}
- Questions reviewed: ${scoreSummary.total}
- Attempted: ${scoreSummary.attempted}
- Correct: ${scoreSummary.correct}
- Wrong: ${scoreSummary.wrong}
- Unanswered: ${scoreSummary.unanswered}
- Accuracy on attempted questions: ${scoreSummary.accuracy}%
- CLAT net score over reviewed questions: ${scoreSummary.netScore.toFixed(2)}

Section breakdown:
${sectionSummary}`,
    });

    return {
      success: true,
      review: text,
      sections: scoreSummary.sections.map((section) => ({
        name: section.name,
        accuracy: section.accuracy,
        attempted: section.correct + section.wrong,
        correct: section.correct,
        wrong: section.wrong,
        unanswered: section.unanswered,
        netScore: Number(section.netScore.toFixed(2)),
      })),
      overallAccuracy: scoreSummary.accuracy,
      netScore: Number(scoreSummary.netScore.toFixed(2)),
    };
  } catch (error) {
    console.error("Mock review failed:", error);
    return { error: "Failed to generate review. Please try again." };
  }
}

// ============================================================================
// AI Roadmap
// ============================================================================

const roadmapSchema = z.object({
  overview: z.string(),
  targetScore: z.string(),
  next7Days: z.array(z.string()).min(5).max(7),
  sectionPriorities: z.array(
    z.object({
      section: z.string(),
      priority: z.string(),
      reason: z.string(),
      weeklyHours: z.number(),
    })
  ),
  weeks: z
    .array(
      z.object({
        week: z.number(),
        title: z.string(),
        focus: z.string(),
        tasks: z.array(z.string()).min(3).max(6),
        mockPlan: z.string(),
        successMetric: z.string(),
      })
    )
    .min(4)
    .max(8),
});

function normalizeRoadmapResult(
  roadmap: z.infer<typeof roadmapSchema>,
  profile: any,
  scoreSummary: ReturnType<typeof calculateClatScore>
) {
  const fallback = fallbackRoadmap(profile, scoreSummary);

  return {
    ...roadmap,
    next7Days: [...roadmap.next7Days, ...fallback.next7Days].slice(0, 7),
    sectionPriorities:
      roadmap.sectionPriorities.length > 0
        ? roadmap.sectionPriorities
        : fallback.sectionPriorities,
    weeks: roadmap.weeks.length > 0 ? roadmap.weeks : fallback.weeks,
  };
}

function fallbackRoadmap(
  profile: any,
  scoreSummary: ReturnType<typeof calculateClatScore>
) {
  const weakSection = normalizeClatSection(profile?.weakestSection);
  const targetNlu = profile?.targetNlu || "a top tier NLU";
  const sortedSections = [...scoreSummary.sections].sort(
    (a, b) => a.accuracy - b.accuracy
  );
  const prioritySections =
    sortedSections.length > 0
      ? sortedSections.slice(0, 3).map((section) => section.name)
      : [weakSection, "Current Affairs & GK", "Quantitative Techniques"];

  return {
    overview: `Diagnostic indicators verify that optimizing your processing speed in ${prioritySections[0]} is your critical bottleneck to mitigating negative-marking leakage. This tactical configuration enforces structural isolation on passage-heavy comprehension vectors while systematically anchoring your cross-sectional pacing mechanics. Isolating these systemic error gaps will stabilize your framework path as we scale your baseline toward ${targetNlu}.`,
    targetScore:
      "Aim for steady improvement toward 85+ net marks, then tighten accuracy and speed.",
    next7Days: [
      `Execute 3 high-intensity ${prioritySections[0]} sectional drills, log incorrect selections in an error journal, and isolate distractor traps.`,
      "Deconstruct 2 leading national editorials, map out primary assumptions, and draft a 5-line structural argument premise map.",
      "Review 30 premium current affairs index vectors from the past 6 months, prioritizing landmark Supreme Court judgments and bills.",
      "Solve 4 complex Quantitative Technique caselet tables under a strict 12-minute timer to eliminate rough calculator dependence.",
      "Run a 20-question mixed syllabus diagnostic sprint, managing pacing stress to leave no more than 2 items unattempted.",
      "Audit your weekly error ledger, re-attempt every failed option choice from scratch, and identify recurring logic flaws.",
      "Conduct a targeted deep-dive concept review on your weakest topic and validate your retention using an interactive custom drill."
    ],
    sectionPriorities: CLAT_SECTIONS.map((section, index) => ({
      section: section.name,
      priority: prioritySections.includes(section.name)
        ? "High"
        : index < 3
          ? "Medium"
          : "Maintenance",
      reason:
        section.name === weakSection
          ? "Marked as your weakest section or showing the largest improvement opportunity."
          : section.description,
      weeklyHours: prioritySections.includes(section.name) ? 5 : 3,
    })),
    weeks: [1, 2, 3, 4, 5, 6].map((week) => ({
      week,
      title:
        week <= 2
          ? "Foundation and accuracy"
          : week <= 4
            ? "Timed section control"
            : "Mock test refinement",
      focus: prioritySections[(week - 1) % prioritySections.length],
      tasks: [
        "Complete two sectional drills and review explanations.",
        "Maintain a mistake notebook with trap type and corrected reasoning.",
        "Revise current affairs and legal vocabulary for 30 minutes daily.",
        "Attempt one timed mixed quiz and analyze skipped questions.",
      ],
      mockPlan:
        week % 2 === 0
          ? "Take one full-length mock this week."
          : "Take two mini mocks this week.",
      successMetric:
        "Improve attempted-question accuracy by 5% or reduce wrong answers by at least 3.",
    })),
  };
}

export async function generateRoadmapAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const [profile] = await db
      .select()
      .from(examProfile)
      .where(eq(examProfile.userId, session.user.id))
      .limit(1);

    const { recentQuizzes, questions } = await getCompletedQuizQuestions(
      session.user.id,
      15
    );
    const scoreSummary =
      questions.length > 0
        ? calculateClatScore(
          questions.map((item) => ({
            question: item.questionText,
            section: item.section,
            userAnswer: item.userAnswer,
            correctAnswer: item.correctAnswer,
          }))
        )
        : calculateClatScore([]);

    const sectionSummary =
      scoreSummary.sections
        .map(
          (section) =>
            `${section.name}: ${section.accuracy}% accuracy, ${section.correct} correct, ${section.wrong} wrong, ${section.unanswered} skipped`
        )
        .join("\n") || "No completed quiz data yet.";

    const model = getLanguageModel("google/gemini-3.5-flash");
    const result = await generateObject({
      model,
      system: `You are Juristo AI Roadmap Planner for CLAT aspirants.
Create a high-density, multi-layered study roadmap using the official CLAT pattern: 120 questions, 120 minutes, five sections, and -0.25 negative marking.

🔴 CRITICAL STRUCTURAL RULE:
You MUST completely generate every single field required by the JSON schema. Do NOT terminate early, truncate text, or omit fields. You are strictly required to return:
1. 'overview' (string)
2. 'targetScore' (string)
3. 'next7Days' (array of strings, exactly 7 items)
4. 'sectionPriorities' (array of objects for ALL sections)
5. 'weeks' (array of objects)

🔴 HIGH-DENSITY CONTENT DIRECTIVE FOR 'overview' (Directives Core):
- Do NOT output generic, single-sentence formulas like "Your roadmap prioritizes X while building stamina."
- Write a highly analytical, 3-4 sentence comprehensive strategic breakdown (40-60 words).
- It must explicitly detail *how* fixing their self-identified weak section or processing lag directly addresses their accuracy gap, mitigates negative marking traps, and structurally prepares them for their dream NLU.

🔴 HIGH-DENSITY CONTENT DIRECTIVE FOR 'next7Days':
Every single task string in the next7Days array must be a tactical preparation milestone (15–30 words). 
Do NOT generate generic filler like "set up a study space", "rest", or "buy books". 
Each item must combine a clear quantitative drill objective with a post-drill verification metric.
Example: "Execute 3 high-intensity Legal Reasoning drills focusing on Torts/Contracts, log application traps, and verify error gaps with the AI mentor."`,
      prompt: `Student profile:
- Target exam: ${profile?.targetExam || "CLAT"}
- Target year: ${profile?.targetYear || "2026"}
- Current stage: ${profile?.currentClass || "Unknown"}
- Dream NLU: ${profile?.targetNlu || "Top NLU"}
- Self-identified weak section: ${profile?.weakestSection || "Unknown"}

Performance History:
- Completed quizzes reviewed: ${recentQuizzes.length}
- Questions reviewed: ${scoreSummary.total}
- Overall Baseline Accuracy: ${scoreSummary.accuracy}%
- Net score over reviewed questions: ${scoreSummary.netScore.toFixed(2)}

Section breakdown:
${sectionSummary}

Generate the full multi-week roadmap object now containing all complete schema arrays.`,
      schema: roadmapSchema,
    });

    return {
      success: true,
      roadmap: normalizeRoadmapResult(result.object, profile, scoreSummary),
    };
  } catch (error) {
    console.error("Roadmap generation failed:", error);

    try {
      const [profile] = await db
        .select()
        .from(examProfile)
        .where(eq(examProfile.userId, session.user.id))
        .limit(1);
      const { questions } = await getCompletedQuizQuestions(
        session.user.id,
        15
      );
      const scoreSummary =
        questions.length > 0
          ? calculateClatScore(
            questions.map((item) => ({
              question: item.questionText,
              section: item.section,
              userAnswer: item.userAnswer,
              correctAnswer: item.correctAnswer,
            }))
          )
          : calculateClatScore([]);

      return {
        success: true,
        roadmap: fallbackRoadmap(profile, scoreSummary),
        fallback: true,
      };
    } catch {
      return { error: "Failed to generate roadmap. Please try again." };
    }
  }
}
