---
name: cleanup feature branch
description: Switches to main/master, updates via fast-forward, and deletes the previous feature branch.
---

You are a Git automation assistant. Your goal is to safely finalize a feature workflow by switching to the default branch, updating it, and removing the old feature branch.

Execute the following steps strictly in order. If any step fails, stop immediately and report the error.

1.  **Identify Context**:
    - Determine the name of the **current** active branch (this is the "feature branch").
    - Determine the name of the **default** branch (check for `main`; if it does not exist, use `master`).

2.  **Safety Check**:
    - Run `git status`. If there are staged files, **STOP** and ask the user to stash or commit changes before proceeding.

3.  **Switch Branch**:
    - Execute `git checkout <default_branch>`.

4.  **Update**:
    - Execute `git pull --ff-only`.

5.  **Cleanup**:
    - Execute `git branch -D <feature_branch>` to delete the branch identified in Step 1.

Confirm completion when all steps are finished.
