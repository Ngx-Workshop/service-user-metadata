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
  tests: { id?: string; status: string }[];
}
export interface ProgressSource {
  startedWorkshopIds: string[];
  completedWorkshopIds: string[];
  viewedPages?: { workshopId: string; pageId: string }[];
}

export function workshopRequirements(
  workshop: WorkshopSource,
  assessments: AssessmentSource[],
  progress: ProgressSource
) {
  const pages = [
    ...new Set(
      workshop.workshopDocuments
        .filter((p) => p.kind === 'PAGE')
        .map((p) => p._id)
    ),
  ];
  const required = workshop.workshopDocuments.filter(
    (p) => p.kind === 'ASSESSMENT_TEST'
  );
  const completedTests = new Set(
    assessments
      .flatMap((a) => a.tests)
      .filter((t) => t.status === 'completed')
      .map((t) => t.id)
  );
  const viewed = new Set(
    (progress.viewedPages ?? [])
      .filter((p) => p.workshopId === workshop._id)
      .map((p) => p.pageId)
  );
  const viewedPageIds = pages.filter((id) => viewed.has(id));
  const completedAssessmentIds = [
    ...new Set(
      required
        .filter((p) => p.resourceId && completedTests.has(p.resourceId))
        .map((p) => p.resourceId!)
    ),
  ];
  const assessmentsCompleted = required.length
    ? required.every((p) => !!p.resourceId && completedTests.has(p.resourceId))
    : assessments.some(
        (a) => a.subject === workshop.sectionId && a.completedCount > 0
      );
  return {
    viewedPageIds,
    pageCount: pages.length,
    completedAssessmentIds,
    assessmentCount: new Set(required.map((p) => p.resourceId ?? p._id)).size,
    assessmentsCompleted,
    complete:
      progress.startedWorkshopIds.includes(workshop._id) &&
      (pages.length > 0 || required.length > 0) &&
      viewedPageIds.length === pages.length &&
      assessmentsCompleted,
  };
}

/** Derive access; clients never write placement or unlocked levels. */
export function sectionProgress(
  section: SectionSource,
  all: WorkshopSource[],
  assessment: AssessmentSource | undefined,
  progress: ProgressSource,
  assessments: AssessmentSource[] = assessment ? [assessment] : []
): WorkshopSectionProgressDto {
  const workshops = all
    .filter((w) => w.sectionId === section._id)
    .map((w) => ({ ...w, level: w.level ?? 1 }));
  const requirements = new Map(
    workshops.map((w) => [
      w._id,
      workshopRequirements(w, assessments, progress),
    ])
  );
  const completed = new Set(
    workshops.filter((w) => requirements.get(w._id)!.complete).map((w) => w._id)
  );
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
      viewedPageIds: requirements.get(w._id)!.viewedPageIds,
      pageCount: requirements.get(w._id)!.pageCount,
      completedAssessmentIds: requirements.get(w._id)!.completedAssessmentIds,
      assessmentCount: requirements.get(w._id)!.assessmentCount,
      assessmentsCompleted: requirements.get(w._id)!.assessmentsCompleted,
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
