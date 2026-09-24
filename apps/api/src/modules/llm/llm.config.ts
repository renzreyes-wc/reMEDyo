import { Injectable } from '@nestjs/common';
import { LLM_MAX_TOKENS, LLM_TIMEOUT_MS } from '@remedyo/shared';

/**
 * Clinical-assist configuration.
 *
 * Read from `process.env` like the rest of this application's configuration
 * (see auth.module.ts and main.ts); ConfigModule's job here is loading .env,
 * not being injected.
 *
 * An unset environment is a disabled one. That is the important default: a
 * checkout with no model, a CI run, and a reviewer who never started the
 * fourth container all land in the same supported configuration rather than
 * in a broken one.
 */
@Injectable()
export class LlmConfig {
  /** Opt-in, and only on an explicit "true". Anything else is off. */
  readonly enabled = (process.env.LLM_ENABLED ?? 'false').toLowerCase() === 'true';

  readonly baseUrl = process.env.LLM_BASE_URL ?? 'http://ollama:11434';

  readonly model = process.env.LLM_MODEL ?? 'llama3.2:3b';

  readonly timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? LLM_TIMEOUT_MS);

  readonly maxTokens = Number(process.env.LLM_MAX_TOKENS ?? LLM_MAX_TOKENS);
}
