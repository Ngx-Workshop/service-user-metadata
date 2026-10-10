import { sectionProgress, WorkshopSource } from './workshop-progress.policy';

const section = { _id: 'angular', sectionTitle: 'Angular' };
const workshops: WorkshopSource[] = [
  {
    _id: 'a',
    sectionId: 'angular',
    name: 'A',
    summary: '',
    sortId: 0,
    level: 1,
    workshopDocuments: [],
  },
  {
    _id: 'b',
    sectionId: 'angular',
    name: 'B',
    summary: '',
    sortId: 1,
    level: 1,
    workshopDocuments: [],
  },
  {
    _id: 'c',
    sectionId: 'angular',
    name: 'C',
    summary: '',
    sortId: 0,
    level: 2,
    workshopDocuments: [],
  },
  {
    _id: 'd',
    sectionId: 'rxjs',
    name: 'D',
    summary: '',
    sortId: 0,
    level: 1,
    workshopDocuments: [],
  },
];
const assessment = {
  subject: 'angular',
  completedCount: 1,
  highestPassedLevel: 0,
  tests: [{ status: 'completed' }],
};
const progress = { startedWorkshopIds: [], completedWorkshopIds: [] };

describe('Workshop eligibility policy', () => {
  it('hides all workshops until an assessment is completed, even with recorded progress', () => {
    const result = sectionProgress(section, workshops, undefined, {
      ...progress,
      completedWorkshopIds: ['a', 'b'],
    });
    expect(result.unlockedLevel).toBe(0);
    expect(result.workshops).toEqual([]);
  });
  it('allows foundation study after a failed initial assessment', () => {
    const result = sectionProgress(section, workshops, assessment, progress);
    expect(result.workshops.map((w) => w._id)).toEqual(['a', 'b']);
    expect(result.unlockedLevel).toBe(1);
    expect(result.lockedCount).toBe(1);
  });
  it('requires every workshop at a level, and does not count other sections', () => {
    const result = sectionProgress(section, workshops, assessment, {
      ...progress,
      completedWorkshopIds: ['a', 'd'],
    });
    expect(result.unlockedLevel).toBe(1);
  });
  it('unlocks the next level when both foundation workshops are complete', () => {
    const result = sectionProgress(section, workshops, assessment, {
      ...progress,
      completedWorkshopIds: ['a', 'b', 'b'],
    });
    expect(result.unlockedLevel).toBe(2);
    expect(result.completedCount).toBe(2);
    expect(result.workshops.find((w) => w._id === 'c')?.status).toBe(
      'available'
    );
  });
  it('places learners at their highest passed assessment level', () => {
    expect(
      sectionProgress(
        section,
        workshops,
        { ...assessment, highestPassedLevel: 2 },
        progress
      ).unlockedLevel
    ).toBe(2);
  });
  it('advances to the next configured level across gaps', () => {
    const catalog = workshops.map((w) =>
      w._id === 'c' ? { ...w, level: 4 } : w
    );
    expect(
      sectionProgress(section, catalog, assessment, {
        ...progress,
        completedWorkshopIds: ['a', 'b'],
      }).unlockedLevel
    ).toBe(4);
  });
  it('supports workshops created before levels were added and resumes started records', () => {
    const catalog = workshops.map((w) =>
      w._id === 'a' ? { ...w, level: undefined } : w
    );
    const result = sectionProgress(section, catalog, assessment, {
      ...progress,
      startedWorkshopIds: ['a'],
    });
    expect(result.workshops[0].level).toBe(1);
    expect(result.workshops[0].status).toBe('in-progress');
  });
  it('does not unlock a later level because of a completion beyond the current level', () => {
    const catalog = [...workshops, { ...workshops[2], _id: 'e', level: 3 }];
    const result = sectionProgress(section, catalog, assessment, {
      ...progress,
      completedWorkshopIds: ['c'],
    });
    expect(result.workshops.map((w) => w._id)).toEqual(['a', 'b']);
  });
});
