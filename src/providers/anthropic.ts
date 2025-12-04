import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIContext } from "../types.js";

export interface AnthropicProviderOptions {
  apiKey: string;
  model?: string;
}

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(options: AnthropicProviderOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model ?? "claude-sonnet-4-20250514";
  }

  async generate(prompt: string, context: AIContext): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text content in Anthropic response");
      }
      return textBlock.text;
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(`Anthropic API error: ${error.message}`);
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
