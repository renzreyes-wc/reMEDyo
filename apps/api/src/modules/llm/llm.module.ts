import { Global, Module } from '@nestjs/common';
import { DisabledLlmProvider } from './disabled.provider';
import { LlmConfig } from './llm.config';
import { LlmProvider } from './llm.provider';
import { OllamaProvider } from './ollama.provider';

/**
 * The provider is chosen once, at wiring time, from configuration.
 *
 * That is deliberately a deployment shape rather than a branch inside every
 * feature: with generation disabled, no feature holds anything that could
 * make a network call, and the disabled path is the one the test suite runs.
 */
@Global()
@Module({
  providers: [
    LlmConfig,
    {
      provide: LlmProvider,
      inject: [LlmConfig],
      useFactory: (config: LlmConfig) =>
        config.enabled ? new OllamaProvider(config) : new DisabledLlmProvider(),
    },
  ],
  exports: [LlmProvider, LlmConfig],
})
export class LlmModule {}
