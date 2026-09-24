import { Injectable, Logger } from '@nestjs/common';
import { LlmConfig } from './llm.config';
import {
  LlmProvider,
  type GenerateRequest,
  type GenerateResult,
} from './llm.provider';

/**
 * HTTP-backed provider over the local model server.
 *
 * Plain `fetch` with an `AbortSignal.timeout` — Node 20 has both, and adding
 * an HTTP client for one POST is not worth a dependency. Every failure is
 * caught and reported as unavailability: a model that is down, still pulling,
 * or slow must never surface as a 500 on a clinician's screen.
 */
@Injectable()
export class OllamaProvider extends LlmProvider {
  private readonly logger = new Logger(OllamaProvider.name);

  constructor(private readonly config: LlmConfig) {
    super();
  }

  isEnabled(): boolean {
    return true;
  }

  modelName(): string {
    return this.config.model;
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt: request.prompt,
          system: request.system,
          stream: false,
          // Constrained decode: ask for JSON rather than hoping for it.
          format: 'json',
          options: {
            num_predict: request.maxTokens ?? this.config.maxTokens,
            // Low temperature: this is summarisation, not composition.
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!response.ok) {
        this.logger.warn(`Model runtime returned ${response.status}.`);
        return { ok: false, reason: 'unreachable' };
      }

      const payload = (await response.json()) as { response?: unknown };
      if (typeof payload.response !== 'string') {
        return { ok: false, reason: 'invalid-response' };
      }

      return { ok: true, text: payload.response, model: this.config.model };
    } catch (error) {
      // TimeoutError is what AbortSignal.timeout throws when it fires.
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      this.logger.warn(
        `Generation ${timedOut ? 'timed out' : 'failed'}: ${(error as Error).message}`,
      );
      return { ok: false, reason: timedOut ? 'timeout' : 'unreachable' };
    }
  }
}
