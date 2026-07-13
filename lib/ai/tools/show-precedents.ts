import { tool } from "ai";
import { z } from "zod";

export const showPrecedents = () =>
  tool({
    description:
      "Display relevant landmark Supreme Court or High Court cases. Use this instead of typing out precedents in plain text.",
    inputSchema: z.object({
      cases: z.array(
        z.object({
          name: z.string().describe("Name of the case (e.g. 'Kesavananda Bharati v. State of Kerala')"),
          citation: z.string().describe("Citation of the case (e.g. '(1973) 4 SCC 225')"),
          summary: z.string().describe("A brief summary of the ruling or why it is relevant"),
        })
      ).describe("List of precedent cases"),
    }),
    execute: async (args: any) => {
      return args;
    },
  });
