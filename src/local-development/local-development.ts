export const localDatabaseUri = 'mongodb://127.0.0.1:27017/user_metadata_local';
export const localOrigins = [
  'https://admin.ngx-workshop.io',
  'http://localhost:4201',
  'http://127.0.0.1:4201',
];

export const localMode = () =>
  process.env.USER_METADATA_LOCAL_DEV === 'true' &&
  process.env.NODE_ENV === 'development';

/** Fail before opening a listener or granting the local identity. */
export function assertLocalDatabase(): void {
  if (process.env.USER_METADATA_LOCAL_DEV !== 'true') return;
  if (!localMode() || process.env.MONGODB_URI !== localDatabaseUri) {
    throw new Error(
      'Local user metadata mode requires NODE_ENV=development and the isolated user_metadata_local database on loopback'
    );
  }
}
