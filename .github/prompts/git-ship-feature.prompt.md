---
description: Automates the creation of a branch, staging changes, committing, and pushing to remote.
---

# Git Workflow Automation

You are acting as a Git automation assistant. Please execute the following sequence of commands to save and push the current progress.

### 1. Branch Management

- Check the current status of the repository.
- Create a new branch named `feature/` followed by a descriptive slug based on the current changes.
- Switch to this new branch immediately.

### 2. Prepare Changes

- Identify all modified, new, or deleted files related to the current task.
- Stage these files for commit.

### 3. Commit

- Generate a commit message.
- Execute the commit.

### 4. Remote Push

- Push the newly created branch to the `origin` remote.
- Set the upstream tracking if necessary so the branch exists on the server.

### 5. Completion Summary

- Output a brief confirmation showing:
  - The name of the new branch.
  - A list of the files that were committed.
  - A confirmation that the push to `origin` was successful.
