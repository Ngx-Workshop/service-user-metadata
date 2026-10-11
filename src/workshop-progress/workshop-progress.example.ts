import { SectionSource, WorkshopSource } from './workshop-progress.policy';

export const exampleSections: SectionSource[] = [
  {
    _id: 'example-angular',
    sectionTitle: 'Angular example',
    sectionDescription:
      'Take the initial assessment, finish both level 1 workshops, then unlock level 2.',
  },
  {
    _id: 'example-rxjs',
    sectionTitle: 'RxJS example',
    sectionDescription: 'Progress in each section is independent.',
  },
];
export const exampleWorkshops: WorkshopSource[] = [
  {
    _id: 'example-components',
    sectionId: 'example-angular',
    name: 'Your first component',
    summary: 'Read both lessons and complete the workshop assessment.',
    level: 1,
    sortId: 0,
    workshopDocuments: [
      {
        _id: 'example-components-page',
        kind: 'PAGE',
        name: 'Components',
        sortId: 0,
      },
      {
        _id: 'example-components-practice',
        kind: 'PAGE',
        name: 'Practice',
        sortId: 1,
      },
      {
        _id: 'example-components-assessment',
        kind: 'ASSESSMENT_TEST',
        resourceId: 'example-components-test',
        name: 'Component assessment',
        sortId: 2,
      },
    ],
  },
  {
    _id: 'example-templates',
    sectionId: 'example-angular',
    name: 'Template basics',
    summary: 'The second required level 1 workshop.',
    level: 1,
    sortId: 1,
    workshopDocuments: [
      {
        _id: 'example-templates-page',
        kind: 'PAGE',
        name: 'Templates',
        sortId: 0,
      },
    ],
  },
  {
    _id: 'example-signals',
    sectionId: 'example-angular',
    name: 'Reactive state with signals',
    summary: 'Unlocked after completing both foundation workshops.',
    level: 2,
    sortId: 0,
    workshopDocuments: [
      { _id: 'example-signals-page', kind: 'PAGE', name: 'Signals', sortId: 0 },
    ],
  },
  {
    _id: 'example-streams',
    sectionId: 'example-rxjs',
    name: 'Observable foundations',
    summary: 'A separate section with its own initial assessment.',
    level: 1,
    sortId: 0,
    workshopDocuments: [
      {
        _id: 'example-streams-page',
        kind: 'PAGE',
        name: 'Observables',
        sortId: 0,
      },
    ],
  },
];
export const examplePages: Record<string, { name: string; html: string }> = {
  'example-components-practice': {
    name: 'Practice',
    html: '<h2>Component practice</h2><p>Change the greeting to include your name. Then complete the component assessment.</p>',
  },
  'example-components-page': {
    name: 'Components',
    html: '<h2>Your first component</h2><p>A component combines a TypeScript class, a template, and styles. A standalone component declares the dependencies its template uses.</p><pre>@Component({ selector: "hello-world", template: "Hello!" })\nexport class HelloWorld {}</pre><p>Exercise: change the greeting to include your name. Read the practice page, then complete the component assessment.</p>',
  },
  'example-templates-page': {
    name: 'Templates',
    html: '<h2>Template basics</h2><p>Angular templates display values with interpolation and respond to user actions with event bindings.</p><pre>&lt;button (click)="count.set(count() + 1)"&gt;{{ count() }}&lt;/button&gt;</pre><p>Exercise: explain which part reads the value and which part changes it.</p>',
  },
  'example-signals-page': {
    name: 'Signals',
    html: '<h2>Reactive state with signals</h2><p>A signal holds a value. Reading the signal registers a dependency; updating it lets Angular update the view.</p><pre>count = signal(0);\ndoubled = computed(() =&gt; this.count() * 2);</pre><p>Exercise: add a reset button and a computed label.</p>',
  },
  'example-streams-page': {
    name: 'Observables',
    html: '<h2>Observable foundations</h2><p>An Observable describes a stream of values over time. Operators transform or combine those values. A subscription starts listening and should end with the consumer lifecycle.</p><p>Exercise: describe how a stream of search terms differs from a single string.</p>',
  },
};
