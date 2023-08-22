import * as core from '@actions/core'
import {COLORS} from './colors'

// Helper function that checks and returns params used in a command
// :param body: The body of the comment
// :param param_separator: The separator used to seperate the command from the parameters
// :returns: the parameters used in the command (String) or null if none are used
export async function parameters(body, param_separator = '|') {
  // Seperate the issueops command on the 'param_separator'
  var paramCheck = body.split(param_separator)
  paramCheck.shift() // remove everything before the 'param_separator'
  const params = paramCheck.join(param_separator) // join it all back together (in case there is another separator)
  // if there is anything after the 'param_separator'; output it, log it, and remove it from the body for env checks
  var paramsTrim = null
  if (params !== '') {
    paramsTrim = params.trim()
    core.info(`🧮 detected parameters in command: ${COLORS.highlight}${paramsTrim}`)
    core.setOutput('params', paramsTrim)
  } else {
    core.debug('no parameters detected in command')
    core.setOutput('params', '')
  }

  return paramsTrim
}
