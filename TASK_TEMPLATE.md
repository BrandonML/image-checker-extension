# Task

## Objective

Describe the specific change required.

## Context

Explain why the change is needed.

## Files That May Be Modified

List the files that should be touched.

## Files That Must Not Be Modified

List anything that should remain unchanged.

## Constraints

Example:

- Do not add dependencies
- Do not change extension permissions
- Maintain Manifest V3 compatibility

## Acceptance Criteria

Clear definition of success. Example:

- Popup displays total image count
- Inspector mode still works
- No console errors

## Testing Steps

1. Load extension in Chrome via chrome://extensions
2. Open a page with images
3. Click extension icon
4. Verify expected behavior

## Existing Functionality Review

Before implementing changes, the agent must determine whether the task affects existing functionality.

If it does, the agent should:

- identify what existing logic may be impacted
- explain what behavior might change
- request confirmation if the change could remove or weaken existing features

Existing behavior should be preserved unless the task explicitly requires changing it.

## Alternative Solutions

If the agent believes a different approach would produce a better result, the agent should:

- briefly describe the alternative
- explain why it may be better
- wait for approval before proceeding

The agent should not change the task scope without confirmation.

## Error Handling During Task Execution

If the agent encounters problems while working on the task (such as failing builds, missing permissions, or environment issues), the agent should:

1. Describe the issue clearly.
2. Identify the step where the issue occurred.
3. Suggest possible fixes.

The agent should pause until the issue is resolved rather than attempting unrelated code changes.