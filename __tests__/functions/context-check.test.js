import {contextCheck} from '../../src/functions/context-check'
import * as core from '@actions/core'

const warningMock = jest.spyOn(core, 'warning')
const saveStateMock = jest.spyOn(core, 'saveState')

var context
beforeEach(() => {
  jest.clearAllMocks()
  process.env.INPUT_ALLOWED_CONTEXTS = 'pull_request,issue'
  jest.spyOn(core, 'warning').mockImplementation(() => {})
  jest.spyOn(core, 'saveState').mockImplementation(() => {})
  jest.spyOn(core, 'debug').mockImplementation(() => {})

  context = {
    eventName: 'issue_comment',
    payload: {
      issue: {
        pull_request: {}
      }
    },
    pull_request: {
      number: 1
    }
  }
})

test('checks the event context and finds that it is valid', async () => {
  expect(await contextCheck(context)).toStrictEqual({
    valid: true,
    context: 'pull_request'
  })
})

test('checks the event context for an issue comment and finds that it is valid', async () => {
  context.payload.issue = {}
  expect(await contextCheck(context)).toStrictEqual({
    valid: true,
    context: 'issue'
  })
})

test('checks the event context for an issue comment and finds that it is valid - when only issue comments are allowed', async () => {
  process.env.INPUT_ALLOWED_CONTEXTS = 'issue'
  context.payload.issue = {}
  expect(await contextCheck(context)).toStrictEqual({
    valid: true,
    context: 'issue'
  })
})

test('checks the event context for a pr comment and finds that it is valid - when only pr comments are allowed', async () => {
  process.env.INPUT_ALLOWED_CONTEXTS = 'pull_request'
  expect(await contextCheck(context)).toStrictEqual({
    valid: true,
    context: 'pull_request'
  })
})

test('checks the event context for a pr comment and finds that it is invalid - when only pr comments are allowed', async () => {
  process.env.INPUT_ALLOWED_CONTEXTS = 'pull_request'
  context.payload.issue = {}
  expect(await contextCheck(context)).toStrictEqual({
    valid: false,
    context: 'issue_comment'
  })

  expect(warningMock).toHaveBeenCalledWith(
    'this Action can only be run in the context of a pull request comment'
  )
})

test('checks the event context for an issue comment and finds that it is invalid - when only issue comments are allowed', async () => {
  process.env.INPUT_ALLOWED_CONTEXTS = 'issue'
  expect(await contextCheck(context)).toStrictEqual({
    valid: false,
    context: 'issue_comment'
  })

  expect(warningMock).toHaveBeenCalledWith(
    'this Action can only be run in the context of an issue comment'
  )
})

test('checks the event context and finds that it is invalid', async () => {
  context.eventName = 'push'
  expect(await contextCheck(context)).toStrictEqual({
    valid: false,
    context: 'push'
  })
  expect(warningMock).toHaveBeenCalledWith(
    'this Action can only be run in the context of an issue_comment'
  )
  expect(saveStateMock).toHaveBeenCalledWith('bypass', 'true')
})

test('checks the event context and throws an error', async () => {
  try {
    await contextCheck('evil')
  } catch (e) {
    expect(e.message).toBe(
      "Could not get PR event context: TypeError: Cannot read properties of undefined (reading 'issue')"
    )
  }
})
