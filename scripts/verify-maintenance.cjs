const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repository = path.resolve(__dirname, '..');
const root = fs.mkdtempSync(
  path.join(os.tmpdir(), 'user-metadata-maintenance-')
);
const environment = { ...process.env, HUSKY: '1' };
for (const key of [
  'CI',
  'NODE_ENV',
  'npm_config_omit',
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
]) {
  delete environment[key];
}

function run(cwd, command, args, env = environment, success = true) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (success && result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`
    );
  }
  if (!success) assert.notEqual(result.status, 0, 'Expected a failing gate');
  return result;
}

function fixture(name, git = false) {
  const directory = path.join(root, name);
  fs.mkdirSync(directory);
  for (const file of ['package.json', 'package-lock.json']) {
    fs.copyFileSync(path.join(repository, file), path.join(directory, file));
  }
  if (git) {
    fs.cpSync(
      path.join(repository, '.husky', 'pre-commit'),
      path.join(directory, '.husky', 'pre-commit')
    );
    run(directory, 'git', ['init', '-q']);
    run(directory, 'git', ['config', 'user.name', 'Maintenance fixture']);
    run(directory, 'git', ['config', 'user.email', 'fixture@example.invalid']);
    run(directory, 'git', ['config', 'commit.gpgsign', 'false']);
  }
  return directory;
}

try {
  const developer = fixture('developer', true);
  for (const file of [
    '.gitignore',
    '.prettierrc',
    '.prettierignore',
    'eslint.config.mjs',
    'eslint-suppressions.json',
  ]) {
    fs.copyFileSync(path.join(repository, file), path.join(developer, file));
  }
  for (const directory of [
    'src',
    'test',
    'docs',
    'specs/002-code-maintenance',
    '.github/workflows',
  ]) {
    fs.cpSync(
      path.join(repository, directory),
      path.join(developer, directory),
      { recursive: true }
    );
  }
  fs.mkdirSync(path.join(developer, 'scripts'));
  fs.copyFileSync(
    __filename,
    path.join(developer, 'scripts', path.basename(__filename))
  );
  run(developer, 'npm', ['ci', '--no-audit', '--no-fund']);
  assert.equal(
    run(developer, 'git', ['config', '--get', 'core.hooksPath']).stdout.trim(),
    '.husky/_'
  );
  run(developer, 'npm', ['run', 'format:check']);

  const sample = path.join(developer, 'src', 'maintenance-fixture.ts');
  fs.writeFileSync(
    sample,
    'export const staged = 1;\nexport const unstaged = 1;\n'
  );
  run(developer, 'git', ['add', 'src/maintenance-fixture.ts']);
  run(developer, 'git', ['commit', '-qm', 'Fixture baseline']);
  fs.writeFileSync(
    sample,
    'export const staged=2;\nexport const unstaged = 1;\n'
  );
  run(developer, 'git', ['add', 'src/maintenance-fixture.ts']);
  fs.writeFileSync(
    sample,
    'export const staged=2;\nexport const unstaged = 3;\n'
  );
  const untouched = path.join(developer, 'src', 'unstaged-fixture.ts');
  fs.writeFileSync(untouched, 'export const untouched=4;\n');
  const generated = path.join(developer, 'contracts', 'generated.ts');
  fs.mkdirSync(path.dirname(generated));
  fs.writeFileSync(generated, 'export const generated=5;\n');
  run(developer, 'git', ['add', 'contracts/generated.ts']);
  run(developer, 'git', ['commit', '-qm', 'Fixture partial staging']);
  assert.equal(
    run(developer, 'git', ['show', 'HEAD:src/maintenance-fixture.ts']).stdout,
    'export const staged = 2;\nexport const unstaged = 1;\n'
  );
  assert.equal(
    fs.readFileSync(sample, 'utf8'),
    'export const staged = 2;\nexport const unstaged = 3;\n'
  );
  assert.equal(
    fs.readFileSync(untouched, 'utf8'),
    'export const untouched=4;\n'
  );
  assert.equal(
    fs.readFileSync(generated, 'utf8'),
    'export const generated=5;\n'
  );
  assert.equal(
    run(developer, 'git', ['show', 'HEAD:contracts/generated.ts']).stdout,
    'export const generated=5;\n'
  );
  console.log(
    'PASS: developer install, staged formatting, partial/unstaged preservation and generated exclusion'
  );

  fs.writeFileSync(sample, 'export const broken = ;\n');
  run(developer, 'git', ['add', 'src/maintenance-fixture.ts']);
  const head = run(developer, 'git', ['rev-parse', 'HEAD']).stdout;
  const blocked = run(
    developer,
    'git',
    ['commit', '-qm', 'Must not commit'],
    environment,
    false
  );
  assert.match(blocked.stdout + blocked.stderr, /pre-commit script failed/);
  assert.match(blocked.stdout + blocked.stderr, /maintenance-fixture\.ts/);
  assert.equal(run(developer, 'git', ['rev-parse', 'HEAD']).stdout, head);
  assert.equal(fs.readFileSync(sample, 'utf8'), 'export const broken = ;\n');
  console.log(
    'PASS: formatter failure blocks commit and restores staged content'
  );

  fs.writeFileSync(sample, 'export const staged=9;\n');
  const before = fs.readFileSync(sample);
  const rejected = run(
    developer,
    'npm',
    ['run', 'format:check'],
    { ...environment, CI: 'true' },
    false
  );
  assert.match(rejected.stdout + rejected.stderr, /maintenance-fixture\.ts/);
  assert.deepEqual(fs.readFileSync(sample), before);
  console.log(
    'PASS: exact CI formatting command rejects a violation without mutation'
  );

  const ci = fixture('ci', true);
  run(ci, 'npm', ['ci', '--no-audit', '--no-fund'], {
    ...environment,
    CI: 'true',
  });
  assert.equal(
    run(
      ci,
      'git',
      ['config', '--local', '--get', 'core.hooksPath'],
      environment,
      false
    ).status,
    1
  );
  run(ci, 'npm', ['run', 'prepare'], { ...environment, HUSKY: '0' });
  assert.equal(
    run(
      ci,
      'git',
      ['config', '--local', '--get', 'core.hooksPath'],
      environment,
      false
    ).status,
    1
  );
  console.log('PASS: CI and HUSKY=0 skip hook installation');

  const noGit = fixture('package-only');
  run(noGit, 'npm', ['ci', '--no-audit', '--no-fund']);
  console.log('PASS: Docker-order package-only/no-Git npm ci');

  const production = fixture('production', true);
  run(production, 'npm', ['ci', '--omit=dev', '--no-audit', '--no-fund'], {
    ...environment,
    NODE_ENV: 'production',
  });
  assert.equal(
    fs.existsSync(path.join(production, 'node_modules', 'husky')),
    false
  );
  assert.equal(
    run(
      production,
      'git',
      ['config', '--local', '--get', 'core.hooksPath'],
      environment,
      false
    ).status,
    1
  );
  console.log('PASS: production omit-dev installation without hook tools');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
