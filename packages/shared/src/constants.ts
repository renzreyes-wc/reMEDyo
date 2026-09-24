/**
 * Application-wide tunables.
 *
 * design.md records slot duration as a deferred open question: it is a
 * constant, and changing it alters no spec and no task. They live here so
 * there is exactly one place to change them.
 */

/** Length of one bookable consultation slot, in minutes. */
export const SLOT_DURATION_MINUTES = 30;

/**
 * Grace after the scheduled end before an unattended appointment reads as
 * missed. It bounds a label only — joining itself is not time-limited.
 */
export const MISSED_GRACE_MINUTES = 15;

/** An appointment starting within this window is treated as imminent. */
export const IMMINENT_WINDOW_MINUTES = 60;

/** How far ahead slot derivation expands recurring availability windows. */
export const AVAILABILITY_HORIZON_DAYS = 28;

/** "Has availability soon" in the directory and in match ranking. */
export const AVAILABILITY_SOON_DAYS = 7;

/** Minimum password length accepted at registration. */
export const MIN_PASSWORD_LENGTH = 8;

/** Lifetime of the session JWT. Short, because it cannot be revoked. */
export const JWT_EXPIRES_IN = '2h';

export const SESSION_COOKIE_NAME = 'remedyo_session';

// ---------------------------------------------------------------------------
// Clinical assist
//
// The model runs locally and is allowed to be slow, but never allowed to be
// slow on a request path that matters. These bound it.
// ---------------------------------------------------------------------------

/**
 * Hard ceiling on one generation. Exceeding it abandons the attempt.
 *
 * Generous because the target machine is a reviewer's laptop running the
 * model on CPU: a full note draft measures around 45 seconds there, and a
 * slower machine will be worse. This is a ceiling that stops a request
 * hanging forever, not a latency budget — the doctor's draft action is
 * explicit and shows a loading state, and the patient summary is generated
 * off the request path entirely.
 */
export const LLM_TIMEOUT_MS = 120_000;

/** Token cap on one generation, keeping a small model from rambling. */
export const LLM_MAX_TOKENS = 800;

/**
 * Thin-transcript thresholds.
 *
 * Checked before any model call, so a transcript with nothing in it costs
 * nothing to refuse. A confidently invented note is the worst possible output
 * here, and these are what stop the model being asked for one.
 */

/** Fewer messages than this in total is not a consultation to summarise. */
export const DRAFT_MIN_MESSAGES = 4;

/** Each participant must have said at least this much for it to be an exchange. */
export const DRAFT_MIN_MESSAGES_PER_PARTICIPANT = 2;

/** Combined length of the transcript below which there is nothing to summarise. */
export const DRAFT_MIN_TRANSCRIPT_CHARS = 200;
