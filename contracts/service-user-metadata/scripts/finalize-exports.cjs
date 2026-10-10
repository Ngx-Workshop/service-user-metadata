const { appendFileSync } = require('node:fs');
// Preserve the original package's OpenAPI type exports after model generation.
appendFileSync('src/index.ts', "\nexport type * from './service-user-metadata.types';\n");
