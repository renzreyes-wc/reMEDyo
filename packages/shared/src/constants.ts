/**
 * Application-wide tunables.
 *
 * design.md records slot duration and the join window as deferred open
 * questions: they are constants, and changing one alters no spec and no task.
 * They live here so there is exactly one place to change them.
 */

/** Length of one bookable consultation slot, in minutes. */
export const SLOT_DURATION_MINUTES = 30;

/** How long before the scheduled start a participant may join. */
export const JOIN_WINDOW_BEFORE_MINUTES = 15;

/** How long after the scheduled end a participant may still join. */
export const JOIN_WINDOW_AFTER_MINUTES = 15;

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
