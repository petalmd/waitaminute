import { readdir } from 'fs/promises';
import * as core from '@actions/core';
import * as artifact from '@actions/artifact';
import { CURRENT_DIFF_DIR_NAME, WAITAMINUTE_ARTIFACT_NAME } from './constants';

const artiClient = artifact.create();
const workspace = process.env['GITHUB_WORKSPACE'] ?? process.cwd();

// Main body of the GitHub action's post-script.
async function waitaminutePost() {
  const diffDirPath = `${workspace}/${CURRENT_DIFF_DIR_NAME}`;

  const diffFiles = await readdir(diffDirPath);
  
  const { failedItems } = await artiClient.uploadArtifact(WAITAMINUTE_ARTIFACT_NAME, diffFiles, diffDirPath);
  if (failedItems.length !== 0) {
    throw new Error(`Failed to upload current diff artifact - failed items: ${failedItems}`);
  }
}

core.info('Starting waitaminute post-action execution.');
waitaminutePost()
  .catch((err) => core.error(`Error occurred in waitaminute post-action: ${err}`))
  .finally(() => core.info('waitaminute post-action execution complete.'));
