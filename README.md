# Wait a minute...

<p align="center">
  <a href="https://github.com/clechasseur/waitaminute/actions"><img alt="waitaminute status" src="https://github.com/clechasseur/waitaminute/workflows/units-test/badge.svg"></a>
</p>

A GitHub Action that dismisses reviews from PRs when the PR diff changes.

## But... why?

<em>Doesn't GitHub already support this?</em>

It... kinda does. However, from experience, the GitHub feature sometimes clears reviews when you merge the base branch in the PR branch, or when you rebase, even if the PR diff itself doesn't change. If you experience this and it bothers you, this action is for you.

## Using this action

1. In the **Actions** tab of your repository, choose *New workflow*, then click on *setup a workflow yourself*.
2. Name your workflow file, for example `waitaminute.yml`.
3. Add the workflow definition, like this:

```yaml
name: Remove approvals when PR diff changes

on:
  pull_request:
    # Here, 'opened' is important because it allows the action to
    # see the initial PR diff and compare it later.
    types: [ opened, edited, synchronize ]
    
    # Note: if you want to limit the effect to a specific base branch,
    # do not use the 'branches:' filter here, use the action's
    # 'target-branch' input (see below).

jobs:
  waitaminute:
    runs-on: ubuntu-latest
    steps:
      - uses: clechasseur/waitaminute@v1.0.0-beta2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          dismiss-message: Review dismissed because the PR has changed.
          target-branch: main
```

4. Click on *Start commit* to commit your new workflow file, using a PR if necessary.

## Action parameters

| Name | Description | Required | Default |
| --- | --- | --- | --- |
| `github-token` | GitHub personal access token.<br/>Use `${{ secrets.GITHUB_TOKEN }}` for simplicity. | true | |
| `dismiss-message` | Message that is displayed when the action dismisses a PR review. | false | `Dismissed by waitaminute because PR diff changed.` |
| `target-branch` | If set, only PRs targeting this branch will be considered. | false | |
| `target-branch-filter` | Like `target-branch`, but interpreted as a regex.<br/>If both this and `target-branch` are set, base branch must match both filters. | false | |
| `target-branch-filter-flags` | Regex flags used with `target-branch-filter`. | false | `i` (case-insensitive) |

## Development

Requirements:
- Node.js 16.x or later

Installing dependencies:

```bash
npm install
```

Running tests:

```bash
npm test
```

Preparing for a commit (runs lint, prepares `dist/` directory and runs tests):

```
npm run all
```
