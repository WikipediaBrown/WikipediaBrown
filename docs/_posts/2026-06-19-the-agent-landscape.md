---
layout: post
title: The Agent Landscape
summary: A follow-up to the four-part frame — how the parts compose into single agents and into systems of agents, and why the most useful way to judge a non-deterministic agent is the path of tool calls it took, not the output it produced.
image: /img/posts/the-agent-landscape.png?v=1
image_alt: "The Agent Landscape — context vs environment, multi-agent systems, and the path over the output."
---

Earlier I wrote that an agent is four parts: a driver, a tool set, an environment, and context management ([What an AI Agent Actually Is](/blog/what-an-ai-agent-actually-is/)). That post was about naming the parts. This one is about what you do with them — how they compose into one agent, how several agents compose into a system, and how you'd actually tell whether any of it is doing its job.

## Context is not the environment

The one place that frame gets muddy is the word "context," because it sounds like the environment. They aren't the same thing, and it's worth pulling them apart.

The environment is where the compute runs: your laptop, a VM in a data center, a phone, a GPU you're renting by the hour from a box that was mining crypto last month. The context is the context window — the tokens going into the model and the tokens coming back. Context management is the work in between: deciding what goes in (your prompt, the system prompt, earlier tool results, whatever you've kept as memory) and interpreting what comes out (which tokens are tool calls, which get handed back to you).

Every agent tool does this for you on every turn. When you type into Claude Code, it assembles a context — your input, plus a system prompt, plus some files it keeps around — sends it to the model, and reads the result back to work out which tokens were requests to use a tool. OpenCode does the same thing a different way. "Memory" is part of this, not separate from it: a pile of markdown files the tool reads back in each turn is context management wearing a friendlier name. There's nothing magic under there.

## What builders actually optimize

Nobody is building the perfect agent. There isn't one, and there won't be. The best agent is the one that wins today, on the problem in front of you — and tomorrow it might be a different one. What a builder actually optimizes is the output: a better model plus a better tool set producing a better result than the setup before it. That's the only thing a customer ever cares about.

This is also why "best" keeps moving. Models will keep getting better and more varied; there will be many of them, good at different things, and no single correct one. The same goes for tool sets: many of them, each suited to some use case, and increasingly you'll have a model build them for you rather than write them by hand. I built one by hand once. It was a waste of time. This isn't cryptography, where there's a right primitive and a list of things you must never use — it's a space where the right tool for your use case is something you generate and replace when a better one shows up.

## Tools, skills, and the MCP-versus-CLI argument

The words around tools get muddled, so: a tool is the bridge from tokens to actions. Usually that's an MCP server; it can also be a CLI, an API, or a local function. A skill — a markdown file of instructions you staple to the front or back of a prompt — is not a tool; it's context injection. Memory is context management. Keeping these straight matters, because people argue about them as if they're the same fight.

There's a recurring argument that MCP is dead and the CLI won. It's mostly noise. A model can drive a lot of different tool sets; for a narrow one you might fine-tune it to be fluent, but hand it nothing but a raw shell and it'll still produce usable commands some fraction of the time — and you can wrap a harness around that fraction. The shape is the same either way: tokens come out, something interprets them as actions. What actually matters is that your tool set is yours. You don't want a generic one. The specific tools are the business — the thing you have that nobody else does. A few companies open-source theirs; OpenCode is one.

## Getting agents to work together

The question people actually want answered is how to make several agents work together. One common shape is doer / watcher / overseer: one agent does the work, one checks it, one decides. It's a fine pattern. It's also non-deterministic, like everything else here.

The other axis is how they share state. You can give them a shared workspace — a file system they all read and write, which is just their memory held in common — and let them work the same problem in their own ways, all updating the same place. Or you can isolate them: each agent on a copy of the data, in its own container, its own Kubernetes pod, even its own AWS Nitro Enclave where you genuinely can't see in, all running the same task, with the outputs compared at the end.

Agent-to-agent communication has its own protocol fight — Google's A2A against Anthropic's MCP — but mechanically there's nothing new in it. An agent reaches another agent the same way it uses any tool: tokens interpreted as a call. Another agent is just a tool with its own driver behind it.

## Judge the path, not the output

Here's the part I think is underused.

These are non-deterministic systems. Run the same agent on the same task a hundred times and you get a hundred slightly different outputs. Comparing those outputs means comparing noise, so people reach for ways to pin the system down — retrieval, scaffolding, "ours is more reliable than theirs." But the systems are non-deterministic, and that's fine. The mistake is judging them by the artifact at the end.

An agent can only change the world through a tool call, and its state only moves when it makes one. So you can record something more stable than the output: the sequence of tool calls it made, and the state of the workspace at each one, tracked separately for every sub-agent. Because every state change is a tool call and every tool call is observable, that sequence is a complete snapshot of what the agent did, step by step.

Say you ask an agent to write a newspaper article and run it a hundred times. Maybe seventy times it reads the workspace and then writes. Twenty-nine times it writes first and reads afterward to check for anything it missed. Once it asks a question and never finishes the run. You aren't measuring the article — the article varies every time. You're measuring how it works: the course of action it took, given that tool set, in that environment, under that context. That holds still even when the output doesn't, and it's the honest answer to "what did this thing actually do, and why," without pretending it was deterministic.

## References

- A2A Project. n.d. "Agent2Agent (A2A) Protocol." Linux Foundation. Accessed June 19, 2026. <https://a2a-protocol.org/>.
- Amazon Web Services. n.d. "What Is Nitro Enclaves?" AWS Documentation. Accessed June 19, 2026. <https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave.html>.
- Anthropic. n.d. "Claude Code." Anthropic. Accessed June 19, 2026. <https://www.anthropic.com/claude-code>.
- Model Context Protocol. n.d. "What Is the Model Context Protocol (MCP)?" Accessed June 19, 2026. <https://modelcontextprotocol.io/>.
- OpenCode. n.d. "OpenCode." Accessed June 19, 2026. <https://opencode.ai/>.
{:.refs}
