import { Template, defaultBuildLogger } from 'e2b';

/**
 * Build E2B Sandbox Template with OpenCode pre-installed
 * Run: bun run build-sandbox-template
 */

const template = Template()
  .fromImage('node:22')
  .runCmd('npm install -g opencode-ai', { user: 'root' })
  .runCmd('mkdir -p /home/user/.opencode/skills');

async function main() {
  console.log('Building E2B Sandbox Template with OpenCode...');

  const result = await Template.build(template, {
    alias: 'general-agent-opencode',
    onBuildLogs: defaultBuildLogger(),
  });

  console.log('\n✅ Template built successfully!');
  console.log('Template ID:', result.templateId);
  console.log('Alias: general-agent-opencode');
  console.log('\nUse it with: Sandbox.create("general-agent-opencode")');
}

main().catch(console.error);