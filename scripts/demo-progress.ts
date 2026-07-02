import { createProgressBar } from '../src';

const labels = [
  'Resolving dependencies from the package registry',
  'Compiling source files with the configured toolchain',
  'Running the test suite across all workspaces',
  'Bundling assets for production',
  'Uploading build artifacts to the storage bucket',
];

const progress = createProgressBar({
  total: labels.length,
  label: labels[0] as string,
});

for (const label of labels) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  progress.advance();
  progress.setLabel(label);
}

progress.finish();
