import {postReactions} from '../../src/functions/post-reactions'

var context
var octokit
beforeEach(() => {
  jest.clearAllMocks()

  context = {
    repo: {
      owner: 'corp',
      repo: 'test'
    },
    payload: {
      comment: {
        id: '1'
      }
    }
  }

  octokit = {
    rest: {
      reactions: {
        createForIssueComment: jest.fn().mockReturnValueOnce({
          data: {}
        }),
        deleteForIssueComment: jest.fn().mockReturnValueOnce({
          data: {}
        })
      }
    }
  }
})

test('adds a successful reaction', async () => {
  expect(await postReactions(octokit, context, '+1', '123')).toBe(undefined)
  expect(octokit.rest.reactions.createForIssueComment).toHaveBeenCalledWith({
    comment_id: '1',
    content: '+1',
    owner: 'corp',
    repo: 'test'
  })
  expect(octokit.rest.reactions.deleteForIssueComment).toHaveBeenCalledWith({
    comment_id: '1',
    owner: 'corp',
    reaction_id: 123,
    repo: 'test'
  })
})

test('adds a failure reaction', async () => {
  expect(await postReactions(octokit, context, '-1', '123')).toBe(undefined)
  expect(octokit.rest.reactions.createForIssueComment).toHaveBeenCalledWith({
    comment_id: '1',
    content: '-1',
    owner: 'corp',
    repo: 'test'
  })
  expect(octokit.rest.reactions.deleteForIssueComment).toHaveBeenCalledWith({
    comment_id: '1',
    owner: 'corp',
    reaction_id: 123,
    repo: 'test'
  })
})
