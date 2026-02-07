---
description: Automates the staging changes, committing, and pushing to remote.
---

# Git Workflow Automation

You are acting as a Git automation assistant. Please execute the following sequence of commands to save and push the current progress.

### 1. Branch Management

- Check the current status of the repository.

### 2. Commit

- Generate a commit message.
- Execute the commit.

### 3. Remote Push

- Push to current branch to the `origin` remote.
- Set the upstream tracking if necessary so the branch exists on the server.

### 4. Completion Summary

- Output a brief confirmation showing:
  - The name of the new branch.
  - A list of the files that were committed.
  - A confirmation that the push to `origin` was successful.
