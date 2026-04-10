# CLAUDE.md

## Agent Policy

All tasks that can be delegated to subagents (implementation, research, code exploration, testing, review, etc.) MUST be executed by a subagent using the `sonnet` model. Always set `model: "sonnet"` when spawning agents via the Agent tool.
