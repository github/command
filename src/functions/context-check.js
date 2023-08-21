import * as core from '@actions/core'
import {stringToArray} from './string-to-array'

const contextDefaults = ['pull_request', 'issue']

// A simple function that checks the event context to make sure it is valid
// :param context: The GitHub Actions event context
// :returns: Map - {valid: true/false, context: 'issue'/'pull_request'}
export async function contextCheck(context) {
  core.debug(`checking if the context of '${context.eventName}' is valid`)

  // exit right away if the event isn't a comment of some kind
  // IssueOps commands by their very nature are comments
  if (context.eventName !== 'issue_comment') {
    core.saveState('bypass', 'true')
    core.warning(
      'this Action can only be run in the context of an issue_comment'
    )
    return {valid: false, context: context.eventName}
  }

  // fetch the defined contexts from the Action input
  const allowedContexts = await stringToArray(
    core.getInput('allowed_contexts', {required: true})
  )

  // check to see if the allowedContexts variable contains at least one item from the contextDefaults array
  // if it does not, log a warning and exit
  if (!allowedContexts.some(r => contextDefaults.includes(r))) {
    core.warning(
      `the 'allowed_contexts' input must contain at least one of the following: ${contextDefaults.join(
        ', '
      )}`
    )
    return {valid: false, context: context.eventName}
  }

  // check if the event is a PR
  const isPullRequest = context?.payload?.issue?.pull_request !== undefined

  // if the only allowed context is 'pull_request' check if the context is valid
  if (allowedContexts.length === 1 && allowedContexts[0] === 'pull_request') {
    // if the context is not from a PR and it is an issue comment, that means it...
    // ... came from an issue, so return false
    if (!isPullRequest && context.eventName === 'issue_comment') {
      core.saveState('bypass', 'true')
      core.warning(
        'this Action can only be run in the context of a pull request comment'
      )
      return {valid: false, context: context.eventName}
    }

    // if the only allowed context is 'issue_comment' check if the context is valid
  } else if (allowedContexts.length === 1 && allowedContexts[0] === 'issue') {
    // if the context is an issue comment, but that issue comment was on a PR, return false
    // https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#issue_comment
    if (context.eventName === 'issue_comment' && isPullRequest) {
      core.saveState('bypass', 'true')
      core.warning(
        'this Action can only be run in the context of an issue comment'
      )
      return {valid: false, context: context.eventName}
    }
  }

  // if we make it here, the context is valid, we just need to figure out if it is a...
  // ... PR or an issue comment
  var contextType
  if (isPullRequest) {
    contextType = 'pull_request'
  } else {
    contextType = 'issue'
  }

  return {valid: true, context: contextType}
}
