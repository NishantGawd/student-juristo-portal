export const CLAT_TOTAL_QUESTIONS = 120;
export const CLAT_DURATION_SECONDS = 120 * 60;
export const CLAT_NEGATIVE_MARK = 0.25;

export type ClatSectionName =
  | "English Language"
  | "Current Affairs & GK"
  | "Legal Reasoning"
  | "Logical Reasoning"
  | "Quantitative Techniques"
  | "Mixed Diagnostic Agility";

export type ClatSectionConfig = {
  name: ClatSectionName;
  shortName: string;
  weight: string;
  fullMockQuestions: number;
  miniMockQuestions: number;
  description: string;
};

// 2. The updated array including the 6th configuration deck
export const CLAT_SECTIONS: ClatSectionConfig[] = [
  {
    name: "English Language",
    shortName: "English",
    weight: "20%",
    fullMockQuestions: 24,
    miniMockQuestions: 4,
    description:
      "Passage comprehension, inference, tone, and vocabulary in context.",
  },
  {
    name: "Current Affairs & GK",
    shortName: "GK",
    weight: "25%",
    fullMockQuestions: 30,
    miniMockQuestions: 5,
    description:
      "Recent legal, national, international, awards, polity, and sports updates.",
  },
  {
    name: "Legal Reasoning",
    shortName: "Legal",
    weight: "25%",
    fullMockQuestions: 30,
    miniMockQuestions: 5,
    description:
      "Principle application, facts, legal awareness, and constitutional reasoning.",
  },
  {
    name: "Logical Reasoning",
    shortName: "Logic",
    weight: "20%",
    fullMockQuestions: 24,
    miniMockQuestions: 4,
    description:
      "Arguments, assumptions, conclusions, strengthening, weakening, and puzzles.",
  },
  {
    name: "Quantitative Techniques",
    shortName: "Quant",
    weight: "10%",
    fullMockQuestions: 12,
    miniMockQuestions: 2,
    description:
      "Class 10 data interpretation, ratios, percentages, averages, and arithmetic.",
  },
  {
    name: "Mixed Diagnostic Agility",
    shortName: "Agility",
    weight: "Full Mix",
    fullMockQuestions: 15, // Mapped custom question target
    miniMockQuestions: 0,
    description:
      "A comprehensive layout testing context-switching speed across all 5 sections simultaneously.",
  },
];

const SECTION_MARKER_PATTERN = /^\[\[CLAT_SECTION:([^\]]+)\]\]\s*/;
const PASSAGE_QUESTION_PATTERN =
  /\*\*Passage:\*\*([\s\S]*?)(?:\*\*Question:\*\*([\s\S]*))?$/i;
const DATA_QUESTION_PATTERN =
  /\*\*Data:\*\*([\s\S]*?)(?:\*\*Question:\*\*([\s\S]*))?$/i;

export function normalizeClatSection(section?: string | null): ClatSectionName {
  const value = (section || "").trim().toLowerCase();

  if (value.includes("current") || value.includes("gk")) {
    return "Current Affairs & GK";
  }
  if (value.includes("legal")) {
    return "Legal Reasoning";
  }
  if (value.includes("logical") || value.includes("logic")) {
    return "Logical Reasoning";
  }
  if (value.includes("english")) {
    return "English Language";
  }
  if (value.includes("quant")) {
    return "Quantitative Techniques";
  }

  return "Legal Reasoning";
}

export function getClatSectionConfig(section?: string | null) {
  const normalized = normalizeClatSection(section);
  return (
    CLAT_SECTIONS.find((item) => item.name === normalized) || CLAT_SECTIONS[2]
  );
}

export function getMockDistribution(totalQuestions: number) {
  if (totalQuestions >= CLAT_TOTAL_QUESTIONS) {
    return CLAT_SECTIONS.map((section) => ({
      section: section.name,
      count: section.fullMockQuestions,
    }));
  }

  if (totalQuestions === 20) {
    return CLAT_SECTIONS.map((section) => ({
      section: section.name,
      count: section.miniMockQuestions,
    }));
  }

  const rawDistribution = CLAT_SECTIONS.map((section) => {
    const exact =
      (section.fullMockQuestions / CLAT_TOTAL_QUESTIONS) * totalQuestions;
    return {
      section: section.name,
      count: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });

  let remaining =
    totalQuestions - rawDistribution.reduce((sum, item) => sum + item.count, 0);
  const sortedByRemainder = [...rawDistribution].sort(
    (a, b) => b.remainder - a.remainder
  );

  for (const item of sortedByRemainder) {
    if (remaining <= 0) {
      break;
    }
    item.count += 1;
    remaining -= 1;
  }

  return CLAT_SECTIONS.map((section) => {
    const item = rawDistribution.find(
      (entry) => entry.section === section.name
    );
    return { section: section.name, count: Math.max(item?.count || 0, 0) };
  }).filter((item) => item.count > 0);
}

export function decorateQuestionWithSection(section: string, question: string) {
  return `[[CLAT_SECTION:${normalizeClatSection(section)}]]\n${question.trim()}`;
}

export function stripQuestionSection(
  question: string,
  fallbackSection?: string | null
) {
  const match = question.match(SECTION_MARKER_PATTERN);

  if (!match) {
    return {
      section: normalizeClatSection(fallbackSection),
      question: question.trim(),
    };
  }

  return {
    section: normalizeClatSection(match[1]),
    question: question.replace(SECTION_MARKER_PATTERN, "").trim(),
  };
}

export function splitPassageQuestion(questionText: string) {
  const normalized = questionText.trim();
  const passageMatch = normalized.match(PASSAGE_QUESTION_PATTERN);
  const dataMatch = normalized.match(DATA_QUESTION_PATTERN);

  if (passageMatch) {
    return {
      label: "Passage",
      passage: passageMatch[1]?.trim() || "",
      question: passageMatch[2]?.trim() || normalized,
    };
  }

  if (dataMatch) {
    return {
      label: "Data",
      passage: dataMatch[1]?.trim() || "",
      question: dataMatch[2]?.trim() || normalized,
    };
  }

  return {
    label: null,
    passage: null,
    question: normalized,
  };
}

export function getQuizDurationSeconds(
  quizType: string | null | undefined,
  totalQuestions: number
) {
  const normalizedType = (quizType || "").toLowerCase();

  if (normalizedType === "mock" && totalQuestions >= CLAT_TOTAL_QUESTIONS) {
    return CLAT_DURATION_SECONDS;
  }

  return Math.max(totalQuestions, 1) * 60;
}

export type ScoreableQuestion = {
  userAnswer?: string | null;
  correctAnswer: string;
  question?: string;
  section?: string | null;
};

export function calculateClatScore(
  questions: ScoreableQuestion[],
  fallbackSection?: string | null
) {
  const sectionStats = new Map<
    ClatSectionName,
    {
      total: number;
      correct: number;
      wrong: number;
      unanswered: number;
      netScore: number;
    }
  >();

  for (const section of CLAT_SECTIONS) {
    sectionStats.set(section.name, {
      total: 0,
      correct: 0,
      wrong: 0,
      unanswered: 0,
      netScore: 0,
    });
  }

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  for (const item of questions) {
    const section = item.question
      ? stripQuestionSection(item.question, item.section || fallbackSection)
        .section
      : normalizeClatSection(item.section || fallbackSection);
    const stats = sectionStats.get(section) || {
      total: 0,
      correct: 0,
      wrong: 0,
      unanswered: 0,
      netScore: 0,
    };

    stats.total += 1;

    if (!item.userAnswer) {
      unanswered += 1;
      stats.unanswered += 1;
    } else if (item.userAnswer === item.correctAnswer) {
      correct += 1;
      stats.correct += 1;
      stats.netScore += 1;
    } else {
      wrong += 1;
      stats.wrong += 1;
      stats.netScore -= CLAT_NEGATIVE_MARK;
    }

    sectionStats.set(section, stats);
  }

  const attempted = correct + wrong;
  const total = questions.length;
  const netScore = correct - wrong * CLAT_NEGATIVE_MARK;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  return {
    total,
    attempted,
    correct,
    wrong,
    unanswered,
    netScore,
    accuracy,
    sections: Array.from(sectionStats.entries())
      .map(([name, stats]) => ({
        name,
        ...stats,
        accuracy:
          stats.correct + stats.wrong > 0
            ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
            : 0,
      }))
      .filter((stats) => stats.total > 0),
  };
}

export function formatClatScore(score: number) {
  return Number.isInteger(score) ? score.toString() : score.toFixed(2);
}
