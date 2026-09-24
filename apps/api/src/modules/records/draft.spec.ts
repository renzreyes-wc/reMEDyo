import { describe, expect, it } from 'vitest';
import { assessTranscript, buildDraftPrompt, type TranscriptMessage } from './draft';
import { verifyCandidates } from './extraction';

const DOCTOR = 'user_doctor';
const PATIENT = 'user_patient';

function message(
  id: string,
  senderId: string,
  body: string,
  senderName = senderId === DOCTOR ? 'Dr. Cruz' : 'Jose Rizal',
): TranscriptMessage {
  return { id, senderId, senderName, body, sentAt: new Date('2026-09-20T10:00:00Z') };
}

/** A transcript long enough and balanced enough to summarise. */
const sufficient: TranscriptMessage[] = [
  message('m1', PATIENT, 'Good morning doctor, I have had a sore throat for three days now.'),
  message('m2', DOCTOR, 'Thanks for that. Any fever, or difficulty swallowing at all?'),
  message('m3', PATIENT, 'No fever that I have noticed, but swallowing is uncomfortable.'),
  message('m4', DOCTOR, 'That sounds viral. Warm fluids and rest; paracetamol if you need it.'),
];

describe('assessTranscript', () => {
  it('refuses an empty transcript, distinctly', () => {
    expect(assessTranscript([], DOCTOR)).toBe('transcript-empty');
  });

  it('refuses a transcript with too few messages', () => {
    expect(assessTranscript(sufficient.slice(0, 3), DOCTOR)).toBe('transcript-too-thin');
  });

  it('refuses a one-sided transcript even when it is long', () => {
    const oneSided = [
      message('m1', PATIENT, 'I have had a sore throat for three days now and it is getting worse.'),
      message('m2', PATIENT, 'It hurts most in the morning when I wake up, quite badly.'),
      message('m3', PATIENT, 'I have been drinking warm tea which helps a little bit.'),
      message('m4', PATIENT, 'Should I be worried about this at all, do you think?'),
    ];
    expect(assessTranscript(oneSided, DOCTOR)).toBe('transcript-too-thin');
  });

  it('refuses a transcript that is long enough in messages but not in substance', () => {
    const terse = [
      message('m1', PATIENT, 'hi'),
      message('m2', DOCTOR, 'hello'),
      message('m3', PATIENT, 'ok'),
      message('m4', DOCTOR, 'bye'),
    ];
    expect(assessTranscript(terse, DOCTOR)).toBe('transcript-too-thin');
  });

  it('accepts a real exchange', () => {
    expect(assessTranscript(sufficient, DOCTOR)).toBeNull();
  });
});

describe('buildDraftPrompt', () => {
  const meta = { reasonForVisit: 'Sore throat', startsAt: new Date('2026-09-20T10:00:00Z') };

  it('includes this appointment’s transcript and metadata', () => {
    const prompt = buildDraftPrompt(sufficient, undefined, meta, DOCTOR);
    expect(prompt).toContain('Sore throat');
    expect(prompt).toContain('sore throat for three days');
    expect(prompt).toContain('Dr. Cruz:');
    expect(prompt).toContain('[doctor]');
    expect(prompt).toContain('[patient]');
    expect(prompt).toContain('(id: m1)');
  });

  it('includes the clinical context assembled for this doctor', () => {
    const prompt = buildDraftPrompt(sufficient, {
      age: 42,
      allergies: ['Penicillin'],
      medications: ['Metformin'],
      conditions: ['Type 2 diabetes'],
    }, meta, DOCTOR);
    expect(prompt).toContain('Age: 42');
    expect(prompt).toContain('Penicillin');
    expect(prompt).toContain('Metformin');
    expect(prompt).toContain('Type 2 diabetes');
  });

  it('says so when a context list is empty rather than leaving it blank', () => {
    const prompt = buildDraftPrompt(sufficient, {
      age: null,
      allergies: [],
      medications: [],
      conditions: [],
    }, meta, DOCTOR);
    expect(prompt).toContain('none recorded');
    expect(prompt).not.toContain('Age:');
  });

  it('carries only the messages it is given, so another appointment cannot leak in', () => {
    const otherPatient = message('x1', 'user_other', 'I am a different patient entirely.');
    const prompt = buildDraftPrompt(sufficient, undefined, meta, DOCTOR);
    expect(prompt).not.toContain(otherPatient.body);
    // The only route in is the messages array the caller loaded for this one
    // appointment; there is no parameter through which another could arrive.
    expect(buildDraftPrompt.length).toBe(4);
  });
});

describe('verifyCandidates', () => {
  const transcript = [
    ...sufficient,
    message('m5', DOCTOR, 'I am prescribing amoxicillin 500mg, three times daily, for 7 days.'),
    message('m6', PATIENT, 'I will take ivermectin 12mg once daily for 5 days instead.'),
  ];

  const good = {
    medication: 'Amoxicillin',
    dosage: '500mg',
    frequency: 'three times daily',
    durationDays: 7,
    instructions: null,
    sourceMessageId: 'm5',
    excerpt: 'amoxicillin 500mg, three times daily, for 7 days',
  };

  it('accepts a candidate quoted verbatim from the doctor’s own message', () => {
    expect(verifyCandidates([good], transcript, DOCTOR)).toHaveLength(1);
  });

  it('discards a fabricated excerpt that was never said', () => {
    const fabricated = { ...good, excerpt: 'amoxicillin 875mg twice daily for 14 days' };
    expect(verifyCandidates([fabricated], transcript, DOCTOR)).toEqual([]);
  });

  it('discards a candidate sourced from the patient’s message', () => {
    const fromPatient = {
      ...good,
      medication: 'Ivermectin',
      dosage: '12mg',
      frequency: 'once daily',
      durationDays: 5,
      sourceMessageId: 'm6',
      excerpt: 'ivermectin 12mg once daily for 5 days',
    };
    expect(verifyCandidates([fromPatient], transcript, DOCTOR)).toEqual([]);
  });

  it('discards a candidate pointing at a message outside this appointment', () => {
    expect(verifyCandidates([{ ...good, sourceMessageId: 'not_in_this_appointment' }], transcript, DOCTOR)).toEqual([]);
  });

  it('tolerates reflowed whitespace in an otherwise faithful quotation', () => {
    const reflowed = { ...good, excerpt: 'Amoxicillin   500mg,\nthree times daily,  for 7 days' };
    expect(verifyCandidates([reflowed], transcript, DOCTOR)).toHaveLength(1);
  });

  it('discards a partial extraction rather than guessing the rest', () => {
    for (const missing of ['medication', 'dosage', 'frequency', 'excerpt', 'sourceMessageId']) {
      const partial: Record<string, unknown> = { ...good };
      delete partial[missing];
      expect(verifyCandidates([partial], transcript, DOCTOR)).toEqual([]);
    }
  });

  it('discards a nonsensical duration', () => {
    expect(verifyCandidates([{ ...good, durationDays: 0 }], transcript, DOCTOR)).toEqual([]);
    expect(verifyCandidates([{ ...good, durationDays: 4000 }], transcript, DOCTOR)).toEqual([]);
    expect(verifyCandidates([{ ...good, durationDays: 'a week' }], transcript, DOCTOR)).toEqual([]);
  });

  it('returns nothing for anything that is not a list of candidates', () => {
    expect(verifyCandidates(null, transcript, DOCTOR)).toEqual([]);
    expect(verifyCandidates('amoxicillin', transcript, DOCTOR)).toEqual([]);
    expect(verifyCandidates([null, 42, 'x'], transcript, DOCTOR)).toEqual([]);
  });
});
