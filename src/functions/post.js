import * as core from '@actions/core'
import {contextCheck} from './context-check'
import * as github from '@actions/github'
import {context} from '@actions/github'

// Default failure reaction
const thumbsDown = '-1'
// Default success reaction
const thumbsUp = '+1'

export async function post() {
  try {
    const comment_id = core.getState('comment_id')
    const reaction_id = core.getState('reaction_id')
    const token = core.getState('actionsToken')
    const bypass = core.getState('bypass')
    const status = core.getInput('status')
    const skip_completing = core.getInput('skip_completing')

    // If bypass is set, exit the workflow
    if (bypass === 'true') {
      core.warning('bypass set, exiting')
      return
    }

    // Check the context of the event to ensure it is valid, return if it is not
    if (!(await contextCheck(context))) {
      return
    }

    // Skip the process of completing a deployment, return
    if (skip_completing === 'true') {
      core.info('skip_completing set, exiting')
      return
    }

    // Check the inputs to ensure they are valid
    if (!comment_id || comment_id.length === 0) {
      throw new Error('no comment_id provided')
    } else if (!status || status.length === 0) {
      throw new Error('no status provided')
    }

    // Create an octokit client
    const octokit = github.getOctokit(token)

    // Check the deployment status
    var success
    if (status === 'success') {
      success = true
    } else {
      success = false
    }

    // Select the reaction to add to the issue_comment
    var reaction
    if (success) {
      reaction = thumbsUp
    } else {
      reaction = thumbsDown
    }

    // Update the action status to indicate the result of the deployment as a comment
    // add a reaction to the issue_comment to indicate success or failure
    await octokit.rest.reactions.createForIssueComment({
      ...context.repo,
      comment_id: context.payload.comment.id,
      content: reaction
    })

    // remove the initial reaction on the IssueOp comment that triggered this action
    await octokit.rest.reactions.deleteForIssueComment({
      ...context.repo,
      comment_id: context.payload.comment.id,
      reaction_id: parseInt(reaction_id)
    })

    return
  } catch (error) {
    core.error(error.stack)
    core.setFailed(error.message)
  }
}
