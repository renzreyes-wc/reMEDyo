/**
 * The one seam between this application and any model.
 *
 * Feature modules depend on this interface and never on an HTTP client, so
 * swapping the runtime, the model or the transport touches one file. Prompt
 * builders live beside it as pure functions over already-loaded rows, which
 * is what the unit tests exercise.
 */

export interface GenerateRequest {
  prompt: string;
  system: string;
  maxTokens?: number;
}

export interface GenerateSuccess {
  ok: true;
  text: string;
  /** The model that actually produced this, recorded on whatever we store. */
  model: string;
}

/**
 * Disabled, unreachable, timed out and unparseable are deliberately one
 * shape. The caller renders one absent-assistance state regardless of cause,
 * so there is one path and one set of tests rather than four.
 */
export interface GenerateUnavailable {
  ok: false;
  reason: 'disabled' | 'unreachable' | 'timeout' | 'invalid-response';
}

export type GenerateResult = GenerateSuccess | GenerateUnavailable;

export abstract class LlmProvider {
  /** Whether an assist surface should be offered at all. */
  abstract isEnabled(): boolean;

  /** The configured model name, for provenance on stored artefacts. */
  abstract modelName(): string;

  abstract generate(request: GenerateRequest): Promise<GenerateResult>;
}
