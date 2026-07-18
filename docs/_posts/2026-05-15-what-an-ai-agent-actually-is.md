---
layout: post
title: What an AI Agent Actually Is
date: 2026-06-19 11:00:00 -0000
summary: Strip away the marketing and an agent is five parts — a driver, a parser, tools, an environment, and context management. The agent is the way they come together.
image: /img/posts/what-an-ai-agent-actually-is.png?v=3
image_alt: "What an AI Agent Actually Is — a driver, a parser, tools, an environment, and context management."
---

The word "agent" has gotten away from us. It now stretches from a single prompt-plus-tool-call demo all the way to fully autonomous systems running unattended for hours. That's a wide enough range to be useless as a definition, so when I talk about agents with other engineers I find it more productive to talk about the parts it's actually made of.

Strip away the marketing and an AI agent is five things glued together: a **driver**, a **parser**, a set of **tools**, an **environment**, and **context management**. Once you see it that way, the architecture of any given agent — from a Claude Code session to a cron-driven scraper to a phone-based assistant — becomes a lot easier to reason about.

## The driver

The driver is what produces the tokens. In 2026 it's almost always an LLM, but it doesn't have to be — vision-language models, multimodal models, and even non-language models can sit in this seat for the right task. Whatever sits there, the job is narrow and it never changes: a context goes in, tokens come out. The driver doesn't reach for a tool, read a result, or pick a next step. It produces tokens. Everything that looks like a decision happens in the parts that read those tokens.

This is what the workflow-versus-agent distinction is actually about. Anthropic draws the line between a *workflow* — LLMs and tools wired together through predefined code paths — and an *agent*, where the path isn't fixed ahead of time ([Anthropic 2024](https://www.anthropic.com/engineering/building-effective-agents)). In a workflow, a person wrote the control flow in advance. In an agent, what runs next falls out of the tokens the model produces at each step. Those tokens aren't a plan the model carries out; they're just output, and the rest of the system is built to act on them.

## The parser

So the driver's output is just tokens — text in a single stream. Nothing in that stream is a tool call on its own; a tool call is only a particular pattern of tokens, sitting inline with everything else the model wrote.

Something outside the driver has to read that stream and split it in two — this span is text meant for the person, that span is a request to run a tool. It pulls the requests out, turns each one into an actual call (a tool name and its arguments), hands those to the tool set, and passes the rest through as ordinary output. That reader is the parser, and it's a part in its own right — sitting between the driver and the tools. The driver writes, the parser reads that writing and separates the tool requests from the text, and only then do the tools run. Three jobs, three separate pieces.

A model "trained for tool use" is trained to write those requests in a fixed, recognizable shape, every time, so the parser can find them without guessing. That is most of what "supports tool use" means. Not that the model can touch the world — it can't, it only writes — but that it reliably writes its tool requests in a form something else can parse, and, if you go through a hosted API, that the provider ships the parser.

Who supplies the parser is the part that changes from setup to setup. When you go through Anthropic's API, Anthropic supplies both the driver and the parser: the model writes the call inline in its token stream, and their servers pull it out and hand you a clean, separate list of tool calls before you ever see the response ([Anthropic n.d.b](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works)). Run an open model like llama yourself and you get only the driver — the tool call comes back inline, mixed into the text, with nothing behind it to lift it out. You supply the parser yourself, parsing the call out of the stream before you can hand it to the tool set. That missing piece is exactly what people are adding when they put a small proxy in front of a local model.

OpenCode is a good place to watch this. It doesn't scan tokens for tool syntax itself; it hands that job to the Vercel AI SDK, which asks the provider for a structured list of calls and checks each one's arguments against the tool's schema before running it ([Vercel n.d.](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)). When a model doesn't cooperate — the wrong casing on a tool name, arguments that aren't valid JSON, an empty list where a call should be — the run stalls at the parser, not at the driver and not at the tool. That is the tell that it is a real, separate piece: it has its own way of breaking.

## The tools

Tools are what run once the parser routes a call — the only things that touch anything outside the driver's token stream. They come in a few flavors:

- **MCP servers** — the open protocol Anthropic introduced in November 2024 for connecting LLM applications to external data and capabilities ([Model Context Protocol n.d.](https://modelcontextprotocol.io/)). MCP has since been adopted by OpenAI, Google DeepMind, and most of the major coding-agent vendors, and there are now thousands of community-built servers. The model talks to a standard interface; the server handles the actual integration with Slack, Postgres, GitHub, or whatever else.
- **External APIs** — any HTTP endpoint the agent can hit directly, with or without an MCP wrapper.
- **Custom tool sets** — local functions, shell commands, file operations. Coding agents in particular live and die by this category.
- **A2A communication** — agents talking to other agents, whether through an open protocol like Agent2Agent, introduced by Google in April 2025 and now governed by the Linux Foundation ([A2A Project n.d.](https://a2a-protocol.org/)), or just a parent agent delegating to sub-agents. Mechanically, another agent is just a tool with its own driver behind it.

Coding assistants like Claude Code ([Anthropic n.d.a](https://www.anthropic.com/claude-code)) and OpenCode ([OpenCode n.d.](https://opencode.ai/)) are useful examples because they bundle the tools and the context management and leave the driver to you. Out of the box they ship a curated tool set (file reads and edits, shell execution, search) and let you plug in additional MCP servers on top ([Model Context Protocol n.d.](https://modelcontextprotocol.io/)), while they own the context that gets fed to the driver on every step. OpenCode in particular makes a point of being provider-agnostic — you can run it on Claude, GPT, Gemini, or local models — which is a nice illustration of how cleanly the driver pops out from the parts around it.

The interesting design question with tools isn't "what should the agent be able to do" but "what should the agent see." Tool descriptions live in the context window and cost real tokens; Anthropic's piece on code-execution-based MCP makes the point concrete: presenting MCP servers as code APIs — so the agent loads tool definitions on demand and intermediate results stay in the execution environment instead of passing through the context window — cut one worked example from 150,000 tokens to about 2,000, a 98.7% reduction ([Anthropic 2025](https://www.anthropic.com/engineering/code-execution-with-mcp)). The shape of your tool surface is a first-class design concern, not an afterthought.

## The environment

An agent runs *somewhere*. That somewhere matters more than people give it credit for, because it determines what the agent can touch, what it costs to run, and what happens when something goes wrong.

A few common shapes:

- **Locally**, on a developer's machine — the default for coding agents. Cheap, fast, easy to debug, but tied to that one machine.
- **In a Kubernetes cluster or on a VM** — the default for backend agents that need to run on a schedule, persist state, or serve multiple users.
- **In a sandbox** — short-lived containerized environments for untrusted code execution. Increasingly the default for "let the agent run arbitrary commands" workflows.
- **On a phone or in a browser** — the emerging frontier, with all the constraints that implies (intermittent connectivity, battery, narrow tool access).

The environment shapes the failure modes. A local coding agent that goes wrong can be killed with Ctrl-C. A scheduled agent running unattended in a VM needs real guardrails, retry logic, and observability, because nobody is watching the terminal when it goes off the rails. Anthropic's building-effective-agents post argues for exactly this — pausing for human feedback at checkpoints or when an agent hits a blocker, with guardrails and sandboxed testing before you hand it autonomy ([Anthropic 2024](https://www.anthropic.com/engineering/building-effective-agents)) — and the right checkpoint design depends entirely on where the agent lives.

## Context management

People like to call this "the loop," but the loop is the least interesting thing about it. What actually makes an agent run is **context injection**: deciding what gets put in front of the driver, when, and what gets to stay there. The first injection is the trigger, and it's usually one of:

- **A prompt**: a user (or another agent) injects a prompt, the agent runs until the task is done, then it waits for the next one. This is the shape of every interactive coding agent.
- **An event**: something happens in the world — a webhook fires, a file changes, a metric crosses a threshold — and the payload gets injected into a fresh context for the agent to handle. This is the shape of most production automation.
- **A scheduler**: cron or its equivalent fires every N minutes and injects a standing instruction. This is the shape of monitoring and maintenance agents.

After that first injection, every step is more of the same. The ReAct pattern ([Yao et al. 2022](https://arxiv.org/abs/2210.03629)) is really a context-management discipline: the model emits tokens the paper labels a "thought" and an "action," the parser routes the action to a tool, the tool runs, and the observation gets injected back into context for the next step. It continues until the model stops producing tool calls — or until something external stops it.

That's the entire pattern. Everything else — multi-agent orchestration, planning, evaluator/optimizer setups, the whole menagerie of patterns Anthropic catalogs in their agents post ([Anthropic 2024](https://www.anthropic.com/engineering/building-effective-agents)) — is a variation on what gets injected into whose context, and when. Compaction, sub-agents with their own windows, loading tool definitions on demand (that 98.7% reduction from the tools section) — it's all context management, and it's where most of the real engineering in a production agent goes.

## Putting it back together

So that's the five parts. Here's how they fit together. The driver takes a context and produces tokens. The parser reads those tokens, splits the tool calls out from the text, and hands the calls to the tools, which act in the world and write the results back into the context. Then the driver runs again on the updated context.

The driver is the model itself — it produces the tokens, and that's all it does; it can't touch anything outside its own output. The parser is what reads that output and separates the text from the requests to run a tool. The tools are the only part that acts on the world, and only on the spans the parser hands them. And context management is what sets what's in the context each turn — what carries over and what gets dropped.

The environment is the box it all runs in, and that's what lets it set the terms: what the tools can reach, what a turn costs, what happens when one fails and nobody's watching the terminal. Move the same agent from your laptop to a sandbox and those same tool calls suddenly need guardrails — the driver and the tools didn't change, their surroundings did.

And it all has to fit in one context window. Spend tokens describing a tool and that's context the driver no longer has for the work, so none of the parts really works in isolation. A driver producing tokens, a parser reading them for tool calls, tools acting on what it finds, context management choosing what the driver sees next, all inside one environment — that's all an agent is.

## References

- A2A Project. n.d. "Agent2Agent (A2A) Protocol." Linux Foundation. Accessed June 13, 2026. <https://a2a-protocol.org/>.
- Anthropic. n.d.a. "Claude Code." Anthropic. Accessed May 15, 2026. <https://www.anthropic.com/claude-code>.
- Anthropic. n.d.b. "How Tool Use Works." Claude Docs. Accessed July 15, 2026. <https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works>.
- Anthropic. 2024. "Building Effective Agents." Anthropic. <https://www.anthropic.com/engineering/building-effective-agents>.
- Anthropic. 2025. "Code Execution with MCP: Building More Efficient AI Agents." Anthropic. <https://www.anthropic.com/engineering/code-execution-with-mcp>.
- Model Context Protocol. n.d. "What Is the Model Context Protocol (MCP)?" Accessed May 15, 2026. <https://modelcontextprotocol.io/>.
- OpenCode. n.d. "OpenCode." Accessed May 15, 2026. <https://opencode.ai/>.
- Vercel. n.d. "AI SDK: Tools and Tool Calling." Vercel. Accessed July 15, 2026. <https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling>.
- Yao, Shunyu, Jeffrey Zhao, Dian Yu, Nan Du, Izhak Shafran, Karthik Narasimhan, and Yuan Cao. 2022. "ReAct: Synergizing Reasoning and Acting in Language Models." arXiv. <https://arxiv.org/abs/2210.03629>.
{:.refs}
