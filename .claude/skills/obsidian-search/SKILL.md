---
name: obsidian-search
description: Search and analyze Obsidian markdown notes stored in /data/obsidian directory. Use when user asks to find, search, lookup, or retrieve information from their Obsidian notes, personal knowledge base, or vault. Handles markdown syntax, tags, internal links, headers, and timestamps. Returns summaries with file paths.
---

# Obsidian Search

Search through Obsidian notes in `/data/obsidian` directory and provide summaries with links to matching files.

## When to Use

Trigger this skill when user asks to:
- Find notes about specific topics
- Search for tags, links, or keywords
- Locate information in their knowledge base
- Look up past notes or documentation
- Retrieve notes from specific folders

## How to Search

Use the bash command in `/data/obsidian` directory


### Search Strategy

1. **Start broad**: Use general terms to find relevant notes
2. **Narrow down**: Use specific tags, project names, or technical terms
3. **Follow links**: Check [[internal links]] in results to find related notes
4. **Filter by folder**: Use `--folders` to search specific sections


## Presenting Results to User

Format responses as summaries:

1. State how many notes were found
2. For each note, provide:
   - Brief summary of relevant content
   - File paths 
3. If many results, group by folder or theme
4. Suggest follow-up searches if results are too broad

Example response format:
```
Found 3 notes about Lambda functions:

1. **AWS Lambda Best Practices** (6 - Full Notes)
   - Covers error handling, timeout configuration, and memory optimization
   - Path: /data/obsidian/6 - Full Notes/AWS Lambda Best Practices.md

2. **Project X - Lambda Setup** (1 - Rough notes)
   - Quick notes on Lambda deployment for Project X
   - Path: /data/obsidian/1 - Rough notes/Project X - Lambda Setup.md
```
