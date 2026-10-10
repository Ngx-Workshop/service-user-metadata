import {
  EligibleWorkshopDto,
  JourneyEntryDto,
  WorkshopSectionProgressDto,
} from './workshop-progress.dto';

export interface SectionSource {
  _id: string;
  sectionTitle: string;
  sectionDescription?: string;
}
export interface WorkshopSource {
  _id: string;
  sectionId: string;
  name: string;
  summary: string;
  level?: number;
  sortId: number;
  workshopDocuments: JourneyEntryDto[];
}
export interface AssessmentSource {
  subject: string;
  completedCount: number;
  highestPassedLevel: number;
  tests: { status: string }[];
}
export interface ProgressSource {
  startedWorkshopIds: string[];
  completedWorkshopIds: string[];
}

/** Derive access; clients never write placement or unlocked levels. */
export function sectionProgress(
  section: SectionSource,
  all: WorkshopSource[],
  assessment: AssessmentSource | undefined,
  progress: ProgressSource
): WorkshopSectionProgressDto {
  const workshops = all
    .filter((w) => w.sectionId === section._id)
    .map((w) => ({ ...w, level: w.level ?? 1 }));
  const completed = new Set(progress.completedWorkshopIds);
  const assessed = (assessment?.completedCount ?? 0) > 0;
  let unlockedLevel = assessed
    ? Math.max(1, Math.min(20, assessment?.highestPassedLevel ?? 0))
    : 0;
  const levels = [...new Set(workshops.map((w) => w.level))].sort(
    (a, b) => a - b
  );
  if (assessed) {
    for (const level of levels) {
      if (level > unlockedLevel) break;
      const atLevel = workshops.filter((w) => w.level === level);
      if (atLevel.every((w) => completed.has(w._id))) {
        unlockedLevel = Math.max(
          unlockedLevel,
          levels.find((l) => l > level) ?? level
        );
      }
    }
  }
  const eligible: EligibleWorkshopDto[] = workshops
    .filter((w) => assessed && w.level <= unlockedLevel)
    .sort(
      (a, b) =>
        a.level - b.level || a.sortId - b.sortId || a.name.localeCompare(b.name)
    )
    .map((w) => ({
      ...w,
      status: completed.has(w._id)
        ? 'completed'
        : progress.startedWorkshopIds.includes(w._id)
          ? 'in-progress'
          : 'available',
    }));
  return {
    sectionId: section._id,
    title: section.sectionTitle,
    description: section.sectionDescription ?? '',
    assessmentCompleted: assessed,
    assessmentAvailable:
      assessment?.tests.some((t) =>
        ['available', 'in-progress'].includes(t.status)
      ) ?? false,
    unlockedLevel,
    totalCount: workshops.length,
    completedCount: eligible.filter((w) => w.status === 'completed').length,
    lockedCount: workshops.length - eligible.length,
    workshops: eligible,
  };
}
