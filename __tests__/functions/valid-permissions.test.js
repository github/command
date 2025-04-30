import * as core from '@actions/core'
import {validPermissions} from '../../src/functions/valid-permissions'

const setOutputMock = jest.spyOn(core, 'setOutput')
const infoMock = jest.spyOn(core, 'info')

var octokit
var context
beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(core, 'setOutput').mockImplementation(() => {})
  jest.spyOn(core, 'info').mockImplementation(() => {})
  process.env.INPUT_PERMISSIONS = 'write,admin'
  process.env.INPUT_ALLOW_GITHUB_APPS = true

  context = {
    repo: {
      owner: 'corp',
      repo: 'test'
    },
    actor: 'monalisa'
  }

  octokit = {
    rest: {
      users: {
        getByUsername: jest.fn().mockReturnValueOnce({
          status: 200,
          data: {
            type: 'User'
          }
        })
      },
      repos: {
        getCollaboratorPermissionLevel: jest.fn().mockReturnValueOnce({
          status: 200,
          data: {
            permission: 'write'
          }
        })
      },
      apps: {
        getRepoInstallation: jest.fn()
      }
    }
  }
})

test('determines that a user has valid permissions to invoke the Action', async () => {
  expect(await validPermissions(octokit, context)).toEqual(true)
  expect(setOutputMock).toHaveBeenCalledWith('actor', 'monalisa')
  expect(infoMock).toHaveBeenCalledWith(
    `🔍 Detected actor type: User (${context.actor})`
  )
})

test('determines that a user has does not valid permissions to invoke the Action', async () => {
  octokit.rest.repos.getCollaboratorPermissionLevel = jest
    .fn()
    .mockReturnValue({
      status: 200,
      data: {
        permission: 'read'
      }
    })

  expect(await validPermissions(octokit, context)).toEqual(
    '👋 __monalisa__, seems as if you have not write/admin permissions in this repo, permissions: read'
  )
  expect(setOutputMock).toHaveBeenCalledWith('actor', 'monalisa')
  expect(setOutputMock).toHaveBeenCalledWith('actor_type', 'User')
})

test('fails to get actor information', async () => {
  octokit.rest.users.getByUsername = jest.fn().mockReturnValue({
    status: 500
  })

  expect(await validPermissions(octokit, context)).toEqual(
    'Fetch user details returns non-200 status: 500'
  )
  expect(setOutputMock).toHaveBeenCalledWith('actor', 'monalisa')
})

test('fails to get actor permissions due to a bad status code', async () => {
  octokit.rest.repos.getCollaboratorPermissionLevel = jest
    .fn()
    .mockReturnValue({
      status: 500
    })

  expect(await validPermissions(octokit, context)).toEqual(
    'Permission check returns non-200 status: 500'
  )
  expect(setOutputMock).toHaveBeenCalledWith('actor', 'monalisa')
})

test('determines that a GitHub App has valid permissions', async () => {
  context.actor = 'github-actions[bot]'

  octokit.rest.users.getByUsername = jest.fn().mockReturnValueOnce({
    status: 200,
    data: {
      type: 'Bot'
    }
  })

  octokit.rest.apps.getRepoInstallation = jest.fn().mockReturnValueOnce({
    status: 200,
    data: {
      permissions: {
        issues: 'write'
      }
    }
  })

  expect(await validPermissions(octokit, context)).toEqual(true)
  expect(setOutputMock).toHaveBeenCalledWith('actor', 'github-actions[bot]')
  expect(setOutputMock).toHaveBeenCalledWith('actor_type', 'Bot')
  expect(infoMock).toHaveBeenCalledWith(
    `🔍 Detected actor type: Bot (${context.actor})`
  )
})

test('determines that a GitHub App does not have valid permissions', async () => {
  context.actor = 'monalisa[bot]'

  octokit.rest.users.getByUsername = jest.fn().mockReturnValueOnce({
    status: 200,
    data: {
      type: 'Bot'
    }
  })

  octokit.rest.apps.getRepoInstallation = jest.fn().mockReturnValueOnce({
    status: 200,
    data: {
      permissions: {
        issues: 'read'
      }
    }
  })

  expect(await validPermissions(octokit, context)).toEqual(
    '👋 __monalisa[bot]__ does not have "issues" permission set to "write". Current permissions: {"issues":"read"}'
  )
  expect(setOutputMock).toHaveBeenCalledWith('actor', 'monalisa[bot]')
  expect(setOutputMock).toHaveBeenCalledWith('actor_type', 'Bot')
})

test('fails since GitHub Apps are configured to be rejected', async () => {
  process.env.INPUT_ALLOW_GITHUB_APPS = false
  context.actor = 'monalisa[bot]'

  octokit.rest.users.getByUsername = jest.fn().mockReturnValueOnce({
    status: 200,
    data: {
      type: 'Bot'
    }
  })

  expect(await validPermissions(octokit, context)).toEqual(
    'GitHub Apps are not allowed to use this Action based on the "allow_github_apps" input.'
  )
  expect(setOutputMock).toHaveBeenCalledWith('actor', 'monalisa[bot]')
  expect(setOutputMock).toHaveBeenCalledWith('actor_type', 'Bot')
  expect(infoMock).toHaveBeenCalledWith(
    `🔍 Detected actor type: Bot (${context.actor})`
  )
})

test('fails to fetch installation details for GitHub App', async () => {
  context.actor = 'monalisa[bot]'

  octokit.rest.users.getByUsername = jest.fn().mockReturnValueOnce({
    status: 200,
    data: {
      type: 'Bot'
    }
  })

  octokit.rest.apps.getRepoInstallation = jest.fn().mockReturnValueOnce({
    status: 500
  })

  expect(await validPermissions(octokit, context)).toEqual(
    'Failed to fetch GitHub App installation details: Status 500'
  )
  expect(setOutputMock).toHaveBeenCalledWith('actor', 'monalisa[bot]')
})
