import * as core from '@actions/core'
import {validPermissions} from '../../src/functions/valid-permissions'

const setOutputMock = jest.spyOn(core, 'setOutput')
const mockPermissionResponse = (permission, roleName) =>
  jest.fn().mockReturnValue({
    status: 200,
    data: {
      permission,
      ...(roleName === undefined ? {} : {role_name: roleName})
    }
  })

var octokit
var context
beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(core, 'setOutput').mockImplementation(() => {})
  process.env.INPUT_PERMISSIONS = 'write,admin'

  context = {
    actor: 'monalisa'
  }

  octokit = {
    rest: {
      repos: {
        getCollaboratorPermissionLevel: jest.fn().mockReturnValueOnce({
          status: 200,
          data: {
            permission: 'write'
          }
        })
      }
    }
  }
})

test('determines that a user has valid permissions to invoke the Action', async () => {
  expect(await validPermissions(octokit, context)).toEqual(true)
  expect(setOutputMock).toHaveBeenCalledWith('actor', 'monalisa')
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
})

test('allows a maintainer when maintain is configured', async () => {
  process.env.INPUT_PERMISSIONS = 'maintain,admin'
  octokit.rest.repos.getCollaboratorPermissionLevel = mockPermissionResponse(
    'write',
    'maintain'
  )

  expect(await validPermissions(octokit, context)).toEqual(true)
})

test('rejects an ordinary writer when only maintain and admin are configured', async () => {
  process.env.INPUT_PERMISSIONS = 'maintain,admin'
  octokit.rest.repos.getCollaboratorPermissionLevel = mockPermissionResponse(
    'write',
    'write'
  )

  expect(await validPermissions(octokit, context)).toEqual(
    '👋 __monalisa__, seems as if you have not maintain/admin permissions in this repo, permissions: write'
  )
})

test('keeps maintainers authorized by the default write and admin permissions', async () => {
  octokit.rest.repos.getCollaboratorPermissionLevel = mockPermissionResponse(
    'write',
    'maintain'
  )

  expect(await validPermissions(octokit, context)).toEqual(true)
})

test('allows an explicitly configured custom role', async () => {
  process.env.INPUT_PERMISSIONS = 'release-manager,admin'
  octokit.rest.repos.getCollaboratorPermissionLevel = mockPermissionResponse(
    'write',
    'release-manager'
  )

  expect(await validPermissions(octokit, context)).toEqual(true)
})

test('falls back to the base permission when role_name is missing', async () => {
  process.env.INPUT_PERMISSIONS = 'read,admin'
  octokit.rest.repos.getCollaboratorPermissionLevel =
    mockPermissionResponse('read')

  expect(await validPermissions(octokit, context)).toEqual(true)
})

test('reports both full and base permissions when they differ', async () => {
  process.env.INPUT_PERMISSIONS = 'admin'
  octokit.rest.repos.getCollaboratorPermissionLevel = mockPermissionResponse(
    'write',
    'maintain'
  )

  const permissionError = await validPermissions(octokit, context)
  expect(permissionError).toContain('permissions: maintain')
  expect(permissionError).toContain('base permission: write')
})

test('allows a triage role when triage and admin are configured', async () => {
  process.env.INPUT_PERMISSIONS = 'triage,admin'
  octokit.rest.repos.getCollaboratorPermissionLevel = mockPermissionResponse(
    'read',
    'triage'
  )

  expect(await validPermissions(octokit, context)).toEqual(true)
})

test('rejects an ordinary reader when only triage and admin are configured', async () => {
  process.env.INPUT_PERMISSIONS = 'triage,admin'
  octokit.rest.repos.getCollaboratorPermissionLevel =
    mockPermissionResponse('read')

  expect(await validPermissions(octokit, context)).toEqual(
    '👋 __monalisa__, seems as if you have not triage/admin permissions in this repo, permissions: read'
  )
})

test('allows a triage role through configured base read compatibility', async () => {
  process.env.INPUT_PERMISSIONS = 'read,admin'
  octokit.rest.repos.getCollaboratorPermissionLevel = mockPermissionResponse(
    'read',
    'triage'
  )

  expect(await validPermissions(octokit, context)).toEqual(true)
})

test('allows a custom role through the default write base permission', async () => {
  octokit.rest.repos.getCollaboratorPermissionLevel = mockPermissionResponse(
    'write',
    'release-manager'
  )

  expect(await validPermissions(octokit, context)).toEqual(true)
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
