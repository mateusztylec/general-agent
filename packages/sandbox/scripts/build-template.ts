import { Template, defaultBuildLogger } from 'e2b';
import { opencodeTemplate, TEMPLATE_ALIAS } from '../src/template.js';

/**
 * Build E2B Sandbox Template with OpenCode pre-installed
 * Run: bun run build-template
 */

async function main() {
  console.log('Building E2B Sandbox Template with OpenCode...');

  const result = await Template.build(opencodeTemplate, {
    alias: TEMPLATE_ALIAS,
    onBuildLogs: defaultBuildLogger(),
  });

  console.log('\n✅ Template built successfully!');
  console.log('Template ID:', result.templateId);
  console.log('Alias:', TEMPLATE_ALIAS);
  console.log(`\nUse it with: Sandbox.create("${TEMPLATE_ALIAS}")`);
}

main().catch(console.error);
