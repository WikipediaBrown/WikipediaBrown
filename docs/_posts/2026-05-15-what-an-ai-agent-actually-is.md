---
layout: post
title: What an AI Agent Actually Is
summary: Strip away the marketing and an agent is four parts — a driver, tools, an environment, and context management. Name the broken part and the fix is usually obvious.
---

The word "agent" has gotten away from us. It now stretches from a single prompt-plus-tool-call demo all the way to fully autonomous systems running unattended for hours. That's a wide enough range to be useless as a definition, so when I talk about agents with other engineers I find it more productive to break the thing into its actual moving parts.

Strip away the marketing and an AI agent is four things glued together: a **driver**, a set of **tools**, an **environment**, and **context management**. Once you see it that way, the architecture of any given agent — from a Claude Code session to a cron-driven scraper to a phone-based assistant — becomes a lot easier to reason about.

## The driver

The driver is what generates content and decides what to do next. In 2026 this is almost always an LLM, but it doesn't have to be — vision-language models, multimodal models, and even non-language models can play this role for the right task. Anthropic's definition of an agentic system draws a useful line here: a *workflow* orchestrates LLMs and tools through predefined code paths, while an *agent* is a system where LLMs "dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks" ([Anthropic 2024](https://www.anthropic.com/engineering/building-effective-agents)).

That dynamic control is the whole point. The driver isn't just a content generator — it's the thing choosing which tool to call, how to interpret the result, and when to stop. Everything else in the system exists to give the driver useful options and a faithful view of the world.

## The tools

Tools are how the driver acts on anything outside its own token stream. They come in a few flavors:

- **MCP servers** — the open protocol Anthropic introduced in November 2024 for connecting LLM applications to external data and capabilities ([Model Context Protocol n.d.](https://modelcontextprotocol.io/)). MCP has since been adopted by OpenAI, Google DeepMind, and most of the major coding-agent vendors, and there are now thousands of community-built servers. The model talks to a standard interface; the server handles the actual integration with Slack, Postgres, GitHub, or whatever else.
- **External APIs** — any HTTP endpoint the agent can hit directly, with or without an MCP wrapper.
- **Custom tool sets** — local functions, shell commands, file operations. Coding agents in particular live and die by this category.
- **A2A communication** — agents talking to other agents, whether through an open protocol like Agent2Agent, introduced by Google in April 2025 and now governed by the Linux Foundation ([A2A Project n.d.](https://a2a-protocol.org/)), or just a parent agent delegating to sub-agents. From the driver's perspective, another agent is just a tool with its own driver behind it.

Coding assistants like Claude Code ([Anthropic n.d.](https://www.anthropic.com/claude-code)) and OpenCode ([OpenCode n.d.](https://opencode.ai/)) are useful examples because they bundle two of the four parts — the tools and the context management — and leave the driver to you. Out of the box they ship a curated tool set (file reads and edits, shell execution, search) and let you plug in additional MCP servers on top ([Model Context Protocol n.d.](https://modelcontextprotocol.io/)), while they own the context that gets fed to the driver on every step. OpenCode in particular makes a point of being provider-agnostic — you can drive it with Claude, GPT, Gemini, or local models — which is a nice illustration of how cleanly the driver pops out from the parts around it.

The interesting design question with tools isn't "what should the agent be able to do" but "what should the agent see." Tool descriptions live in the context window and cost real tokens; Anthropic's piece on code-execution-based MCP makes the point concrete: presenting MCP servers as code APIs — so the agent loads tool definitions on demand and intermediate results stay in the execution environment instead of passing through the context window — cut one worked example from 150,000 tokens to about 2,000, a 98.7% reduction ([Anthropic 2025](https://www.anthropic.com/engineering/code-execution-with-mcp)). The shape of your tool surface is a first-class design concern, not an afterthought.

## The environment

An agent runs *somewhere*. That somewhere matters more than people give it credit for, because it determines what the agent can touch, what it costs to run, and what happens when something goes wrong.

A few common shapes:

- **Locally**, on a developer's machine — the default for coding agents. Cheap, fast, easy to debug, but tied to that one machine.
- **In a Kubernetes cluster or on a VM** — the default for backend agents that need to run on a schedule, persist state, or serve multiple users.
- **In a sandbox** — short-lived containerized environments for untrusted code execution. Increasingly the default for "let the agent run arbitrary commands" workflows.
- **On a phone or in a browser** — the emerging frontier, with all the constraints that implies (intermittent connectivity, battery, narrow tool access).

The environment shapes the failure modes. A local coding agent that gets confused can be killed with Ctrl-C. A scheduled agent running unattended in a VM needs real guardrails, retry logic, and observability, because nobody is watching the terminal when it goes off the rails. Anthropic's building-effective-agents post argues for exactly this — pausing for human feedback at checkpoints or when an agent hits a blocker, with guardrails and sandboxed testing before you hand it autonomy ([Anthropic 2024](https://www.anthropic.com/engineering/building-effective-agents)) — and the right checkpoint design depends entirely on where the agent lives.

## Context management

People like to call this part "the loop," but a loop is just iteration, and we've been writing loops forever. The iteration isn't the interesting part. What actually makes an agent run is **context injection**: deciding what gets put in front of the driver, when, and what gets to stay there. The first injection is the trigger, and it's usually one of:

- **A prompt**: a user (or another agent) injects a prompt, the driver acts until the task is done, then the agent waits for the next one. This is the shape of every interactive coding agent.
- **An event**: something happens in the world — a webhook fires, a file changes, a metric crosses a threshold — and the payload gets injected into a fresh context for the agent to handle. This is the shape of most production automation.
- **A scheduler**: cron or its equivalent fires every N minutes and injects a standing instruction. This is the shape of monitoring and maintenance agents.

After that first injection, every step is more of the same. The ReAct pattern ([Yao et al. 2022](https://arxiv.org/abs/2210.03629)) is really a context-management discipline: the driver emits what the paper calls a "thought" and an action (a tool call), the tool runs, and the observation gets injected back into context for the next step. It continues until the driver stops calling tools — or until something external stops it.

That's the entire pattern. Everything else — multi-agent orchestration, planning, evaluator/optimizer setups, the whole menagerie of patterns Anthropic catalogs in their agents post ([Anthropic 2024](https://www.anthropic.com/engineering/building-effective-agents)) — is a variation on what gets injected into whose context, and when. Compaction, sub-agents with their own windows, loading tool definitions on demand (that 98.7% reduction from the tools section) — it's all context management, and it's where most of the real engineering in a production agent goes.

## Why the decomposition matters

It earns its keep when something breaks. Each symptom points at a different piece:

- **Bad outputs?** That's usually the driver. Different model, different prompt, different reasoning strategy.
- **Can't get the work done?** That's usually the tools. Wrong tool surface, missing capability, descriptions that don't tell the model what it needs.
- **Flaky, slow, or expensive?** That's usually the environment. Wrong place to run this thing, or the wrong observability story.
- **Goes off the rails?** That's usually context management. No stopping condition, no checkpoints, no guardrails, context accumulating until the driver forgets what it was doing.

Most "the agent is broken" complaints I hear from other engineers are really complaints about one of these four pieces, dressed up as a complaint about agents in general. Once you can name which piece, the fix tends to be obvious.

Agents aren't magic, and they aren't a single thing. They're a driver, a set of tools, an environment, and a context being managed well. Build each one deliberately and the system mostly takes care of itself.

## References

- A2A Project. n.d. "Agent2Agent (A2A) Protocol." Linux Foundation. Accessed June 13, 2026. <https://a2a-protocol.org/>.
- Anthropic. n.d. "Claude Code." Anthropic. Accessed May 15, 2026. <https://www.anthropic.com/claude-code>.
- Anthropic. 2024. "Building Effective Agents." Anthropic. <https://www.anthropic.com/engineering/building-effective-agents>.
- Anthropic. 2025. "Code Execution with MCP: Building More Efficient AI Agents." Anthropic. <https://www.anthropic.com/engineering/code-execution-with-mcp>.
- Model Context Protocol. n.d. "What Is the Model Context Protocol (MCP)?" Accessed May 15, 2026. <https://modelcontextprotocol.io/>.
- OpenCode. n.d. "OpenCode." Accessed May 15, 2026. <https://opencode.ai/>.
- Yao, Shunyu, Jeffrey Zhao, Dian Yu, Nan Du, Izhak Shafran, Karthik Narasimhan, and Yuan Cao. 2022. "ReAct: Synergizing Reasoning and Acting in Language Models." arXiv. <https://arxiv.org/abs/2210.03629>.
{:.refs}
