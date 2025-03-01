import * as core from '@actions/core'
import {stringToArray} from './string-to-array'

// Helper function to check if an actor has permissions to use this Action in a given repository
// :param octokit: The octokit client
// :param context: The GitHub Actions event context
// :returns: An error string if the actor doesn't have permissions, otherwise true
export async function validPermissions(octokit, context) {
  // fetch the defined permissions from the Action input
  const validPermissionsArray = await stringToArray(
    core.getInput('permissions', {required: true})
  )

  core.setOutput('actor', context.actor)

  // Get Actor Type from GitHub API
  const userRes = await octokit.rest.users.getByUsername({
    username: context.actor
  })

  if (userRes.status !== 200) {
    return `Fetch user details returns non-200 status: ${userRes.status}`
  }

  const actorType = userRes.data.type // "User" or "Bot"
  core.info(`🔍 Detected actor type: ${actorType} (${context.actor})`)

  // Handle GitHub Apps (Bots)
  if (actorType === 'Bot') {
    // Fetch installation details for the GitHub App
    const installationRes = await octokit.rest.apps.getRepoInstallation({
      ...context.repo
    })

    if (installationRes.status !== 200) {
      return `Failed to fetch GitHub App installation details: Status ${installationRes.status}`
    }

    const appPermissions = installationRes.data.permissions || {}

    // Ensure the bot has "issues" permission set to "write"
    if (appPermissions.issues !== 'write') {
      return `👋 __${context.actor}__ does not have "issues" permission set to "write". Current permissions: ${JSON.stringify(appPermissions)}`
    }

    return true
  }

  // Get the permissions of the user who made the comment
  const permissionRes = await octokit.rest.repos.getCollaboratorPermissionLevel(
    {
      ...context.repo,
      username: context.actor
    }
  )

  // Check permission API call status code
  if (permissionRes.status !== 200) {
    return `Permission check returns non-200 status: ${permissionRes.status}`
  }

  // Check to ensure the user has at least write permission on the repo
  const actorPermission = permissionRes.data.permission
  if (!validPermissionsArray.includes(actorPermission)) {
    return `👋 __${
      context.actor
    }__, seems as if you have not ${validPermissionsArray.join(
      '/'
    )} permissions in this repo, permissions: ${actorPermission}`
  }

  // Return true if the user has permissions
  return true
}
