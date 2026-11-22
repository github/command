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

  // Check to ensure the user has a configured role or base permission on the repo
  const actorPermission = permissionRes.data.permission
  const actorRole = permissionRes.data.role_name
  const hasValidPermission =
    validPermissionsArray.includes(actorPermission) ||
    (actorRole && validPermissionsArray.includes(actorRole))
  if (!hasValidPermission) {
    const displayedPermission =
      actorRole && actorRole !== actorPermission
        ? `${actorRole} (base permission: ${actorPermission})`
        : actorPermission
    return `👋 __${
      context.actor
    }__, seems as if you have not ${validPermissionsArray.join(
      '/'
    )} permissions in this repo, permissions: ${displayedPermission}`
  }

  // Return true if the user has permissions
  return true
}
