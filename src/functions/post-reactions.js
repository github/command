// Helper function for adding reactions to the issue_comment on the 'post' event
// :param octokit: An authenticated octokit client
// :param context: The github context
// :param reaction: The reaction to add to the issue_comment
// :param reaction_id: The reaction_id of the initial reaction on the issue_comment
export async function postReactions(octokit, context, reaction, reaction_id) {
    // Update the action status to indicate the result of the action as a reaction
    // add a reaction to the issue_comment to indicate success or failure
    await octokit.rest.reactions.createForIssueComment({
        ...context.repo,
        comment_id: context.payload.comment.id,
        content: reaction
    })

    // remove the initial reaction on the IssueOp comment that triggered this action
    await octokit.rest.reactions.deleteForIssueComment({
        ...context.repo,
        comment_id: context.payload.comment.id,
        reaction_id: parseInt(reaction_id)
    })
}
