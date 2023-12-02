import {isAllowed} from '../../src/functions/allowlist'
import * as github from '@actions/github'
import * as core from '@actions/core'

const debugMock = jest.spyOn(core, 'debug').mockImplementation(() => {})
const warningMock = jest.spyOn(core, 'warning').mockImplementation(() => {})

class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.status = 404
  }
}

class WildError extends Error {
  constructor(message) {
    super(message)
    this.status = 500
  }
}

var context
var octokit
beforeEach(() => {
  jest.clearAllMocks()
  process.env.INPUT_ALLOWLIST_PAT = 'faketoken'
  process.env.INPUT_ALLOWLIST =
    'MoNaLiSa,@lisamona,octoawesome/octo-awEsome-team,bad$user'

  context = {
    actor: 'monalisa'
  }

  octokit = {
    request: jest.fn().mockReturnValueOnce({
      status: 204
    }),
    rest: {
      orgs: {
        get: jest.fn().mockReturnValueOnce({
          data: {id: '12345'}
        })
      },
      teams: {
        getByName: jest.fn().mockReturnValueOnce({
          data: {id: '567890'}
        })
      }
    }
  }

  jest.spyOn(github, 'getOctokit').mockImplementation(() => {
    return octokit
  })
})

test('runs isAllowed checks and finds a valid admin via handle reference', async () => {
  expect(await isAllowed(context)).toStrictEqual(true)
  expect(debugMock).toHaveBeenCalledWith(
    'monalisa is an allowlisted operator via handle reference'
  )
})

test('runs isAllowed checks and finds a valid handle that is a GitHub EMU', async () => {
  process.env.INPUT_ALLOWLIST = 'username_company'
  const contextNoAdmin = {
    actor: 'username_company'
  }
  expect(await isAllowed(contextNoAdmin)).toStrictEqual(true)
  expect(debugMock).toHaveBeenCalledWith(
    'username_company is an allowlisted operator via handle reference'
  )
})

test('runs isAllowed checks and does not find a valid admin', async () => {
  process.env.INPUT_ALLOWLIST = 'monalisa'
  const contextNoAdmin = {
    actor: 'eviluser'
  }
  expect(await isAllowed(contextNoAdmin)).toStrictEqual(false)
  expect(debugMock).toHaveBeenCalledWith(
    'eviluser is not an allowed operator for this command'
  )
})

test('runs isAllowed checks and does not find a valid admin due to a bad GitHub handle', async () => {
  process.env.INPUT_ALLOWLIST = 'mona%lisa-'
  const contextNoAdmin = {
    actor: 'mona%lisa-'
  }
  expect(await isAllowed(contextNoAdmin)).toStrictEqual(false)
  expect(debugMock).toHaveBeenCalledWith(
    'mona%lisa- is not a valid GitHub username... skipping allowlist check'
  )
})

test('runs isAllowed checks and determines that all users are allowed because it is unset', async () => {
  process.env.INPUT_ALLOWLIST = 'false'
  expect(await isAllowed(context)).toStrictEqual(true)
  expect(debugMock).toHaveBeenCalledWith(
    'no allowlist provided, all users are allowed'
  )
})

test('runs isAllowed checks for an org team and fails due to no admins_pat', async () => {
  process.env.INPUT_ALLOWLIST_PAT = 'false'
  process.env.INPUT_ALLOWLIST = 'octoawesome/octo-awesome'
  expect(await isAllowed(context)).toStrictEqual(false)
  expect(warningMock).toHaveBeenCalledWith(
    'no allowlist_pat provided, skipping allowlist check for org team membership'
  )
})

test('runs isAllowed checks for an org team and finds a valid user', async () => {
  process.env.INPUT_ALLOWLIST = 'octoawesome/octo-awesome-team'
  expect(await isAllowed(context)).toStrictEqual(true)
  expect(debugMock).toHaveBeenCalledWith(
    'monalisa is in octoawesome/octo-awesome-team'
  )
  expect(debugMock).toHaveBeenCalledWith(
    'monalisa is an allowlisted operator via org team reference'
  )
})

// This only handles the global failure case of any 404 in the admin.js file
test('runs isAllowed checks for an org team and does not find the org', async () => {
  jest.spyOn(github, 'getOctokit').mockImplementation(() => {
    return {
      rest: {
        orgs: {
          get: jest
            .fn()
            .mockRejectedValueOnce(
              new NotFoundError('Reference does not exist')
            )
        }
      }
    }
  })
  process.env.INPUT_ALLOWLIST = 'octoawesome/octo-awesome-team'
  expect(await isAllowed(context)).toStrictEqual(false)
  expect(debugMock).toHaveBeenCalledWith(
    'monalisa is not a member of the octoawesome/octo-awesome-team team'
  )
})

// This only handles the global failure case of any 404 in the admin.js file
test('runs isAllowed checks for an org team and does not find the team', async () => {
  jest.spyOn(github, 'getOctokit').mockImplementation(() => {
    return {
      rest: {
        orgs: {
          get: jest.fn().mockReturnValueOnce({
            data: {id: '12345'}
          })
        },
        teams: {
          getByName: jest
            .fn()
            .mockRejectedValueOnce(
              new NotFoundError('Reference does not exist')
            )
        }
      }
    }
  })
  process.env.INPUT_ALLOWLIST = 'octoawesome/octo-awesome-team'
  expect(await isAllowed(context)).toStrictEqual(false)
  expect(debugMock).toHaveBeenCalledWith(
    'monalisa is not a member of the octoawesome/octo-awesome-team team'
  )
})

// This test correctly tests if a user is a member of a team or not. If they are in a team a 204 is returned. If they are not a 404 is returned like in this test example
test('runs isAllowed checks for an org team and does not find the user in the team', async () => {
  jest.spyOn(github, 'getOctokit').mockImplementation(() => {
    return {
      request: jest
        .fn()
        .mockRejectedValueOnce(new NotFoundError('Reference does not exist')),
      rest: {
        orgs: {
          get: jest.fn().mockReturnValueOnce({
            data: {id: '12345'}
          })
        },
        teams: {
          getByName: jest.fn().mockReturnValueOnce({
            data: {id: '567890'}
          })
        }
      }
    }
  })
  process.env.INPUT_ALLOWLIST = 'octoawesome/octo-awesome-team'
  expect(await isAllowed(context)).toStrictEqual(false)
  expect(debugMock).toHaveBeenCalledWith(
    'monalisa is not a member of the octoawesome/octo-awesome-team team'
  )
})

test('runs isAllowed checks for an org team and an unexpected status code is received from the request method with octokit', async () => {
  jest.spyOn(github, 'getOctokit').mockImplementation(() => {
    return {
      request: jest.fn().mockReturnValueOnce({
        status: 500
      }),
      rest: {
        orgs: {
          get: jest.fn().mockReturnValueOnce({
            data: {id: '12345'}
          })
        },
        teams: {
          getByName: jest.fn().mockReturnValueOnce({
            data: {id: '567890'}
          })
        }
      }
    }
  })
  process.env.INPUT_ALLOWLIST = 'octoawesome/octo-awesome-team'
  expect(await isAllowed(context)).toStrictEqual(false)
  expect(debugMock).toHaveBeenCalledWith(
    'monalisa is not an allowed operator for this command'
  )
  expect(warningMock).toHaveBeenCalledWith(
    'non 204 response from org team check: 500'
  )
})

test('runs isAllowed checks for an org team and an unexpected error is thrown from any API call', async () => {
  jest.spyOn(github, 'getOctokit').mockImplementation(() => {
    return {
      request: jest
        .fn()
        .mockRejectedValueOnce(new WildError('something went boom')),
      rest: {
        orgs: {
          get: jest.fn().mockReturnValueOnce({
            data: {id: '12345'}
          })
        },
        teams: {
          getByName: jest.fn().mockReturnValueOnce({
            data: {id: '567890'}
          })
        }
      }
    }
  })
  process.env.INPUT_ALLOWLIST = 'octoawesome/octo-awesome-team'
  expect(await isAllowed(context)).toStrictEqual(false)
  expect(debugMock).toHaveBeenCalledWith(
    'monalisa is not an allowed operator for this command'
  )
  expect(warningMock).toHaveBeenCalledWith(
    'Error checking org team membership: Error: something went boom'
  )
})
