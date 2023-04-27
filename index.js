import { mkdir, rm, writeFile } from 'fs/promises';
import * as core from '@actions/core';
import * as github from '@actions/github';
import * as artifact from '@actions/artifact';
import AdmZip from 'adm-zip';
import { compareDiffs } from './compare';

const WAITAMINUTE_ARTIFACT_NAME_PREFIX = 'waitaminute-data-pr-';
const CURRENT_DIFF_DIR_NAME = 'current-diff';
const WAITAMINUTE_DIFF_FILE_NAME_A = 'waitaminute.a.diff';
const WAITAMINUTE_DIFF_FILE_NAME_B = 'waitaminute.b.diff';

const ghToken = core.getInput('github-token');
const dismissMessage = core.getInput('dismiss-message');
const targetBranch = core.getInput('target-branch', { trimWhitespace: false });
const targetBranchFilter = core.getInput('target-branch-filter');
const targetBranchFilterFlags = core.getInput('target-branch-filter-flags');

const ghClient = github.getOctokit(ghToken);
const artiClient = artifact.create();
const workspace = process.env['GITHUB_WORKSPACE'] ?? process.cwd();

// Returns the name of the artifact used to save diff for this PR.
function getDiffArtifactName(pr) {
  return `${WAITAMINUTE_ARTIFACT_NAME_PREFIX}${pr.number}`;
}

// Checks if the name of the PR's base branch passes filters provided by user.
function canTargetBaseBranch(pr) {
  const prBaseBranch = pr.base.ref;

  if (targetBranchFilter) {
    const regex = RegExp(targetBranchFilter, targetBranchFilterFlags);
    if (!regex.test(prBaseBranch)) {
      core.notice(`Will skip execution because base branch '${prBaseBranch}' does not pass target branch filter '${targetBranchFilter}'.`);
      return false;
    }
  } else {
    const effectiveTargetBranch = (targetBranch || pr.base.repo.default_branch).trim();
    if (effectiveTargetBranch && prBaseBranch != effectiveTargetBranch) {
      core.notice(`Will skip execution because base branch '${prBaseBranch}' does not match target branch '${effectiveTargetBranch}'.`);
      return false;
    }
  }

  return true;
}

// Finds the ID of this workflow.
async function getWorkflowId() {
  const { data: { workflow_id: workflowId } } = await ghClient.rest.actions.getWorkflowRun({
    ...github.context.repo,
    run_id: github.context.runId,
  });

  return workflowId;
}

// Finds the ID of the latest artifact containing previous diff data for this PR.
// If no previous diff is found, returns null.
async function getPreviousDiffArtifactId(pr) {
  const workflowId = await getWorkflowId();
  const prHeadBranch = pr.head.ref;
  const diffArtifactName = getDiffArtifactName(pr);

  const runsIt = ghClient.paginate.iterator(ghClient.rest.actions.listWorkflowRuns, {
    ...github.context.repo,
    workflow_id: workflowId,
    event: 'pull_request',
    status: 'success',
  });
  for await (const runs of runsIt) {
    for (const run of runs.data) {
      if (run.head_branch === prHeadBranch) {
        const artifacts = await ghClient.paginate(ghClient.rest.actions.listWorkflowRunArtifacts, {
          ...github.context.repo,
          run_id: run.id,
        });
    
        const diffArtifact = artifacts.find((artifact) => artifact.name === diffArtifactName);
        if (diffArtifact) {
          return diffArtifact.id;
        }
      }
    }
  }

  core.notice(`Could not find previous diff artifact. Maybe this is the first run for PR #${pr.number}.`);
  return null;
}

// Downloads the previous diff files and returns the content of the previous diff.
// If no previous diff could be downloaded, returns null.
async function downloadPreviousDiff(pr) {
  const diffArtifactId = await getPreviousDiffArtifactId(pr);
  if (diffArtifactId) {
    let zippedDiffData;
    try {
      const zippedDiffResponse = await ghClient.rest.actions.downloadArtifact({
        ...github.context.repo,
        artifact_id: diffArtifactId,
        archive_format: 'zip',
      });

      zippedDiffData = zippedDiffResponse.data;
    } catch (err) {
      if (err.message === 'Artifact has expired') {
        core.notice('Previous diff artifact has expired.');
        zippedDiffData = null;
      } else {
        throw err;
      }
    }

    if (zippedDiffData) {
      const zip = new AdmZip(Buffer.from(zippedDiffData));
      const diffData = zip.readAsText(WAITAMINUTE_DIFF_FILE_NAME_B);

      return diffData;
    }
  }

  return null;
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

  const approvals = reviews.filter((review) => review.state === 'APPROVED');
  await Promise.all(approvals.map((review) => ghClient.rest.pulls.dismissReview({
    ...github.context.repo,
    pull_number: pr.number,
    review_id: review.id,
    message: dismissMessage,
  })));
}

// Uploads the current diffs for this PR as an artifact so that our next run can find them.
async function saveDiffs(pr, previousDiff, currentDiff) {
  const diffDirPath = `${workspace}/${CURRENT_DIFF_DIR_NAME}`;
  const diffArtifactName = getDiffArtifactName(pr);

  await rm(diffDirPath, { force: true, recursive: true });
  await mkdir(diffDirPath, { recursive: true });
  
  const diffFiles = {
    [`${diffDirPath}/${WAITAMINUTE_DIFF_FILE_NAME_B}`]: currentDiff,
  };
  if (previousDiff) {
    diffFiles[`${diffDirPath}/${WAITAMINUTE_DIFF_FILE_NAME_A}`] = previousDiff;
  }
  await Promise.all(Object.entries(diffFiles).map(
    ([diffFilePath, diff]) => writeFile(diffFilePath, diff, { encoding: 'utf8' })
  ));

  const { failedItems } = await artiClient.uploadArtifact(diffArtifactName, Object.keys(diffFiles), diffDirPath);
  if (failedItems.length !== 0) {
    throw new Error(`Failed to upload current diff artifact - failed items: ${failedItems}`);
  }
}

// Processes a 'pull_request' event by comparing diffs to know if we need to remove approvals.
async function processPREvent() {
  const pr = github.context.payload.pull_request;
  if (!pr) {
    throw new Error('Pull request event did not contain PR information.');
  }

  let diffChanged = false;
  if (canTargetBaseBranch(pr)) {
    const [previousDiff, currentDiff] = await Promise.all([downloadPreviousDiff(pr), getCurrentDiff(pr)]);

    diffChanged = previousDiff && !compareDiffs(previousDiff, currentDiff);
    if (diffChanged) {
      core.notice('Removing PR approvals because PR diff changed.');
      await removeAllApprovals(pr);
    }

    await saveDiffs(pr, previousDiff, currentDiff);
  }

  core.setOutput('diff-changed', diffChanged);
}

// Main body of the GitHub action.
async function waitaminute() {
  switch (github.context.eventName) {
    case 'pull_request':
      await processPREvent();
      break;
    default:
      throw new Error(`Unsupported GitHub event: '${github.context.eventName}'.`);
  }
}

core.info('Starting waitaminute action execution.');
waitaminute()
  .catch((err) => core.setFailed(`waitaminute action execution stopped: ${err}`))
  .finally(() => core.info('waitaminute action execution complete.'));
