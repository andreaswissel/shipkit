import OpenAI from "openai";
import type { AIProvider, AIContext } from "../types.js";

export interface OpenAIProviderOptions {
  apiKey: string;
  model?: string;
}

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private client: OpenAI;
  private model: string;

  constructor(options: OpenAIProviderOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.model = options.model ?? "gpt-4o";
  }

  async generate(prompt: string, context: AIContext): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in OpenAI response");
      }
      return content;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  }

  private buildSystemPrompt(context: AIContext): string {
    const parts = [
      `You are a code generation assistant for ${context.framework} applications.`,
    ];

    if (context.components.length > 0) {
      parts.push(
        `Available components: ${context.components.map((c) => c.name).join(", ")}`
      );
    }

    if (context.style?.cssFramework) {
      parts.push(`Use ${context.style.cssFramework} for styling.`);
    }

    if (context.existingCode) {
      parts.push(`Existing code context:\n${context.existingCode}`);
    }

    return parts.join("\n");
  }
}
