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
    workshopDocuments: [{ _id: 'page', kind: 'PAGE', name: 'Page', sortId: 0 }],
  },
  {
    _id: 'b',
    sectionId: 'angular',
    name: 'B',
    summary: '',
    sortId: 1,
    level: 1,
    workshopDocuments: [{ _id: 'page', kind: 'PAGE', name: 'Page', sortId: 0 }],
  },
  {
    _id: 'c',
    sectionId: 'angular',
    name: 'C',
    summary: '',
    sortId: 0,
    level: 2,
    workshopDocuments: [{ _id: 'page', kind: 'PAGE', name: 'Page', sortId: 0 }],
  },
  {
    _id: 'd',
    sectionId: 'rxjs',
    name: 'D',
    summary: '',
    sortId: 0,
    level: 1,
    workshopDocuments: [{ _id: 'page', kind: 'PAGE', name: 'Page', sortId: 0 }],
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
      startedWorkshopIds: ['a', 'd'],
      viewedPages: [
        { workshopId: 'a', pageId: 'page' },
        { workshopId: 'd', pageId: 'page' },
      ],
    });
    expect(result.unlockedLevel).toBe(1);
  });
  it('unlocks the next level when both foundation workshops are complete', () => {
    const result = sectionProgress(section, workshops, assessment, {
      ...progress,
      completedWorkshopIds: [],
      startedWorkshopIds: ['a', 'b'],
      viewedPages: [
        { workshopId: 'a', pageId: 'page' },
        { workshopId: 'b', pageId: 'page' },
      ],
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
        completedWorkshopIds: [],
        startedWorkshopIds: ['a', 'b'],
        viewedPages: [
          { workshopId: 'a', pageId: 'page' },
          { workshopId: 'b', pageId: 'page' },
        ],
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
  it('ignores legacy self-attested completion without page evidence', () => {
    const result = sectionProgress(section, workshops, assessment, {
      ...progress,
      startedWorkshopIds: ['a', 'b'],
      completedWorkshopIds: ['a', 'b'],
    });
    expect(result.completedCount).toBe(0);
    expect(result.unlockedLevel).toBe(1);
  });
  it('requires every exact assessment reference and all distinct pages regardless of visit order', () => {
    const a = {
      ...workshops[0],
      workshopDocuments: [
        ...workshops[0].workshopDocuments,
        { _id: 'p2', kind: 'PAGE' as const, name: 'Second', sortId: 1 },
        {
          _id: 'ref',
          kind: 'ASSESSMENT_TEST' as const,
          resourceId: 'required',
          name: 'Test',
          sortId: 2,
        },
      ],
    };
    const visited = {
      ...progress,
      startedWorkshopIds: ['a'],
      viewedPages: [
        { workshopId: 'a', pageId: 'p2' },
        { workshopId: 'other', pageId: 'page' },
        { workshopId: 'a', pageId: 'p2' },
      ],
    };
    const otherTest = {
      ...assessment,
      tests: [{ id: 'unrelated', status: 'completed' }],
    };
    let result = sectionProgress(section, [a], otherTest, visited);
    expect(result.workshops[0].viewedPageIds).toEqual(['p2']);
    expect(result.completedCount).toBe(0);
    visited.viewedPages.push({ workshopId: 'a', pageId: 'page' });
    result = sectionProgress(section, [a], otherTest, visited);
    expect(result.completedCount).toBe(0);
    result = sectionProgress(section, [a], assessment, visited, [
      assessment,
      {
        ...assessment,
        subject: 'another-section',
        tests: [{ id: 'required', status: 'completed' }],
      },
    ]);
    expect(result.completedCount).toBe(1);
  });
  it('does not auto-complete empty workshops or missing assessment references', () => {
    const started = { ...progress, startedWorkshopIds: ['a'] };
    expect(
      sectionProgress(
        section,
        [{ ...workshops[0], workshopDocuments: [] }],
        assessment,
        started
      ).completedCount
    ).toBe(0);
    const broken = {
      ...workshops[0],
      workshopDocuments: [
        {
          _id: 'missing',
          kind: 'ASSESSMENT_TEST' as const,
          name: 'Missing',
          sortId: 0,
        },
      ],
    };
    expect(
      sectionProgress(section, [broken], assessment, started).completedCount
    ).toBe(0);
  });
});
