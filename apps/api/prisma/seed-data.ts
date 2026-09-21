/**
 * Demo content for the seed.
 *
 * Kept apart from the seeding logic so the fiction is easy to read and easy to
 * extend. Every person, credential, and clinical detail here is invented.
 */

import { Specialization } from '@prisma/client';

export const DEMO_PASSWORD = 'Password123!';
export const ADMIN_PASSWORD = 'Admin123!';

/** Monday–Friday 09:00–12:00 and 13:00–17:00, as minutes from midnight. */
const WEEKDAY_MORNINGS = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  startMinute: 9 * 60,
  endMinute: 12 * 60,
}));
const WEEKDAY_AFTERNOONS = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  startMinute: 13 * 60,
  endMinute: 17 * 60,
}));
const FULL_WEEK = [...WEEKDAY_MORNINGS, ...WEEKDAY_AFTERNOONS];

const MORNINGS_ONLY = WEEKDAY_MORNINGS;

const MIDWEEK = [2, 4].map((dayOfWeek) => ({
  dayOfWeek,
  startMinute: 10 * 60,
  endMinute: 16 * 60,
}));

export interface SeedDoctor {
  key: string;
  email: string;
  fullName: string;
  specializations: Specialization[];
  bio: string;
  yearsExperience: number;
  licenseNumber: string;
  consultationFee: number;
  approved: boolean;
  availability: { dayOfWeek: number; startMinute: number; endMinute: number }[];
}

export const SEED_DOCTORS: SeedDoctor[] = [
  {
    key: 'santos',
    email: 'dr.santos@remedyo.test',
    fullName: 'Maria Santos',
    specializations: [Specialization.GENERAL_PRACTICE],
    bio: 'Family physician with a focus on preventive care and chronic disease management. I believe most health worries are best handled early, in plain language, without a referral you did not need.',
    yearsExperience: 12,
    licenseNumber: 'PRC-0112233',
    consultationFee: 800,
    approved: true,
    availability: FULL_WEEK,
  },
  {
    key: 'cruz',
    email: 'dr.cruz@remedyo.test',
    fullName: 'Antonio Cruz',
    specializations: [Specialization.CARDIOLOGY],
    bio: 'Cardiologist working mainly with hypertension, arrhythmia, and post-event follow-up. I spend most of a first consultation on history, because the story usually points at the answer.',
    yearsExperience: 18,
    licenseNumber: 'PRC-0223344',
    consultationFee: 1800,
    approved: true,
    availability: [...WEEKDAY_MORNINGS, { dayOfWeek: 3, startMinute: 13 * 60, endMinute: 17 * 60 }],
  },
  {
    key: 'reyes',
    email: 'dr.reyes@remedyo.test',
    fullName: 'Liza Reyes',
    specializations: [Specialization.DERMATOLOGY],
    bio: 'Dermatologist treating acne, eczema, and pigmentation concerns. Teleconsultation works well here: good photographs and a clear history get most skin questions a long way.',
    yearsExperience: 9,
    licenseNumber: 'PRC-0334455',
    consultationFee: 1200,
    approved: true,
    availability: FULL_WEEK,
  },
  {
    key: 'bautista',
    email: 'dr.bautista@remedyo.test',
    fullName: 'Miguel Bautista',
    specializations: [Specialization.PEDIATRICS],
    bio: 'Pediatrician seeing newborns through adolescents. Parents usually know when something is off, and a consultation should start by taking that seriously.',
    yearsExperience: 15,
    licenseNumber: 'PRC-0445566',
    consultationFee: 1000,
    approved: true,
    availability: FULL_WEEK,
  },
  {
    key: 'lim',
    email: 'dr.lim@remedyo.test',
    fullName: 'Andrea Lim',
    specializations: [Specialization.PSYCHIATRY],
    bio: 'Psychiatrist working with anxiety, mood disorders, and burnout. Sessions are unhurried; the first one is mostly listening.',
    yearsExperience: 11,
    licenseNumber: 'PRC-0556677',
    consultationFee: 1500,
    approved: true,
    availability: [...MIDWEEK, { dayOfWeek: 6, startMinute: 9 * 60, endMinute: 12 * 60 }],
  },
  {
    key: 'ocampo',
    email: 'dr.ocampo@remedyo.test',
    fullName: 'Rafael Ocampo',
    specializations: [Specialization.ORTHOPEDICS],
    bio: 'Orthopedic surgeon focused on sports injury and joint pain. Plenty of what walks in does not need surgery, and I will say so.',
    yearsExperience: 20,
    licenseNumber: 'PRC-0667788',
    consultationFee: 1600,
    approved: true,
    availability: MORNINGS_ONLY,
  },
  {
    key: 'villanueva',
    email: 'dr.villanueva@remedyo.test',
    fullName: 'Grace Villanueva',
    specializations: [Specialization.OBSTETRICS_GYNECOLOGY],
    bio: 'OB-GYN covering prenatal care, cycle concerns, and routine screening. I try to make a first appointment feel like a conversation rather than an examination.',
    yearsExperience: 14,
    licenseNumber: 'PRC-0778899',
    consultationFee: 1400,
    approved: true,
    availability: FULL_WEEK,
  },
  {
    key: 'mendoza',
    email: 'dr.mendoza@remedyo.test',
    fullName: 'Paolo Mendoza',
    specializations: [Specialization.GASTROENTEROLOGY, Specialization.ENDOCRINOLOGY],
    bio: 'Internal medicine subspecialist in digestive and metabolic conditions, including diabetes and thyroid care. Interested in the overlap between the two, which is larger than most people expect.',
    yearsExperience: 7,
    licenseNumber: 'PRC-0889900',
    consultationFee: 1300,
    approved: true,
    availability: MIDWEEK,
  },
  {
    // Deliberately left pending so the admin review queue has something in it
    // on first boot. Without this the approval flow cannot be demonstrated.
    key: 'aquino',
    email: 'dr.aquino@remedyo.test',
    fullName: 'Carlo Aquino',
    specializations: [Specialization.NEUROLOGY],
    bio: 'Neurologist with an interest in headache disorders and seizure management. Recently relocated and applying to consult through reMEDyo.',
    yearsExperience: 10,
    licenseNumber: 'PRC-0990011',
    consultationFee: 1700,
    approved: false,
    availability: WEEKDAY_MORNINGS,
  },
];

export interface SeedSymptom {
  symptomId: string;
  label: string;
  emergency: boolean;
  keywords: string;
  /** specialization -> weight. Higher weight is a stronger signal. */
  weights: Partial<Record<Specialization, number>>;
}

/**
 * The matching rule table.
 *
 * Scoring sums the weights of every rule whose symptom the patient submitted.
 * A symptom may point at more than one specialty with different strength —
 * shortness of breath is mostly pulmonary but genuinely cardiac too — which is
 * why weight lives on the rule rather than on the symptom.
 */
export const SEED_SYMPTOMS: SeedSymptom[] = [
  {
    symptomId: 'chest_pain',
    label: 'Chest pain or tightness',
    emergency: true,
    keywords: 'chest,tightness,angina,heart pain,pressure in chest',
    weights: { CARDIOLOGY: 5, GENERAL_PRACTICE: 1 },
  },
  {
    symptomId: 'palpitations',
    label: 'Irregular or racing heartbeat',
    emergency: false,
    keywords: 'palpitation,racing heart,irregular heartbeat,flutter',
    weights: { CARDIOLOGY: 5 },
  },
  {
    symptomId: 'high_blood_pressure',
    label: 'High blood pressure',
    emergency: false,
    keywords: 'blood pressure,hypertension,bp',
    weights: { CARDIOLOGY: 4, GENERAL_PRACTICE: 2 },
  },
  {
    symptomId: 'shortness_of_breath',
    label: 'Shortness of breath',
    emergency: true,
    keywords: 'breath,breathing,wheeze,winded,cannot breathe',
    weights: { PULMONOLOGY: 4, CARDIOLOGY: 3 },
  },
  {
    symptomId: 'cough',
    label: 'Persistent cough',
    emergency: false,
    keywords: 'cough,phlegm,mucus',
    weights: { PULMONOLOGY: 4, GENERAL_PRACTICE: 2 },
  },
  {
    symptomId: 'skin_rash',
    label: 'Rash, itching, or skin irritation',
    emergency: false,
    keywords: 'rash,itch,skin,eczema,hives,dermatitis',
    weights: { DERMATOLOGY: 5 },
  },
  {
    symptomId: 'acne',
    label: 'Acne or persistent breakouts',
    emergency: false,
    keywords: 'acne,pimple,breakout,blackhead',
    weights: { DERMATOLOGY: 5 },
  },
  {
    symptomId: 'headache',
    label: 'Frequent or severe headaches',
    emergency: false,
    keywords: 'headache,migraine,head pain',
    weights: { NEUROLOGY: 4, GENERAL_PRACTICE: 2 },
  },
  {
    symptomId: 'dizziness',
    label: 'Dizziness or fainting',
    emergency: false,
    keywords: 'dizzy,dizziness,faint,vertigo,lightheaded',
    weights: { NEUROLOGY: 3, CARDIOLOGY: 2 },
  },
  {
    symptomId: 'seizure',
    label: 'Seizure or loss of consciousness',
    emergency: true,
    keywords: 'seizure,convulsion,unconscious,blackout',
    weights: { NEUROLOGY: 5 },
  },
  {
    symptomId: 'joint_pain',
    label: 'Joint, back, or muscle pain',
    emergency: false,
    keywords: 'joint,knee,back pain,shoulder,muscle,sprain',
    weights: { ORTHOPEDICS: 5 },
  },
  {
    symptomId: 'injury',
    label: 'Recent injury or suspected fracture',
    emergency: true,
    keywords: 'fracture,broken,injury,accident,fall',
    weights: { ORTHOPEDICS: 5 },
  },
  {
    symptomId: 'stomach_pain',
    label: 'Stomach or abdominal pain',
    emergency: false,
    keywords: 'stomach,abdominal,belly,nausea,vomit',
    weights: { GASTROENTEROLOGY: 5, GENERAL_PRACTICE: 1 },
  },
  {
    symptomId: 'digestive_change',
    label: 'Diarrhea, constipation, or digestive change',
    emergency: false,
    keywords: 'diarrhea,constipation,bowel,digestion,ibs',
    weights: { GASTROENTEROLOGY: 5 },
  },
  {
    symptomId: 'anxiety',
    label: 'Anxiety, panic, or constant worry',
    emergency: false,
    keywords: 'anxiety,anxious,panic,stress,worry',
    weights: { PSYCHIATRY: 5 },
  },
  {
    symptomId: 'low_mood',
    label: 'Low mood or loss of interest',
    emergency: false,
    keywords: 'depress,sad,mood,hopeless,no motivation',
    weights: { PSYCHIATRY: 5 },
  },
  {
    symptomId: 'sleep_problems',
    label: 'Trouble sleeping',
    emergency: false,
    keywords: 'sleep,insomnia,cannot sleep,awake',
    weights: { PSYCHIATRY: 3, GENERAL_PRACTICE: 2 },
  },
  {
    symptomId: 'child_unwell',
    label: 'A child is unwell',
    emergency: false,
    keywords: 'child,kid,baby,infant,toddler,son,daughter',
    // Weighted high on purpose: once a child is mentioned it should dominate
    // whatever generic symptom came with it, so "my child has a fever" reaches
    // a paediatrician rather than summing its way to general practice.
    weights: { PEDIATRICS: 10 },
  },
  {
    symptomId: 'pregnancy',
    label: 'Pregnancy or prenatal care',
    emergency: false,
    keywords: 'pregnan,prenatal,expecting,trimester',
    // Same reasoning as child_unwell: pregnancy reframes every other symptom.
    weights: { OBSTETRICS_GYNECOLOGY: 10 },
  },
  {
    symptomId: 'menstrual',
    label: 'Menstrual or reproductive health concern',
    emergency: false,
    keywords: 'period,menstrual,cycle,cramps,pcos',
    weights: { OBSTETRICS_GYNECOLOGY: 5 },
  },
  {
    symptomId: 'fatigue',
    label: 'Ongoing fatigue or low energy',
    emergency: false,
    keywords: 'fatigue,tired,exhausted,no energy',
    weights: { ENDOCRINOLOGY: 3, GENERAL_PRACTICE: 3 },
  },
  {
    symptomId: 'weight_change',
    label: 'Unexplained weight change',
    emergency: false,
    keywords: 'weight,thyroid,diabetes,blood sugar',
    weights: { ENDOCRINOLOGY: 5, GENERAL_PRACTICE: 1 },
  },
  {
    symptomId: 'vision',
    label: 'Blurred vision or eye discomfort',
    emergency: false,
    keywords: 'vision,eye,blur,sight,seeing',
    weights: { OPHTHALMOLOGY: 5 },
  },
  {
    symptomId: 'ear_nose_throat',
    label: 'Sore throat, ear, or sinus trouble',
    emergency: false,
    keywords: 'throat,ear,nose,sinus,tonsil,hearing',
    weights: { ENT: 5, GENERAL_PRACTICE: 1 },
  },
  {
    symptomId: 'fever',
    label: 'Fever or flu-like symptoms',
    emergency: false,
    keywords: 'fever,temperature,chills,flu',
    weights: { GENERAL_PRACTICE: 5 },
  },
  {
    symptomId: 'checkup',
    label: 'General check-up or second opinion',
    emergency: false,
    keywords: 'checkup,check up,general,advice,second opinion',
    weights: { GENERAL_PRACTICE: 5 },
  },
];
