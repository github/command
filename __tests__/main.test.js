import {run} from '../src/main'
import * as reactEmote from '../src/functions/react-emote'
import * as contextCheck from '../src/functions/context-check'
import * as prechecks from '../src/functions/prechecks'
import * as actionStatus from '../src/functions/action-status'
import * as github from '@actions/github'
import * as core from '@actions/core'

const setOutputMock = jest.spyOn(core, 'setOutput')
const saveStateMock = jest.spyOn(core, 'saveState')
const setFailedMock = jest.spyOn(core, 'setFailed')
const infoMock = jest.spyOn(core, 'info')
// const debugMock = jest.spyOn(core, 'debug')

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(core, 'setOutput').mockImplementation(() => {})
  jest.spyOn(core, 'setFailed').mockImplementation(() => {})
  jest.spyOn(core, 'saveState').mockImplementation(() => {})
  jest.spyOn(core, 'info').mockImplementation(() => {})
  jest.spyOn(core, 'debug').mockImplementation(() => {})
  jest.spyOn(core, 'warning').mockImplementation(() => {})
  jest.spyOn(core, 'error').mockImplementation(() => {})
  process.env.INPUT_GITHUB_TOKEN = 'faketoken'
  process.env.INPUT_COMMAND = '.deploy'
  process.env.INPUT_REACTION = 'eyes'
  process.env.INPUT_PARAM_SEPARATOR = '|'
  process.env.INPUT_REQUIRED_CONTEXTS = 'false'
  process.env.INPUT_ALLOW_FORKS = 'false'
  process.env.INPUT_SKIP_CI = 'false'
  process.env.INPUT_ALLOW_DRAFTS = 'false'
  process.env.INPUT_SKIP_REVIEWS = 'false'
  process.env.GITHUB_REPOSITORY = 'corp/test'
  github.context.payload = {
    issue: {
      number: 123
    },
    comment: {
      body: '.deploy',
      id: 123,
      user: {
        login: 'monalisa'
      }
    }
  }

  jest.spyOn(github, 'getOctokit').mockImplementation(() => {
    return {
      rest: {
        issues: {
          createComment: jest.fn().mockReturnValueOnce({
            data: {}
          })
        },
        repos: {
          createDeployment: jest.fn().mockImplementation(() => {
            return {
              data: {id: 123}
            }
          }),
          createDeploymentStatus: jest.fn().mockImplementation(() => {
            return {data: {}}
          })
        },
        pulls: {
          get: jest.fn().mockImplementation(() => {
            return {data: {head: {ref: 'test-ref'}}, status: 200}
          })
        }
      }
    }
  })
  jest.spyOn(contextCheck, 'contextCheck').mockImplementation(() => {
    return true
  })
  jest.spyOn(reactEmote, 'reactEmote').mockImplementation(() => {
    return {data: {id: '123'}}
  })
  jest.spyOn(prechecks, 'prechecks').mockImplementation(() => {
    return {
      ref: 'test-ref',
      status: true,
      message: '✔️ PR is approved and all CI checks passed - OK',
      noopMode: false
    }
  })
})

test('successfully runs the action', async () => {
  expect(await run()).toBe('success')
  expect(setOutputMock).toHaveBeenCalledWith('comment_body', '.deploy')
  expect(setOutputMock).toHaveBeenCalledWith('triggered', 'true')
  expect(setOutputMock).toHaveBeenCalledWith('comment_id', 123)
  expect(setOutputMock).toHaveBeenCalledWith('ref', 'test-ref')
  expect(setOutputMock).toHaveBeenCalledWith('continue', 'true')
  expect(setOutputMock).toHaveBeenCalledWith('params', '')
  expect(saveStateMock).toHaveBeenCalledWith('isPost', 'true')
  expect(saveStateMock).toHaveBeenCalledWith('actionsToken', 'faketoken')
  expect(saveStateMock).toHaveBeenCalledWith('comment_id', 123)
  expect(saveStateMock).toHaveBeenCalledWith('ref', 'test-ref')
})

test('successfully runs the action with parameters', async () => {
  const body = '.deploy | test1 test2 --vm-size=chonky'
  github.context.payload.comment.body = body
  process.env.INPUT_COMMAND = body
  expect(await run()).toBe('success')
  expect(setOutputMock).toHaveBeenCalledWith('comment_body', body)
  expect(setOutputMock).toHaveBeenCalledWith('triggered', 'true')
  expect(setOutputMock).toHaveBeenCalledWith('comment_id', 123)
  expect(setOutputMock).toHaveBeenCalledWith('ref', 'test-ref')
  expect(setOutputMock).toHaveBeenCalledWith('continue', 'true')
  expect(setOutputMock).toHaveBeenCalledWith(
    'params',
    'test1 test2 --vm-size=chonky'
  )
  expect(saveStateMock).toHaveBeenCalledWith('isPost', 'true')
  expect(saveStateMock).toHaveBeenCalledWith('actionsToken', 'faketoken')
  expect(saveStateMock).toHaveBeenCalledWith('comment_id', 123)
  expect(saveStateMock).toHaveBeenCalledWith('ref', 'test-ref')
})

test('successfully runs the action after trimming the body', async () => {
  const body = '.deploy    \n\t\n   '
  expect(await run()).toBe('success')
  expect(setOutputMock).toHaveBeenCalledWith('comment_body', '.deploy')
  expect(setOutputMock).toHaveBeenCalledWith('triggered', 'true')
  expect(setOutputMock).toHaveBeenCalledWith('comment_id', 123)
  expect(setOutputMock).toHaveBeenCalledWith('ref', 'test-ref')
  expect(setOutputMock).toHaveBeenCalledWith('continue', 'true')
  expect(setOutputMock).toHaveBeenCalledWith('params', '')
  expect(saveStateMock).toHaveBeenCalledWith('isPost', 'true')
  expect(saveStateMock).toHaveBeenCalledWith('actionsToken', 'faketoken')
  expect(saveStateMock).toHaveBeenCalledWith('comment_id', 123)
  expect(saveStateMock).toHaveBeenCalledWith('ref', 'test-ref')
})

test('fails due to a bad context', async () => {
  jest.spyOn(contextCheck, 'contextCheck').mockImplementation(() => {
    return false
  })
  expect(await run()).toBe('safe-exit')
})

test('fails due to no trigger being found', async () => {
  process.env.INPUT_COMMAND = '.shipit'
  expect(await run()).toBe('safe-exit')
  expect(infoMock).toHaveBeenCalledWith(
    'no command detected in comment - exiting'
  )
})

test('fails prechecks', async () => {
  jest.spyOn(prechecks, 'prechecks').mockImplementation(() => {
    return {
      ref: 'test-ref',
      status: false,
      message: '### ⚠️ Cannot proceed with deployment... something went wrong',
      noopMode: false
    }
  })
  jest.spyOn(actionStatus, 'actionStatus').mockImplementation(() => {
    return undefined
  })
  expect(await run()).toBe('failure')
  expect(saveStateMock).toHaveBeenCalledWith('bypass', 'true')
  expect(setFailedMock).toHaveBeenCalledWith(
    '### ⚠️ Cannot proceed with deployment... something went wrong'
  )
})
