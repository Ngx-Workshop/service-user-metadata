const mongoose = require('mongoose');
const {
  assertLocalDatabase,
  localMode,
  localDatabaseUri,
} = require('../src/local-development/local-development');
const {
  UserMetadata,
  UserMetadataSchema,
} = require('../src/user-metadata/schemas/user-metadata.schema');

async function seed() {
  assertLocalDatabase();
  if (!localMode()) throw new Error('Use npm run seed:local');
  await mongoose.connect(localDatabaseUri);
  const users = mongoose.model(UserMetadata.name, UserMetadataSchema);
  const fixtures = [
    ['local-user-metadata-admin', 'admin', 'Local', 'Admin'],
    ['local-user-regular', 'regular', 'Demo', 'Learner'],
    ['local-user-publisher', 'publisher', 'Demo', 'Publisher'],
  ];
  for (const [uuid, role, firstName, lastName] of fixtures) {
    await users.updateOne(
      { uuid },
      {
        $setOnInsert: {
          uuid,
          role,
          firstName,
          lastName,
          email: `${uuid}@example.invalid`,
          avatarUrl: 'https://example.invalid/avatar.svg',
          description: 'Synthetic local development user',
        },
      },
      { upsert: true, runValidators: true }
    );
  }
  console.log(
    'Three synthetic fixtures are available in user_metadata_local; existing edits preserved.'
  );
}
seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
