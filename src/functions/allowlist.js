import * as core from '@actions/core'
import * as github from '@actions/github'
import githubUsernameRegex from 'github-username-regex'

// Helper function to check if a user exists in an org team
// :param actor: The user to check
// :param orgTeams: An array of org/team names
// :returns: True if the user is in the org team, false otherwise
async function orgTeamCheck(actor, orgTeams) {
  // This pat needs org read permissions if you are using org/teams to define allowlist'd users
  const allowlistPat = core.getInput('allowlist_pat')

  // If no allowlist_pat is provided, then we cannot check for org team memberships
  if (!allowlistPat || allowlistPat.length === 0 || allowlistPat === 'false') {
    core.warning(
      'no allowlist_pat provided, skipping allowlist check for org team membership'
    )
    return false
  }

  // Create a new octokit client with the allowlist_pat
  const octokit = github.getOctokit(allowlistPat)

  // Loop through all org/team names
  for (const orgTeam of orgTeams) {
    // Split the org/team name into org and team
    var [org, team] = orgTeam.split('/')

    try {
      // Make an API call to get the org id
      const orgData = await octokit.rest.orgs.get({
        org: org
      })
      const orgId = orgData.data.id

      // Make an API call to get the team id
      const teamData = await octokit.rest.teams.getByName({
        org: org,
        team_slug: team
      })
      const teamId = teamData.data.id

      // This API call checks if the user exists in the team for the given org
      const result = await octokit.request(
        `GET /organizations/${orgId}/team/${teamId}/members/${actor}`
      )

      // If the status code is a 204, the user is in the team
      if (result.status === 204) {
        core.debug(`${actor} is in ${orgTeam}`)
        return true
        // If some other status code occured, return false and output a warning
      } else {
        core.warning(`non 204 response from org team check: ${result.status}`)
      }
    } catch (error) {
      // If any of the API calls returns a 404, the user is not in the team
      if (error.status === 404) {
        core.debug(`${actor} is not a member of the ${orgTeam} team`)
        // If some other error occured, output a warning
      } else {
        core.warning(`Error checking org team membership: ${error}`)
      }
    }
  }

  // If we get here, the user is not in any of the org teams
  return false
}

// Helper function to check if a user is allowed to run the IssueOps command
// :param context: The GitHub Actions event context
// :returns: true if the user is allowed, false otherwise (Boolean)
export async function isAllowed(context) {
  // Get the allowlist string from the action inputs
  const allowlist = core.getInput('allowlist')

  core.debug(`raw allowlist value: ${allowlist}`)

  // Sanitized the input to remove any whitespace and split into an array
  const allowlistSanitized = allowlist
    .split(',')
    .map(operator => operator.trim().toLowerCase())

  // loop through the allowlist
  var handles = []
  var orgTeams = []
  allowlistSanitized.forEach(operator => {
    // If the item contains a '/', then it is a org/team
    if (operator.includes('/')) {
      orgTeams.push(operator)
    }
    // Otherwise, it is a github handle
    else {
      // Check if the github handle is valid
      if (githubUsernameRegex.test(operator)) {
        // Add the handle to the list of handles and remove @ from the start of the handle
        handles.push(operator.replace('@', ''))
      } else {
        core.debug(
          `${operator} is not a valid GitHub username... skipping allowlist check`
        )
      }
    }
  })

  // Check if the user is in the operator handle list
  if (handles.includes(context.actor.toLowerCase())) {
    core.debug(`${context.actor} is an allowlisted operator via handle reference`)
    return true
  }

  // Check if the user is in the org/team list
  if (orgTeams.length > 0) {
    const result = await orgTeamCheck(context.actor, orgTeams)
    if (result) {
      core.debug(`${context.actor} is an allowlisted operator via org team reference`)
      return true
    }
  }

  // If we get here, the user is not an operator
  core.debug(`${context.actor} is not an allowed operator for this command`)
  return false
}
