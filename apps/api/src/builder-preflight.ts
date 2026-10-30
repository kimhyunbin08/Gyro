import { builderReadiness } from './builder-readiness.js';

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--configuration-only') || args.length > 1) {
  console.error('Usage: npm run -w apps/api builder:preflight -- [--configuration-only]');
  process.exitCode = 1;
} else {
  const configurationOnly = args.includes('--configuration-only');
  const issues = builderReadiness({ ...process.env, NODE_ENV: 'production' })
    .filter(({ field }) => !configurationOnly || !['BUILDER_PLATFORM_ENABLED', 'LEGAL_REVIEW_APPROVED'].includes(field));
  console.log('Offline production configuration check only: no connections, policy verification, or legal approval.');
  if (configurationOnly) console.log('Release flags are excluded. Signup must remain disabled during preparation.');
  for (const { field, message } of issues) console.error(`${field}: ${message}`);
  if (issues.length) {
    console.error(`Blocked: ${issues.length} configuration issue(s). Environment values are not printed.`);
    process.exitCode = 1;
  } else {
    console.log('Configuration shape accepted. Database migration, OAuth, mail delivery, policies, and release evidence still require verification.');
  }
}
