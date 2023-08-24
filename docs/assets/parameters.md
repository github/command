# Parameters

Given the highly customizable nature of the `command` Action, users may often find that they need to pass in a number of parameters into subsequent steps during their workflows. This Action provides a way to pass in parameters to your command without any required structure or format.

> All examples will use `.restart` as the example command

## Example

Here are a few examples of how to pass in parameters to the `.restart` command and why they might be used.

### Example 1

**Command**:

```text
.restart | LOG_LEVEL=debug CPU_CORES=4
```

**Outputs**: `params` = `LOG_LEVEL=debug CPU_CORES=4`

**Why**: A user might need to restart a VM and tell subsequent workflow steps to use a `LOG_LEVEL` of `debug` and during the restart we should use `CPU_CORES` of `4`

### Example 2

**Command**:

```text
.restart | server1 server2 server3
```

**Outputs**: `params` = `server1 server2 server3`

**Why**: This example shows that the `params` output is just a string that can be literally anything your heart desires. It is up to the user to parse the string and use it in subsequent steps.

## Parameter Separator

The `param_separator` input defaults to `|` and will collect any text that is provided after this character and save it as a GitHub Actions output called `params`. This output can then be used in subsequent steps.

This value can be configured to be any character (or string) that you want.

## Parameter Output

The `params` output can be accessed just like any other output from the `command` Action. Here is a quick example:

```yaml
- name: command
  id: command
  uses: github/command@vX.X.X
  with:
    command: .restart
    param_separator: "|"

- name: example
  if: steps.command.outputs.continue == 'true'
  run: |
    echo "params: ${{ steps.command.outputs.params }}"
```

If a user were to comment `.restart | superServer1` on a pull request, the result of this Action workflow would be the `command` step succeeding, setting a `continue = "true"` output, and then the `example` step running which would echo `params: superServer1` to the console's stdout.
