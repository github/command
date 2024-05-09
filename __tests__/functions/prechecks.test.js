import {prechecks} from '../../src/functions/prechecks'
import {COLORS} from '../../src/functions/colors'
import * as isAllowed from '../../src/functions/allowlist'
import * as validPermissions from '../../src/functions/valid-permissions'
import * as core from '@actions/core'

// Globals for testing
const infoMock = jest.spyOn(core, 'info')
const debugMock = jest.spyOn(core, 'debug')
const defaultContextType = 'pull_request'

var context
var octokit

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(core, 'info').mockImplementation(() => {})
  jest.spyOn(core, 'debug').mockImplementation(() => {})
  jest.spyOn(core, 'warning').mockImplementation(() => {})
  jest.spyOn(core, 'setOutput').mockImplementation(() => {})
  process.env.INPUT_PERMISSIONS = 'admin,write,maintain'

  jest.spyOn(validPermissions, 'validPermissions').mockImplementation(() => {
    return true
  })

  jest.spyOn(isAllowed, 'isAllowed').mockImplementation(() => {
    return true
  })

  context = {
    actor: 'monalisa',
    repo: {
      owner: 'corp',
      repo: 'test'
    },
    issue: {
      number: 123
    }
  }

  octokit = {
    rest: {
      repos: {
        getCollaboratorPermissionLevel: jest
          .fn()
          .mockReturnValue({data: {permission: 'write'}, status: 200})
      },
      pulls: {
        get: jest.fn().mockReturnValue({
          data: {
            head: {
              ref: 'test-ref',
              sha: 'abc123'
            },
            base: {
              ref: 'base-ref'
            }
          },
          status: 200
        })
      }
    },
    graphql: jest.fn().mockReturnValue({
      repository: {
        pullRequest: {
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          commits: {
            nodes: [
              {
                commit: {
                  checkSuites: {
                    totalCount: 3
                  },
                  statusCheckRollup: {
                    state: 'SUCCESS'
                  }
                }
              }
            ]
          }
        }
      }
    })
  }
})

test('runs prechecks and finds that the IssueOps command is valid', async () => {
  expect(
    await prechecks(
      '123', // issue_number
      true, // allowForks
      false, // skipCi
      false, // skipReviews
      false, // allowDraftPRs
      defaultContextType, // contextType
      context, // context
      octokit // octokit
    )
  ).toStrictEqual({
    message: '✅ PR is approved and all CI checks passed',
    ref: 'test-ref',
    status: true,
    sha: 'abc123'
  })
})

test('runs prechecks and finds that the IssueOps command is valid and exits early because the command came from an issue and not a pr', async () => {
  expect(
    await prechecks(
      '123', // issue_number
      true, // allowForks
      false, // skipCi
      false, // skipReviews
      false, // allowDraftPRs
      'issue', // contextType
      context, // context
      octokit // octokit
    )
  ).toStrictEqual({
    message: `✅ operation requested on an ${COLORS.highlight}issue`,
    ref: null,
    status: true,
    sha: null
  })
})

test('runs prechecks and finds that the IssueOps command is valid without defined CI checks', async () => {
  octokit.graphql = jest.fn().mockReturnValueOnce({
    repository: {
      pullRequest: {
        reviewDecision: 'APPROVED'
      }
    }
  })
  expect(
    await prechecks(
      '123',
      true, // allowForks
      false, // skip_ci
      false, // skipReviews
      false, // allowDraftPRs
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message: '✅ CI checks have not been defined but the PR has been approved',
    status: true,
    ref: 'test-ref',
    sha: 'abc123'
  })
  expect(debugMock).toHaveBeenCalledWith(
    "could not retrieve PR commit status: TypeError: Cannot read properties of undefined (reading 'nodes') - Handled: OK"
  )
  expect(debugMock).toHaveBeenCalledWith(
    'this repo may not have any CI checks defined'
  )
  expect(debugMock).toHaveBeenCalledWith(
    'skipping commit status check and proceeding...'
  )
})

test('runs prechecks and fails due to a bad pull request', async () => {
  octokit.rest.pulls.get = jest.fn().mockReturnValueOnce({status: 500})
  expect(
    await prechecks(
      '123',
      true,
      false,
      false,
      false,
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message: 'Could not retrieve PR info: 500',
    status: false
  })
})

test('runs prechecks and finds that reviews and CI checks have not been defined', async () => {
  octokit.graphql = jest.fn().mockReturnValueOnce({
    repository: {
      pullRequest: {
        reviewDecision: null
      }
    }
  })
  expect(
    await prechecks(
      '123',
      true, // allowForks
      false, // skip_ci
      false, // skipReviews
      false, // allowDraftPRs
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message:
      '🎛️ CI checks have not been defined and required reviewers have not been defined',
    status: true,

    ref: 'test-ref',
    sha: 'abc123'
  })
  expect(debugMock).toHaveBeenCalledWith(
    "could not retrieve PR commit status: TypeError: Cannot read properties of undefined (reading 'nodes') - Handled: OK"
  )
  expect(debugMock).toHaveBeenCalledWith(
    'this repo may not have any CI checks defined'
  )
  expect(debugMock).toHaveBeenCalledWith(
    'skipping commit status check and proceeding...'
  )
  expect(infoMock).toHaveBeenCalledWith(
    '🎛️ CI checks have not been defined and required reviewers have not been defined'
  )
})

test('runs prechecks and finds CI checks pass but reviews are not defined', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: null,
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 1
                },
                statusCheckRollup: {
                  state: 'SUCCESS'
                }
              }
            }
          ]
        }
      }
    }
  })
  expect(
    await prechecks(
      '123',
      true, // allowForks
      false, // skip_ci
      false, // skipReviews
      false, // allowDraftPRs
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message: '✅ CI checks are passing and reviews are not defined',
    status: true,
    ref: 'test-ref',
    sha: 'abc123'
  })
  expect(infoMock).toHaveBeenLastCalledWith(
    '✅ CI checks are passing and reviews are not defined'
  )
})

test('runs prechecks and finds that the IssueOps command is valid for a branch operation and is from a forked repository', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'APPROVED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 8
                },
                statusCheckRollup: {
                  state: 'SUCCESS'
                }
              }
            }
          ]
        }
      }
    }
  })
  octokit.rest.pulls.get = jest.fn().mockReturnValue({
    data: {
      head: {
        sha: 'abcde12345',
        ref: 'test-ref',
        label: 'test-repo:test-ref',
        repo: {
          fork: true
        }
      }
    },
    status: 200
  })
  expect(
    await prechecks(
      '123',
      true, // allow forks
      false, // skip_ci
      false, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message: '✅ PR is approved and all CI checks passed',
    status: true,

    ref: 'abcde12345',
    sha: 'abcde12345'
  })
})

test('runs prechecks and finds that the IssueOps command is on a PR from a forked repo and is not allowed', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'APPROVED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 1
                },
                statusCheckRollup: {
                  state: 'SUCCESS'
                }
              }
            }
          ]
        }
      }
    }
  })
  octokit.rest.pulls.get = jest.fn().mockReturnValue({
    data: {
      head: {
        sha: 'abcde12345',
        ref: 'test-ref',
        repo: {
          fork: true
        }
      }
    },
    status: 200
  })
  expect(
    await prechecks(
      '123',
      false, // allow forks
      false, // skip_ci
      false, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message: `### ⚠️ Cannot proceed with operation\n\nThis Action has been explicity configured to prevent operations from forks. You can change this via this Action's inputs if needed`,
    status: false
  })
})

test('runs prechecks and finds CI is pending and the PR has not been reviewed', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'REVIEW_REQUIRED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 2
                },
                statusCheckRollup: {
                  state: 'PENDING'
                }
              }
            }
          ]
        }
      }
    }
  })

  expect(
    await prechecks(
      '123',
      true, // allow forks
      false, // skip_ci
      false, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message:
      '### ⚠️ Cannot proceed with operation\n\n- reviewDecision: `REVIEW_REQUIRED`\n- commitStatus: `PENDING`\n\n> CI is still in a pending state and reviews are also required for this operation',
    status: false
  })
})

test('runs prechecks and finds CI is pending and the PR has not been reviewed but skip_reviews is set', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'REVIEW_REQUIRED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 2
                },
                statusCheckRollup: {
                  state: 'PENDING'
                }
              }
            }
          ]
        }
      }
    }
  })

  expect(
    await prechecks(
      '123',
      true, // allow forks
      false, // skip_ci
      true, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message:
      '### ⚠️ Cannot proceed with operation\n\n- reviewDecision: `skip_reviews`\n- commitStatus: `PENDING`\n\n> Reviews are not required for this operation but CI checks must be passing in order to continue',
    status: false
  })
})

test('runs prechecks and finds CI is failing and the PR has not been reviewed but skip_reviews is set', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'REVIEW_REQUIRED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 2
                },
                statusCheckRollup: {
                  state: 'FAILURE'
                }
              }
            }
          ]
        }
      }
    }
  })

  expect(
    await prechecks(
      '123',
      true, // allow forks
      false, // skip_ci
      true, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message:
      '### ⚠️ Cannot proceed with operation\n\n- reviewDecision: `skip_reviews`\n- commitStatus: `FAILURE`\n\n> Reviews are not required for this operation but CI checks must be passing in order to continue',
    status: false
  })
})

test('runs prechecks and finds CI is pending and reviewers have not been defined', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: null,
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 3
                },
                statusCheckRollup: {
                  state: 'PENDING'
                }
              }
            }
          ]
        }
      }
    }
  })
  expect(
    await prechecks(
      '123',
      true,
      false,
      false,
      false,
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message:
      '### ⚠️ Cannot proceed with operation\n\n- reviewDecision: `null`\n- commitStatus: `PENDING`\n\n> CI checks must be passing in order to continue',
    status: false
  })
})

test('runs prechecks and finds CI checked have not been defined and the PR has not been reviewed', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'REVIEW_REQUIRED'
      }
    }
  })

  expect(
    await prechecks(
      '123',
      true, // allow forks
      false, // skip_ci
      false, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message: `### ⚠️ Cannot proceed with operation\n\n- reviewDecision: \`REVIEW_REQUIRED\`\n- commitStatus: \`null\`\n\n> CI checks have not been defined but reviews are required for this operation`,
    status: false
  })
})

test('runs prechecks and finds the PR has been approved but CI checks are pending', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'APPROVED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 14
                },
                statusCheckRollup: {
                  state: 'PENDING'
                }
              }
            }
          ]
        }
      }
    }
  })
  expect(
    await prechecks(
      '123',
      true, // allow forks
      false, // skip_ci
      false, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message:
      '### ⚠️ Cannot proceed with operation\n\n- reviewDecision: `APPROVED`\n- commitStatus: `PENDING`\n\n> Reviews are not required for this operation but CI checks must be passing in order to continue',
    status: false
  })
})

test('runs prechecks and finds CI is passing but the PR is missing an approval', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'REVIEW_REQUIRED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 1
                },
                statusCheckRollup: {
                  state: 'SUCCESS'
                }
              }
            }
          ]
        }
      }
    }
  })
  expect(
    await prechecks(
      '123',
      true, // allow forks
      false, // skip_ci
      false, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message:
      '### ⚠️ Cannot proceed with operation\n\n> CI checks are passing but the PR has not been reviewed',
    status: false
  })
})

test('runs prechecks and finds the PR is approved but CI is failing', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'APPROVED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 1
                },
                statusCheckRollup: {
                  state: 'FAILURE'
                }
              }
            }
          ]
        }
      }
    }
  })
  expect(
    await prechecks(
      '123',
      true,
      false,
      false,
      false,
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message:
      '### ⚠️ Cannot proceed with operation\n\n- reviewDecision: `APPROVED`\n- commitStatus: `FAILURE`\n\n> Your pull request is approved but CI checks are failing',
    status: false
  })
})

test('runs prechecks and finds the PR does not require approval but CI is failing', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: null,
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 1
                },
                statusCheckRollup: {
                  state: 'FAILURE'
                }
              }
            }
          ]
        }
      }
    }
  })
  expect(
    await prechecks(
      '123',
      true, // allow forks
      false, // skip_ci
      false, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message:
      '### ⚠️ Cannot proceed with operation\n\n- reviewDecision: `null`\n- commitStatus: `FAILURE`\n\n> Reviews are not required for this operation but CI checks must be passing in order to continue',
    status: false
  })
})

test('runs prechecks and finds the skip_ci is set and reviews are not required', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: null,
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 1
                },
                statusCheckRollup: {
                  state: 'FAILURE'
                }
              }
            }
          ]
        }
      }
    }
  })
  expect(
    await prechecks(
      '123',
      true, // allow forks
      true, // skip_ci
      false, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message:
      '✅ CI requirements have been disabled for this operation and reviews are not required',
    status: true,
    ref: 'test-ref',
    sha: 'abc123'
  })
})

test('runs prechecks and finds the PR is a DRAFT PR', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'BLOCKED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 1
                },
                statusCheckRollup: {
                  state: 'SUCCESS'
                }
              }
            }
          ]
        }
      }
    }
  })
  octokit.rest.pulls.get = jest.fn().mockReturnValue({
    data: {
      head: {
        ref: 'test-ref',
        sha: 'abc123'
      },
      base: {
        ref: 'main'
      },
      draft: true
    },
    status: 200
  })

  expect(
    await prechecks(
      '123',
      true, // allow forks
      false, // skip_ci
      false, // skip_reviews
      false, // allow_drafts input option
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message:
      '### ⚠️ Cannot proceed with operation\n\n> Your pull request is in a draft state',
    status: false
  })
})

test('runs prechecks and finds the PR is a DRAFT PR and drafts are allowed', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'CLEAN',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 1
                },
                statusCheckRollup: {
                  state: 'SUCCESS'
                }
              }
            }
          ]
        }
      }
    }
  })
  octokit.rest.pulls.get = jest.fn().mockReturnValue({
    data: {
      head: {
        ref: 'test-ref',
        sha: 'abc123'
      },
      base: {
        ref: 'main'
      },
      draft: true // telling the test suite that our PR is in a draft state
    },
    status: 200
  })

  expect(
    await prechecks(
      '123',
      true,
      false,
      false,
      true, // allow_drafts input option
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message: '✅ PR is approved and all CI checks passed',
    ref: 'test-ref',
    status: true,
    sha: 'abc123'
  })
})

test('runs prechecks and fails with a non 200 permissionRes.status', async () => {
  jest.spyOn(validPermissions, 'validPermissions').mockImplementation(() => {
    return 'Permission check returns non-200 status: 500'
  })
  expect(
    await prechecks('123', true, false, false, false, context, octokit)
  ).toStrictEqual({
    message: 'Permission check returns non-200 status: 500',
    status: false
  })
})

test('runs prechecks and finds that no CI checks exist but reviews are defined', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'APPROVED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 0
                },
                statusCheckRollup: null
              }
            }
          ]
        }
      }
    }
  })
  expect(
    await prechecks(
      '123',
      true, // allow forks
      false, // skip_ci
      false, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message: '✅ CI checks have not been defined but the PR has been approved',
    status: true,
    ref: 'test-ref',
    sha: 'abc123'
  })
})

test('runs prechecks and finds that skip_ci is set and the PR has been approved', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'APPROVED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 0
                },
                statusCheckRollup: null
              }
            }
          ]
        }
      }
    }
  })

  expect(
    await prechecks(
      '123',
      true, // allow forks
      true, // skip_ci
      false, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message:
      '✅ CI requirements have been disabled for this operation and the PR has been approved',
    status: true,
    ref: 'test-ref',
    sha: 'abc123'
  })
})

test('runs prechecks and finds that the user is not an allowed operator', async () => {
  jest.spyOn(isAllowed, 'isAllowed').mockImplementation(() => {
    return false
  })

  expect(
    await prechecks(
      '123',
      true,
      false, // skip_ci
      true, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message: `### ⚠️ Cannot proceed with operation\n\n> User monalisa is not an allowed operator`,
    status: false
  })

  expect(
    await prechecks(
      '123',
      true,
      false, // skip_ci
      true, // skip_reviews
      false, // allow_drafts
      'issue', // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message: `### ⚠️ Cannot proceed with operation\n\n> User monalisa is not an allowed operator`,
    status: false
  })
})

test('runs prechecks and finds that skip_ci is set and no reviews are defined', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: null,
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 1
                },
                statusCheckRollup: {
                  state: 'FAILURE'
                }
              }
            }
          ]
        }
      }
    }
  })

  expect(
    await prechecks(
      '123',
      true,
      true, // skip_ci
      true, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message: '✅ CI and PR reviewers are not required for this operation',
    ref: 'test-ref',
    status: true,
    sha: 'abc123'
  })

  expect(infoMock).toHaveBeenCalledWith(
    '✅ CI and PR reviewers are not required for this operation'
  )
})

test('runs prechecks and finds that skip_ci is set and skip_reviews is set', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'REVIEW_REQUIRED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 1
                },
                statusCheckRollup: {
                  state: 'FAILURE'
                }
              }
            }
          ]
        }
      }
    }
  })

  expect(
    await prechecks(
      '123',
      true,
      true, // skip_ci
      true, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message: '✅ CI and PR reviewers are not required for this operation',
    ref: 'test-ref',
    status: true,
    sha: 'abc123'
  })

  expect(infoMock).toHaveBeenCalledWith(
    '✅ CI and PR reviewers are not required for this operation'
  )
})

test('runs prechecks and finds that skip_ci is set', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'REVIEW_REQUIRED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 1
                },
                statusCheckRollup: {
                  state: 'FAILURE'
                }
              }
            }
          ]
        }
      }
    }
  })

  expect(
    await prechecks(
      '123',
      true,
      true, // skip_ci
      false, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message: `### ⚠️ Cannot proceed with operation\n\n> CI checks are not required for this operation but the PR has not been reviewed`,
    status: false
  })
})

test('runs prechecks and finds that CI is pending and reviewers have not been defined', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: null,
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 1
                },
                statusCheckRollup: {
                  state: 'PENDING'
                }
              }
            }
          ]
        }
      }
    }
  })

  expect(
    await prechecks(
      '123',
      true,
      false, // skip_ci
      false, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message: `### ⚠️ Cannot proceed with operation\n\n- reviewDecision: \`null\`\n- commitStatus: \`PENDING\`\n\n> CI checks must be passing in order to continue`,
    status: false
  })
})

test('runs prechecks and finds that the PR is NOT reviewed and CI checks have been disabled', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'REVIEW_REQUIRED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 1
                },
                statusCheckRollup: {
                  state: 'PENDING'
                }
              }
            }
          ]
        }
      }
    }
  })

  expect(
    await prechecks(
      '123',
      true,
      true, // skip_ci
      true, // skip_reviews
      false, // allow_drafts
      defaultContextType, // contextType
      context,
      octokit
    )
  ).toStrictEqual({
    message: `✅ CI and PR reviewers are not required for this operation`,
    status: true,
    ref: 'test-ref',
    sha: 'abc123'
  })
})

test('runs prechecks and finds the PR is approved and ci is passing', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'APPROVED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 1
                },
                statusCheckRollup: {
                  state: 'SUCCESS'
                }
              }
            }
          ]
        }
      }
    }
  })

  expect(
    await prechecks(
      '123', // issue_number
      true, // allowForks
      false, // skipCi
      false, // skipReviews
      false, // allow_drafts
      defaultContextType, // contextType
      context, // event context
      octokit // octokit instance
    )
  ).toStrictEqual({
    message: '✅ PR is approved and all CI checks passed',
    status: true,
    ref: 'test-ref',
    sha: 'abc123'
  })
})

test('runs prechecks and finds the PR is approved and ci is passing', async () => {
  octokit.graphql = jest.fn().mockReturnValue({
    repository: {
      pullRequest: {
        reviewDecision: 'REVIEW_REQUIRED',
        commits: {
          nodes: [
            {
              commit: {
                checkSuites: {
                  totalCount: 1
                },
                statusCheckRollup: {
                  state: 'SUCCESS'
                }
              }
            }
          ]
        }
      }
    }
  })

  expect(
    await prechecks(
      '123', // issue_number
      true, // allowForks
      false, // skipCi
      true, // skipReviews
      false, // allow_drafts
      defaultContextType, // contextType
      context, // event context
      octokit // octokit instance
    )
  ).toStrictEqual({
    message:
      '✅ CI checks are passing and reviews have been disabled for this operation',
    status: true,
    ref: 'test-ref',
    sha: 'abc123'
  })
})
