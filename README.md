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
