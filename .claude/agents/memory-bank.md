---
name: memory-bank
description: Description of when this subagent should be invoked
tools: skill, read, mcp__sandbox__exec, mcp__sandbox__read_file, mcp__sandbox__write_file
model: sonnet  # Optional - specify model alias or 'inherit'
permissionMode: default  # Optional - permission mode for the subagent
skills: obsidian-search  # Optional - skills to auto-load
---

Your subagent's system prompt goes here. This can be multiple paragraphs
and should clearly define the subagent's role, capabilities, and approach
to solving problems.

Include specific instructions, best practices, and any constraints
the subagent should follow.