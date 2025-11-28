import { GenerateRequest } from '../../types/domain';

export interface PromptPayload {
  prompt: string;
}

export interface PromptEngine {
  buildPrompt(input: GenerateRequest): PromptPayload;
}

export const promptEngine: PromptEngine = {
  buildPrompt(input: GenerateRequest): PromptPayload {
    const intensity = input.intensity ?? 'medium';
    // Placeholder template, real template should follow soft-design
    const prompt = `Generate an ambient background music track with mood ${input.mood}, style ${input.style}, tempo ${input.tempo} BPM, length ${input.length} seconds, intensity ${intensity}.`;
    return { prompt };
  }
};
