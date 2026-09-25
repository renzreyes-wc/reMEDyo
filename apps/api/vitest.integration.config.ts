import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * The integration suite: tests that boot the real application and drive it over
 * HTTP against a real database.
 *
 * Kept separate from `vitest.config.ts` on purpose. The pure-function tests
 * need no database, run in well under a second, and are what a developer wants
 * on every save; these need a database and a booted application, and are what a
 * reviewer wants before a merge. One config that did both would make the fast
 * layer as slow as the slow one.
 */
export default defineConfig({
  plugins: [
    /**
     * Nest's injector reads `design:paramtypes` — the decorator metadata a
     * TypeScript compiler emits — to decide what to construct a class with.
     * Vitest transforms with esbuild, which does not emit it, so under the
     * default transform every constructor-injected dependency arrives
     * `undefined` and the first request through a guard fails with "Cannot read
     * properties of undefined".
     *
     * This is a test-transform problem only: `nest build` uses tsc, which does
     * emit the metadata, which is why the deployed application is unaffected.
     * The pure-function tests never hit it because they construct nothing
     * through injection.
     */
    swc.vite({
      jsc: {
        target: 'es2021',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],

  test: {
    include: ['test/**/*.spec.ts'],
    environment: 'node',

    setupFiles: ['./test/setup.ts'],

    // A test here starts a Nest application and pays for a database round trip
    // that a pure function does not. The default 5s is a coin toss on a cold
    // application start.
    testTimeout: 30_000,
    hookTimeout: 30_000,

    // Every test shares one database, so two files running at once would
    // truncate each other's fixtures mid-test. Sequential files, and the
    // isolation guarantee is each file's own reset rather than luck.
    fileParallelism: false,
  },
});
