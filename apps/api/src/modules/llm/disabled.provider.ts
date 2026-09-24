import { Injectable } from '@nestjs/common';
import { LlmProvider, type GenerateResult } from './llm.provider';

/**
 * What the application uses when generation is switched off.
 *
 * `LLM_ENABLED=false` is a supported configuration rather than a degraded
 * one: this makes no network call, has no timeout to wait out, and returns
 * the same unavailability shape a dead runtime returns — so disabled and down
 * share one code path and one set of tests.
 */
@Injectable()
export class DisabledLlmProvider extends LlmProvider {
  isEnabled(): boolean {
    return false;
  }

  modelName(): string {
    return 'disabled';
  }

  async generate(): Promise<GenerateResult> {
    return { ok: false, reason: 'disabled' };
  }
}
