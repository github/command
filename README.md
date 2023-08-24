# command

[![CodeQL](https://github.com/github/command/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/github/command/actions/workflows/codeql-analysis.yml) [![test](https://github.com/github/command/actions/workflows/test.yml/badge.svg)](https://github.com/github/command/actions/workflows/test.yml) [![package-check](https://github.com/github/command/actions/workflows/package-check.yml/badge.svg)](https://github.com/github/command/actions/workflows/package-check.yml) [![lint](https://github.com/github/command/actions/workflows/lint.yml/badge.svg)](https://github.com/github/command/actions/workflows/lint.yml) [![actions-config-validation](https://github.com/github/command/actions/workflows/actions-config-validation.yml/badge.svg)](https://github.com/github/command/actions/workflows/actions-config-validation.yml) [![coverage](./badges/coverage.svg)](./badges/coverage.svg)

IssueOps commands in GitHub Actions!

> _Like ChatOps but for GitHub Issues and Pull Requests_ 🤩

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

### Example 📚

Check out a super simple workflow example using this Action to quickly get up and running with `github/command`:

```yaml
name: "command demo"

# the workflow to execute on is comments that are newly created
on:
  issue_comment:
    types: [created]

# permissions needed for reacting to IssueOps commands on issues and PRs
permissions:
  pull-requests: write
  issues: write
  checks: read

jobs:
  demo:
    runs-on: ubuntu-latest
    steps:
      # execute IssueOps command logic, hooray!
      # this will be used to "gate" all future steps below
      - uses: github/command@vX.X.X
        id: command
        with:
          command: ".ping"

      # run your custom logic for your project here - example seen below

      # conditionally run some logic here
      - name: ping
        if: ${{ steps.command.outputs.continue == 'true' }}
        run: echo "I am going to ping some cool website now!"
```

> Keep reading to learn more about this Action! Even further details about how this Action works can be found below as well

## About 💡

Before we get into details, let's first define a few key terms below:

- **IssueOps** - Its like ChatOps but instead of using a chat bot, commands are invoked by commenting on a pull request (PRs are issues under the hood) - Example: commenting `.restart` on a pull request
- **PR** - Short for pull request

### IssueOps 🗨️

The best way to define IssueOps is to compare it to something similar, ChatOps. You may be familiar with the concept ChatOps already but in case you aren't here is a quick definition below:

> ChatOps is the process of interacting with a chat bot to execute commands directly in a chat platform. For example, with ChatOps you might do something like `.ping example.org` to check the status of a website

IssueOps adopts the same mindset but through a different medium. Rather than using a chat service to invoke the commands we use comments on a GitHub Issue or Pull Request. GitHub Actions is the runtime which executes our desired logic

## How does it work? 📚

> This section will go into detail about how this Action works and hopefully inspire you on ways you can leverage it in your own projects

Let's walk through a GitHub Action workflow using this Action line by line:

```yaml
# The name of the workflow, it can be anything you wish
name: "IssueOps github/command demo"

# The workflow to execute on is comments that are newly created
on:
  issue_comment:
    types: [created]
```

It is important to note that the workflow we want to run IssueOps on is `issue_comment` and `created`. This means we will not run under any other contexts for this workflow. You can edit this as you wish but it does change how this model ultimately works. For example, `issue_comment` workflows **only** use files found on `main` to run. If you do something like `on: pull_request` you could open yourself up to issues as a user could alter a file in a PR and exfil your secrets for example. Only using `issue_comment` is the suggested workflow type. It should also be noted that comments on pull requests, **and** issues will trigger the `issue_comment` workflow event.

```yaml
# permissions definitions
permissions:
  pull-requests: write # required for adding reactions to command comments on PRs
  issues: write # required for adding reactions to command comments on issues
  checks: read # required for checking if the CI checks have passed on a pull request (if using this Action in the context of PR comments)
```

These are the minimum permissions you need to run this Action (this assumes you are running this Action on pull requests and issues)

```yaml
jobs:
  demo:
    runs-on: ubuntu-latest
    steps:
      # Checkout your projects repository
      - uses: actions/checkout@v3
```

Sets up your `demo` job, uses an ubuntu runner, and checks out your repo - Just some standard setup for a general Action. We also add an `if:` statement here to only run this workflow on pull request comments to make it a little more specific (if necessary)

> Note: The Action will check the context for us anyways but this can save us a bit of CI time by using the `if:` condition

```yaml
      # Execute IssueOps command logic, hooray!
      - uses: github/command@vX.X.X
        id: command
        with:
          command: ".ping"
```

> Note: It is important to set an `id:` for this job so we can reference its outputs in subsequent steps

The core of this Action takes place here. This block of code will trigger the `github/command` action to run. It will do the following:

1. Check the comment which invoked the workflow for the `command:` phrase (`.ping`) defined here
2. If the command trigger phrase is found, it will proceed
3. It will start by reacting to your message to let you know it is running
4. The Action will check to ensure the user that invoked the operation has the correct permissions to run the command, collect any parameters used in the command, check CI / reviews (if run on a PR), etc
5. Outputs will be exported by this job for later reference in other jobs as well

```yaml
      # conditionally run further steps if the command Action was successful
      - name: ping
        if: ${{ steps.command.outputs.continue == 'true' }}
        run: echo "Do your custom logic here to ping your site!"
```

As seen above, we have a single example step. Perhaps you would actually use a real utility to ping a website, but for this example, we just echo out some text. This step is conditionally gated by the `continue` variable:

- `steps.command.outputs.continue == 'true'` - The `continue` variable is only set to true when a workflow should continue - This is set by logic in the `github/command` Action

> Example: You comment `.ping` on a pull request. A workflow is kicked off and the `github/command` Action begins to check the comment body of the message you just typed on the pull request. If you have the correct permissions to execute the IssueOps command, the action outputs the `continue` variable to `true`. This will allow the "ping" step seen above to run.

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
| `params` | The raw parameters that were passed into the IssueOps command (see param_separator) - Further [documentation](docs/parameters.md) |
| `comment_id` | The comment id which triggered this action |
| `issue_number` | The issue number of the pull request (or issue) that was commented on |
| `initial_reaction_id` | The reaction id for the initial reaction on the trigger comment |
| `fork` | The string "true" if the pull request is a fork, otherwise "false" |
| `fork_ref` | The true ref of the fork |
| `fork_label` | The API label field returned for the fork |
| `fork_checkout` | The console command presented in the GitHub UI to checkout a given fork locally |
| `fork_full_name` | The full name of the fork in "org/repo" format |

## Allowlist 👩‍🔬

This Action supports a configurable input called `allowlist` which can be used to specify a list of individual GitHub users or teams that should have permission to use this Action. By default, this input option's value is set to `"false"` which means that anyone how has the proper `permissions` (see [inputs](inputs-) section above) "permissions", will be able to invoke IssueOps commands. You can actually use both the `allowlist` and `permissions` input together to help control who can invoke IssueOps commands. For example, you could use these two options together to only allow people in the GitHub `octoawesome` team with `admin` permissions to run your commands.

The `allowlist` input option takes a comma separated list of GitHub handles or GitHub org teams. For example, if you give the option `allowlist: monalisa`, the `monalisa` user will be the only user allowed to invoke IssueOps commands (assuming they also have the correct `permissions`)

Here is a simple example using only handles below (the monalisa and octocat users will be allowlisted):

```yaml
- uses: github/command@vX.X.X
  id: command
  with:
    allowlist: monalisa,octocat
```

Here is an example using a mix of GitHub handles and a GitHub org team below:

```yaml
- uses: github/command@vX.X.X
  id: command
  with:
    allowlist: monalisa,octocat,octo-awesome-org/octo-awesome-team
    allowlist_pat: ${{ secrets.ALLOWLIST_PAT }}
```

In this case, all users (and future users) in the `octo-awesome-org/octo-awesome-team` team will be treated as admins in addition to the monalisa and octocat users

It should be noted if you choose to use GitHub org teams for allowlist definitions, you **will** need a [GitHub Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) with the `read:org` scope. This is because the Action will need to make API calls on behalf of an authenticated user in the org to retrieve team memberships. If you choose to only use GitHub handles for admin definitions, then the `allowlist_pat` input is not required

> Note: You can read more about the `allowlist` option under the [inputs](inputs-) section in this readme

## Live Examples 📸

Check out some of the links below to see how others are using this Action in their projects:

- coming soon!

## Actions Stability 🔧

In order to ensure your usage of this action is stable, it is highly recommended that you use either pin your action to a SHA or use a specific release tag

### Actions Tag Pinning

You can easily select the exact version you want on the GitHub Actions marketplace seen in the screenshot below:

![Screenshot from 2022-05-09 12-12-06](https://user-images.githubusercontent.com/23362539/167471509-71ca2cf9-7b8f-4709-acee-67a679869fa6.png)

### Actions SHA Pinning

You can also pin to an exact commit SHA as well using a third party tool such as [mheap/pin-github-action](https://github.com/mheap/pin-github-action)

> GitHub Actions security hardening and stability docs available here: [docs](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#using-third-party-actions)

## Suggestions 🌟

This section will cover a few suggestions that will help you when using this Action

1. Suggest Updating Pull Request Branches - A great setting to enable for pull request hygiene. This option can be found in your repository's `/settings` page

    ![branch-setting](https://user-images.githubusercontent.com/23362539/172939811-a8816db8-8e7c-404a-b12a-11ec5bc6e93d.png)

2. Enable Branch Protection Settings - It is always a good idea to enable branch protection settings for your repo, especially when using this Action

## Security 🔒

The security aspects of this Action have already been well documented in the `branch-deploy` repo. Please see the following [docs](https://github.com/github/branch-deploy/tree/ccff97cdddb9dc6f43748c6d17416ce66a4abff6#security-) to learn more.

---

## Contributing 💻

All contributions are welcome from all!

Check out the [contributing guide](CONTRIBUTING.md) to learn more
