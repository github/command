import {triggerCheck} from '../../src/functions/trigger-check'
import {COLORS} from '../../src/functions/colors'
import * as core from '@actions/core'

const setOutputMock = jest.spyOn(core, 'setOutput')
const debugMock = jest.spyOn(core, 'debug')

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(core, 'setOutput').mockImplementation(() => {})
  jest.spyOn(core, 'saveState').mockImplementation(() => {})
  jest.spyOn(core, 'debug').mockImplementation(() => {})
})

test('checks a message and finds a standard trigger', async () => {
  const body = '.test'
  const trigger = '.test'
  expect(await triggerCheck(body, trigger)).toBe(true)
  expect(setOutputMock).toHaveBeenCalledWith('comment_body', '.test')
})

test('checks a message and does not find trigger', async () => {
  const body = '.bad'
  const trigger = '.test'
  expect(await triggerCheck(body, trigger)).toBe(false)
  expect(setOutputMock).toHaveBeenCalledWith('comment_body', '.bad')
  expect(debugMock).toHaveBeenCalledWith(
    `trigger ${COLORS.highlight}${trigger}${COLORS.reset} not found in the comment body`
  )
})

test('checks a message and finds a trigger with extra text', async () => {
  const trigger = '.test'
  expect(await triggerCheck('.test dev something', trigger)).toBe(true)
  expect(setOutputMock).toHaveBeenCalledWith(
    'comment_body',
    '.test dev something'
  )

  expect(await triggerCheck('.test something', trigger)).toBe(true)
  expect(setOutputMock).toHaveBeenCalledWith(
    'comment_body',
    '.test dev something'
  )

  expect(await triggerCheck('.test dev something', trigger)).toBe(true)
  expect(setOutputMock).toHaveBeenCalledWith(
    'comment_body',
    '.test dev something'
  )

  expect(await triggerCheck('.test dev something', trigger)).toBe(true)
  expect(setOutputMock).toHaveBeenCalledWith(
    'comment_body',
    '.test dev something'
  )
})

test('checks a message and does not find a trigger', async () => {
  const body = 'I want to .ping a website'
  const trigger = '.test'
  expect(await triggerCheck(body, trigger)).toBe(false)
  expect(setOutputMock).toHaveBeenCalledWith(
    'comment_body',
    'I want to .ping a website'
  )
  expect(debugMock).toHaveBeenCalledWith(
    `trigger ${COLORS.highlight}${trigger}${COLORS.reset} not found in the comment body`
  )
})
