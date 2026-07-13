import { tool } from "ai";
import { z } from "zod";

export const suggestQuizCreation = () =>
  tool({
    description:
      "Present a modal/interactive UI card to the user proposing to create a Quiz for CLAT or exam preparation based on the given topic. Use this whenever a user asks about CLAT, exams, or test prep.",
    inputSchema: z.object({
      topic: z
        .string()
        .describe("The specific legal or exam topic to create a quiz for (e.g., 'Constitutional Law', 'Contracts', 'CLAT Prep')"),
      subject: z
        .string()
        .optional()
        .describe("The broader subject area if applicable"),
    }),
    execute: async ({ topic, subject }) => {
      // Return parameters directly. The UI will render the modal.
      return {
        topic,
        subject: subject || "General Law",
        message: `I can generate a professional 10-question quiz on ${topic} for your exam preparation.`,
      };
    },
  });
