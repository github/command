import * as core from '@actions/core'
import * as github from '@actions/github'
import {context} from '@actions/github'
import {octokitRetry} from '@octokit/plugin-retry'
import {triggerCheck} from './functions/trigger-check'
import {contextCheck} from './functions/context-check'
import {reactEmote} from './functions/react-emote'
import {parameters} from './functions/parameters'
import {actionStatus} from './functions/action-status'
import {prechecks} from './functions/prechecks'
import {post} from './functions/post'
import {COLORS} from './functions/colors'
import {VERSION} from './version'

// :returns: 'success', 'failure', 'safe-exit' or raises an error
export async function run() {
  try {
    core.info(`🛸 github/command ${COLORS.info}${VERSION}${COLORS.reset}`)
    // Get the inputs for the 'command' Action
    const command = core.getInput('command', {required: true})
    const token = core.getInput('github_token', {required: true})
    const param_separator = core.getInput('param_separator')
    const reaction = core.getInput('reaction')
    const allowForks = core.getBooleanInput('allow_forks')
    const skipCi = core.getBooleanInput('skip_ci')
    const allow_drafts = core.getBooleanInput('allow_drafts')
    const skipReviews = core.getBooleanInput('skip_reviews')
    const forkReviewBypass = core.getBooleanInput('fork_review_bypass')

    // create an octokit client with the retry plugin
    const octokit = github.getOctokit(token, {
      userAgent: `github/command@${VERSION}`,
      additionalPlugins: [octokitRetry]
    })

    // set the state so that the post run logic will trigger
    core.saveState('isPost', 'true')
    core.saveState('actionsToken', token)

    // get the body of the IssueOps command
    const body = context.payload.comment.body.trim()

    // check the context of the event to ensure it is valid, return if it is not
    const contextCheckResults = await contextCheck(context)
    if (!contextCheckResults.valid) {
      return 'safe-exit'
    }

    // get variables from the event context
    const issue_number = context.payload.issue.number
    core.setOutput('issue_number', issue_number)

    // check if the comment contains the command
    if (!(await triggerCheck(body, command))) {
      // if the comment does not contain the command, exit
      core.saveState('bypass', 'true')
      core.setOutput('triggered', 'false')
      core.info('⛔ no command detected in comment')
      return 'safe-exit'
    }

    // if we made it this far, the action has been triggered in one manner or another
    core.setOutput('triggered', 'true')

    // add the reaction to the issue_comment which triggered the Action
    const reactRes = await reactEmote(reaction, context, octokit)
    core.setOutput('comment_id', context.payload.comment.id)
    core.saveState('comment_id', context.payload.comment.id)
    core.setOutput('initial_reaction_id', reactRes.data.id)
    core.saveState('reaction_id', reactRes.data.id)
    core.setOutput('actor', context.payload.comment.user.login)

    // check if any parameters were used in the command
    // note: this function does have a return, but we don't care about it...
    // ... we just care that it sets the output variables
    await parameters(
      body, // comment body
      param_separator // param_separator action input
    )

    // execute prechecks to ensure the Action can proceed
    const precheckResults = await prechecks(
      issue_number,
      allowForks,
      skipCi,
      skipReviews,
      allow_drafts,
      forkReviewBypass,
      contextCheckResults.context,
      context,
      octokit
    )
    core.setOutput('ref', precheckResults.ref)
    core.setOutput('sha', precheckResults.sha)

    // if the prechecks failed, run the actionStatus function and return
    // note: if we don't pass in the 'success' bool, actionStatus will default to failure mode
    if (!precheckResults.status) {
      await actionStatus(
        context,
        octokit,
        reactRes.data.id, // original reaction id
        precheckResults.message // message
      )
      // set the bypass state to true so that the post run logic will not run
      core.saveState('bypass', 'true')
      core.setFailed(precheckResults.message)
      return 'failure'
    }

    core.setOutput('continue', 'true')
    core.info(`🚀 ${COLORS.success}success!`)
    return 'success'
  } catch (error) {
    /* istanbul ignore next */
    core.saveState('bypass', 'true')
    /* istanbul ignore next */
    core.error(error.stack)
    /* istanbul ignore next */
    core.setFailed(error.message)
  }
}

/* istanbul ignore next */
if (core.getState('isPost') === 'true') {
  post()
} else {
  if (
    process.env.CI === 'true' &&
    process.env.COMMAND_ACTION_JEST_TEST !== 'true'
  ) {
    run()
  }
}
