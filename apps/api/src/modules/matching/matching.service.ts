import { BadRequestException, Injectable } from '@nestjs/common';
import { Specialization } from '@prisma/client';
import {
  AVAILABILITY_SOON_DAYS,
  SPECIALIZATION_LABELS,
  type MatchIntake,
  type MatchResult,
  type MatchSuggestion,
  type SymptomOption,
} from '@remedyo/shared';
import { PrismaService } from '../../common/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { DoctorsService } from '../doctors/doctors.service';

const MAX_SUGGESTIONS = 6;

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly doctors: DoctorsService,
  ) {}

  /** The symptom catalogue patients choose from. */
  async catalogue(): Promise<SymptomOption[]> {
    const rules = await this.prisma.symptomRule.findMany({
      orderBy: { label: 'asc' },
    });

    // A symptom appears once in the catalogue even though it may carry several
    // specialization rules.
    const seen = new Map<string, SymptomOption>();
    for (const rule of rules) {
      const existing = seen.get(rule.symptomId);
      if (existing) {
        existing.emergency = existing.emergency || rule.emergency;
        continue;
      }
      seen.set(rule.symptomId, {
        id: rule.symptomId,
        label: rule.label,
        emergency: rule.emergency,
      });
    }

    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Deterministic matching.
   *
   * Sum the stored rule weights for every submitted symptom, rank doctors by
   * the strength of their best-matching specialty, then by availability inside
   * the soon horizon, then by experience, then by id. The last tiebreaker is
   * what makes the ranking reproducible: without it, two equal doctors could
   * come back in either order.
   *
   * No model, no external call — the rules table is the whole algorithm, and
   * the matched rows double as the explanation shown to the patient.
   */
  async match(intake: MatchIntake): Promise<MatchResult> {
    const selected = intake.symptomIds ?? [];
    const freeText = intake.freeText?.trim() ?? '';

    if (selected.length === 0 && !freeText) {
      throw new BadRequestException(
        'Tell us what is bothering you — pick a symptom or describe it.',
      );
    }

    const allRules = await this.prisma.symptomRule.findMany();

    // Free text is matched by keyword against the same catalogue, so typed
    // concerns and picked ones score through one code path.
    const fromText = freeText ? matchByKeyword(allRules, freeText) : new Set<string>();
    const symptomIds = new Set([...selected, ...fromText]);

    const matchedRules = allRules.filter((r) => symptomIds.has(r.symptomId));
    const emergencyWarning = matchedRules.some((r) => r.emergency);

    // specialization -> accumulated weight, and the concerns that fed it.
    const scores = new Map<Specialization, { weight: number; labels: Set<string> }>();
    for (const rule of matchedRules) {
      const entry = scores.get(rule.specialization) ?? { weight: 0, labels: new Set() };
      entry.weight += rule.weight;
      entry.labels.add(rule.label);
      scores.set(rule.specialization, entry);
    }

    const ranked = [...scores.entries()].sort((a, b) => b[1].weight - a[1].weight);

    let fallback = false;
    let fallbackReason: string | null = null;

    if (ranked.length === 0) {
      fallback = true;
      fallbackReason =
        'We could not match what you described to a specialty, so these are general practice doctors.';
    }

    const doctors = await this.prisma.doctorProfile.findMany({
      where: { approvalState: 'APPROVED' },
    });

    const availableSoon = await this.availability.doctorsWithUpcomingAvailability(
      doctors.map((d) => d.id),
      AVAILABILITY_SOON_DAYS,
    );

    const suggestions: MatchSuggestion[] = [];

    for (const [specialization, { weight, labels }] of ranked) {
      for (const doctor of doctors) {
        if (!doctor.specializations.includes(specialization)) continue;
        if (suggestions.some((s) => s.doctor.id === doctor.id)) continue;

        suggestions.push({
          doctor: {
            id: doctor.id,
            userId: doctor.userId,
            fullName: doctor.fullName,
            initials: initials(doctor.fullName),
            specializations: doctor.specializations,
            yearsExperience: doctor.yearsExperience,
            consultationFee: Number(doctor.consultationFee),
            bioExcerpt: doctor.bio.slice(0, 160),
            hasUpcomingAvailability: availableSoon.has(doctor.id),
            approvalState: doctor.approvalState,
          },
          score: weight,
          matchedSpecialization: specialization,
          reason: explain(labels, specialization),
        });
      }
    }

    // A specialty matched but nobody holds it — still a fallback.
    if (suggestions.length === 0) {
      fallback = true;
      fallbackReason =
        ranked.length > 0
          ? `No ${SPECIALIZATION_LABELS[ranked[0][0]]} doctor is available right now, so these are general practice doctors.`
          : fallbackReason;

      for (const doctor of doctors) {
        if (!doctor.specializations.includes(Specialization.GENERAL_PRACTICE)) continue;
        suggestions.push({
          doctor: {
            id: doctor.id,
            userId: doctor.userId,
            fullName: doctor.fullName,
            initials: initials(doctor.fullName),
            specializations: doctor.specializations,
            yearsExperience: doctor.yearsExperience,
            consultationFee: Number(doctor.consultationFee),
            bioExcerpt: doctor.bio.slice(0, 160),
            hasUpcomingAvailability: availableSoon.has(doctor.id),
            approvalState: doctor.approvalState,
          },
          score: 0,
          matchedSpecialization: Specialization.GENERAL_PRACTICE,
          reason: 'A general practitioner can assess this and refer you onward if needed.',
        });
      }
    }

    suggestions.sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.doctor.hasUpcomingAvailability) - Number(a.doctor.hasUpcomingAvailability) ||
        b.doctor.yearsExperience - a.doctor.yearsExperience ||
        a.doctor.id.localeCompare(b.doctor.id),
    );

    return {
      suggestions: suggestions.slice(0, MAX_SUGGESTIONS),
      fallback,
      fallbackReason,
      emergencyWarning,
    };
  }
}

function explain(labels: Set<string>, specialization: Specialization): string {
  const list = [...labels];
  const concerns =
    list.length === 1
      ? `“${list[0].toLowerCase()}”`
      : `${list.slice(0, -1).map((l) => `“${l.toLowerCase()}”`).join(', ')} and “${list[list.length - 1].toLowerCase()}”`;

  return `You mentioned ${concerns}, which ${SPECIALIZATION_LABELS[specialization]} covers.`;
}

function matchByKeyword(
  rules: { symptomId: string; keywords: string }[],
  text: string,
): Set<string> {
  const haystack = text.toLowerCase();
  const matched = new Set<string>();

  for (const rule of rules) {
    for (const keyword of rule.keywords.split(',')) {
      const needle = keyword.trim().toLowerCase();
      if (needle && haystack.includes(needle)) {
        matched.add(rule.symptomId);
        break;
      }
    }
  }

  return matched;
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
