import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import * as core from '@actions/core';
import * as github from '@actions/github';
import * as artifact from '@actions/artifact';
import { compareDiffs } from './compare';

const WAITAMINUTE_ARTIFACT_NAME = 'waitaminute-data';
const WAITAMINUTE_DIFF_FILE_NAME_A = 'waitaminute.a.diff';
const WAITAMINUTE_DIFF_FILE_NAME_B = 'waitaminute.b.diff';
const PREVIOUS_DIFF_DIR_NAME = 'previous-diff';
const CURRENT_DIFF_DIR_NAME = 'current-diff';

const ghToken = core.getInput('gh-token', { required: true });
const debugAllowApproval = core.getBooleanInput('debug-allow-approval', { required: false });

const ghClient = github.getOctokit(ghToken);
const artiClient = artifact.create();
const workspace = process.env['GITHUB_WORKSPACE'] ?? process.cwd();

// Downloads the previous diff files and returns the content of the previous diff.
// If no previous diff could be downloaded, returns undefined.
async function downloadPreviousDiff() {
  try {
    const diffDirPath = `${workspace}/${PREVIOUS_DIFF_DIR_NAME}`;

    await rm(diffDirPath, { force: true, recursive: true });
    await mkdir(diffDirPath, { recursive: true });
    
    const dlResponse = await artiClient.downloadArtifact(WAITAMINUTE_ARTIFACT_NAME, diffDirPath);
    
    const diffFilePath = `${dlResponse.downloadPath}/${WAITAMINUTE_DIFF_FILE_NAME_B}`;
    const diffData = await readFile(diffFilePath, { encoding: 'utf8' });

    return diffData;
  } catch (err) {
    core.notice(`Could not download previous diff artifact: ${err}`);
    return undefined;
  }
}

// Fetches the current PR diff and returns it.
async function getCurrentDiff(pr) {
  const { data: diffData } = await ghClient.rest.pulls.get({
    ...github.context.repo,
    pull_number: pr.number,
    mediaType: {
      format: 'diff',
    },
  });
  
  return diffData;
}

// Removes all aprovals from the PR since diff changed.
async function removeAllApprovals(pr) {
  const reviews = await ghClient.paginate(ghClient.rest.pulls.listReviews, {
    ...github.context.repo,
    pull_number: pr.number,
  });

  await Promise.all(reviews.map((review) => ghClient.rest.pulls.dismissReview({
    ...github.context.repo,
    pull_number: pr.number,
    review_id: review.id,
  })));
}

// Uploads the current diffs as an artifact so that our next run can find them.
async function saveDiffs(previousDiff, currentDiff) {
  const diffDirPath = `${workspace}/${CURRENT_DIFF_DIR_NAME}`;

  await rm(diffDirPath, { force: true, recursive: true });
  await mkdir(diffDirPath, { recursive: true });
  
  const diffFiles = {
    [`${diffDirPath}/${WAITAMINUTE_DIFF_FILE_NAME_B}`]: currentDiff,
  };
  if (previousDiff) {
    diffFiles[`${diffDirPath}/${WAITAMINUTE_DIFF_FILE_NAME_A}`] = previousDiff;
  }
  core.notice(`Previous diff: ${previousDiff}`);
  core.notice(`Current diff: ${currentDiff}`);
  await Promise.all(Object.entries(diffFiles).map(
    ([diffFilePath, diff]) => writeFile(diffFilePath, diff, { encoding: 'utf8' })
  ));

  const { failedItems } = await artiClient.uploadArtifact(WAITAMINUTE_ARTIFACT_NAME, Object.keys(diffFiles), diffDirPath);
  if (failedItems.length !== 0) {
    throw new Error(`Failed to upload current diff artifact - failed items: ${failedItems}`);
  }
}

// Processes a 'pull_request' event by comparing diffs to know if we need to remove approvals.
async function processPREvent() {
  core.notice('Getting PR information from event payload');
  const pr = github.context.payload.pull_request;
  if (!pr) {
    throw new Error('Pull request event did not contain PR information.');
  }

  core.notice('Fetching previous and current diffs for the PR');
  const [previousDiff, currentDiff] = await Promise.all([downloadPreviousDiff(), getCurrentDiff(pr)]);
  
  core.notice(`Got previous diff: ${previousDiff ? 'yes' : 'no'}`);
  const diffsAreDifferent = previousDiff && !compareDiffs(previousDiff, currentDiff);
  core.notice(`Comparing diffs: ${diffsAreDifferent ? 'different' : 'same'}`);

  if (diffsAreDifferent) {
    core.notice('Removing PR approvals because PR diff changed');
    await removeAllApprovals(pr);
  }

  if (!previousDiff || diffsAreDifferent) {
    core.notice('Saving diff for next action execution');
    await saveDiffs(previousDiff, currentDiff);
  }
}

// Processes an 'issue_comment' event that can be used to add an approval.
async function processIssueCommentEvent() {
  // TODO remove this before v1 launch
  core.notice(`debugAllowApproval: ${debugAllowApproval}`);
  if (debugAllowApproval) {
    core.notice(`issue.number: ${github.context.issue?.number}`);
    const commentBody = github.context.issue?.comment?.body;
    const prUrl = github.context.issue?.pull_request?.url;
    core.notice(`commentBody: ${commentBody}`);
    core.notice(`prUrl: ${prUrl}`);
    if (prUrl && commentBody === 'waitaminute approve') {
      const { data: { number: prNumber } } = await ghClient.request(prUrl);
      core.notice(`prNumber: ${prNumber}`);
      await ghClient.rest.pulls.createReview({
        ...github.context.repo,
        pull_number: prNumber,
        event: 'APPROVE',
      });
    }
  }
}

// Main body of the GitHub action.
async function waitaminute() {
  core.notice(`Event name: ${github.context.eventName}`);
  switch (github.context.eventName) {
    case 'pull_request':
      await processPREvent();
      break;
    case 'issue_comment':
      await processIssueCommentEvent();
      break;
    default:
      throw new Error(`Unsupported GitHub event: '${github.context.eventName}'.`);
  }
}

core.notice('Starting waitaminute action execution...');
waitaminute()
  .then(() => core.notice('waitaminute action execution encountered no error.'))
  .catch((err) => core.setFailed(`waitaminute action execution stopped: ${err}`))
  .finally(() => core.notice('waitaminute action execution complete.'));
