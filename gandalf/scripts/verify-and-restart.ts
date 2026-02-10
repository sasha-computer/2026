import path from 'path';

type CommandStep = {
  label: string;
  cmd: string;
  args: string[];
};

function runStep(step: CommandStep): void {
  const result = Bun.spawnSync({
    cmd: [step.cmd, ...step.args],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });

  if (result.exitCode !== 0) {
    process.exit(result.exitCode ?? 1);
  }
}

const homeDir = process.env.HOME;
if (!homeDir) {
  console.error('HOME is not set; cannot resolve launchctl plist path.');
  process.exit(1);
}

const plistPath = path.join(
  homeDir,
  'Library',
  'LaunchAgents',
  'com.gandalf.plist',
);

const steps: CommandStep[] = [
  { label: 'bun test', cmd: 'bun', args: ['test'] },
  { label: 'bun run build', cmd: 'bun', args: ['run', 'build'] },
  { label: 'launchctl unload', cmd: 'launchctl', args: ['unload', plistPath] },
  { label: 'launchctl load', cmd: 'launchctl', args: ['load', plistPath] },
];

for (const step of steps) {
  console.log(`==> ${step.label}`);
  runStep(step);
}
