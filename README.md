# command

[![CodeQL](https://github.com/github/command/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/github/command/actions/workflows/codeql-analysis.yml) [![test](https://github.com/github/command/actions/workflows/test.yml/badge.svg)](https://github.com/github/command/actions/workflows/test.yml) [![package-check](https://github.com/github/command/actions/workflows/package-check.yml/badge.svg)](https://github.com/github/command/actions/workflows/package-check.yml) [![lint](https://github.com/github/command/actions/workflows/lint.yml/badge.svg)](https://github.com/github/command/actions/workflows/lint.yml) [![actions-config-validation](https://github.com/github/command/actions/workflows/actions-config-validation.yml/badge.svg)](https://github.com/github/command/actions/workflows/actions-config-validation.yml) [![coverage](./badges/coverage.svg)](./badges/coverage.svg)

IssueOps commands in GitHub Actions

![ship-it](docs/assets/ship-it.jpg)

This project is based off the [github/branch-deploy](https://github.com/github/branch-deploy) Action. There are **many** similarities between the two, but there is a key difference. The [github/branch-deploy](https://github.com/github/branch-deploy) Action is designed specifically for deployments via IssueOps where this project (`command`) can be used for **any** IssueOps command. This Action allows you to tailor your IssueOps command exactly how you want.

This Action does the heavy lifting for you to enabled customized IssueOps commands:

- 🔍 Detects when IssueOps commands are used on a pull request or an issue
- ✏️ Configurable - Choose your command syntax, optional parameters, who can run the commands, what GitHub permissions are required, and much more
- ✔️ Respects your branch protection settings configured for the repo - if commands are run on pull requests
- 🗨️ Reacts to your IssueOps commands
- 🚀 Can be enabled with simple configuration
- 🧶 This Action can be tied into your existing workflows

## Turbo Quickstart ⚡

A quick section to get you started with this Action

### Usage 📝

Basic usage assuming all defaults:

```yaml
- name: command
  id: command
  uses: github/command@vX.X.X
  with:
    command: .lint # can be anything you want (example)
```

Advanced usage with some custom configuration:

```yaml
- name: command
  id: command
  uses: github/command@vX.X.X
  with:
    command: .restart # can be anything you want (example)
    reaction: "eyes"
    allowed_contexts: "pull_request,issue"
    permissions: "maintain,admin"
    allowlist: monalisa
```

For configuration details, see the [inputs](#inputs-) section below

## Inputs 📥

| Input | Required? | Default | Description |
| ----- | --------- | ------- | ----------- |
| `command` | `true` | - | The string to look for in comments as an IssueOps trigger/command. Example: `".lint"` - You must provide a value for this option |
| `github_token` | `true` | `${{ github.token }}` | The GitHub token used to create an authenticated client - Provided for you by default! |
| `status` | `true` | `${{ job.status }}` | The status of the GitHub Actions - For use in the post run workflow - Provided for you by default! |
| `reaction` | `true` | `eyes` | If set, the specified emoji "reaction" is put on the comment to indicate that the trigger was detected. For example, "rocket" or "eyes" |
| `allowed_contexts` | `true` | `pull_request` | A comma separated list of comment contexts that are allowed to trigger this IssueOps command. Pull requests and issues are the only currently supported contexts. To allow IssueOps commands to be invoked from both PRs and issues, set this option to the following: `"pull_request,issue"`. By default, the only place this Action will allow IssueOps commands from is pull requests |
| `permissions` | `true` | `"write,maintain,admin"` | The allowed GitHub permissions an actor can have to invoke IssueOps commands |
| `allow_drafts` | `true` | `"false"` | Whether or not to allow this IssueOps command to be run on draft pull requests |
| `allow_forks` | `true` | `"false"` | Whether or not to allow this IssueOps command to be run on forked pull requests |
| `skip_ci` | `true` | `"false"` | Whether or not to require passing CI checks before this IssueOps command can be run |
| `skip_reviews` | `true` | `"false"` | Whether or not to require reviews before this IssueOps command can be run |
| `param_separator` | `true` | `"|"` | The separator to use for parsing parameters in comments in IssueOps commands. Parameters will are saved as outputs and can be used in subsequent steps. The default value for this input is the pipe character (`|`) |
| `allowlist` | `false` | `"false"` | A comma separated list of GitHub usernames or teams that should be allowed to use the IssueOps commands configured in this Action. If unset, then all users meeting the "permissions" requirement will be able to run commands. Example: `"monalisa,octocat,my-org/my-team"` |
| `allowlist_pat` | `false` | `"false"` | A GitHub personal access token with "read:org" scopes. This is only needed if you are using the "allowlist" option with a GitHub org team. For example: `"my-org/my-team"` |
| `skip_completing` | `true` | `"false"` | If set to `"true"`, skip the process of completing the Action. This is useful if you want to customize the way this Action completes - For example, custom reactions, comments, etc |

## Outputs 📤

| Output | Description |
| ------ | ----------- |
| `triggered` | The string "true" if the trigger was found, otherwise the string "false" - Just because the workflow was triggered does not mean it should continue. This is a step 1/2 check |
| `continue` | ⭐ The string "true" if the workflow should continue, otherwise empty - Use this to conditionally control if your workflow should proceed or not. This is a step 2/2 check. This is the output you will want to use to determine if your IssueOps flow should _continue_ after this Action completes |
| `comment_body` | The comment body |
| `actor` | The GitHub handle of the actor that invoked the IssueOps command |
| `params` | The raw parameters that were passed into the deployment command (see param_separator) - Further [documentation](docs/parameters.md) |
| `comment_id` | The comment id which triggered this action |
| `issue_number` | The issue number of the pull request (or issue) that was commented on |
| `initial_reaction_id` | The reaction id for the initial reaction on the trigger comment |
| `fork` | The string "true" if the pull request is a fork, otherwise "false" |
| `fork_ref` | The true ref of the fork |
| `fork_label` | The API label field returned for the fork |
| `fork_checkout` | The console command presented in the GitHub UI to checkout a given fork locally |
| `fork_full_name` | The full name of the fork in "org/repo" format |
