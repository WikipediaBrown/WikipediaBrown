---
layout: post
title: The Agent Landscape
date: 2026-06-19 12:00:00 -0000
summary: 'A follow-up to "What an AI Agent Actually Is" — how the parts compose into a single agent, how several agents compose into a system, and why your tool set is the part that''s actually yours.'
dek: 'A follow-up to ["What an AI Agent Actually Is"](/blog/what-an-ai-agent-actually-is/) — how the parts compose into a single agent, how several agents compose into a system, and why your tool set is the part that''s actually yours.'
image: /img/posts/the-agent-landscape.png?v=2
image_alt: "The Agent Landscape — no perfect agent, tools and skills, and getting agents to work together."
---

An agent isn't a magic thing you set down somewhere that gets up and goes off to do something on its own. It's five parts wired together: a driver — an LLM producing tokens — a parser that reads those tokens and separates the tool calls from the text, a tool set that runs those calls, an environment the whole thing runs in, and the context you inject to make it act at all. I described those five parts, and how they work together, in [What an AI Agent Actually Is](/blog/what-an-ai-agent-actually-is/). Once you stop treating an agent as a single magic box and see it as the five parts it's made of, the useful questions are all about how you compose them — into one agent that does the job, and into several agents working together.

## There is no perfect agent

There is no perfect agent, and there never will be. An agent succeeds when it accomplishes the task it's assigned — whether you assigned it or another agent did — and the setup that does that today might be a different one tomorrow. What matters is whether the agent gets the job done at a cost that makes sense, and how reliably it does it — run the same task over and over, and reliability is just the ratio of successes to failures. A better model or a better tool set counts only insofar as it lifts that ratio, or gets the job done more cheaply. That's all anyone cares about — whether the work got done.

It also means no setup stays the right one for long. Models will keep getting better and more varied; there will be many of them, good at different things, and no single correct one. The same goes for tool sets: many of them, each suited to some use case, and increasingly you'll have a model build them for you rather than write them by hand. I built one by hand once. It was a waste of time. This isn't cryptography, where there's a right primitive and a list of things you must never use — it's a space where the right tool for your use case is something you generate and replace when a better one shows up.

## Tools, skills, and the MCP-versus-CLI argument

The words around tools get muddled, so: a tool is the bridge from tokens to actions — an MCP server, a CLI, an API, or a local function. A skill — instructions in a markdown file, sometimes with scripts attached — is context injection: the instructions get loaded into the prompt, and any scripts it ships are just tools by another name. Memory is context management. Keeping these straight matters, because people argue about them as if they're the same fight.

There's a recurring argument that MCP is dead and the CLI won. It's mostly noise. A model can drive a lot of different tool sets; for a narrow one you might fine-tune it to be fluent, but hand it nothing but a raw shell and it'll still produce usable commands some fraction of the time — and you can wrap a harness around that fraction. The shape is the same either way: tokens come out, something interprets them as actions. What actually matters is that your tool set is yours. You don't want a generic one. The specific tools are the business — the thing you have that nobody else does. A few companies open-source theirs; OpenCode is one.

## Getting agents to work together

The question people actually want answered is how to make several agents work together. One common shape is doer / watcher / overseer: one agent does the work, one checks it, one signs off. It's a fine pattern. It's also non-deterministic, like everything else here.

The other axis is how they share state. You can give them a shared workspace — a file system they all read and write, which is just their memory held in common — and let them work the same problem in their own ways, all updating the same place. Or you can isolate them: each agent on a copy of the data, in its own container, its own Kubernetes pod, even its own AWS Nitro Enclave where you genuinely can't see in, all running the same task, with the outputs compared at the end.

Agent-to-agent communication has its own protocol — Google's A2A, the complement to Anthropic's MCP: MCP standardizes how an agent reaches a tool, A2A how an agent reaches another agent. Mechanically, though, there's nothing new in it. An agent reaches another agent the same way it uses any tool: tokens interpreted as a call. Another agent is just a tool with its own driver behind it.

## References

- A2A Project. n.d. "Agent2Agent (A2A) Protocol." Linux Foundation. Accessed June 19, 2026. <https://a2a-protocol.org/>.
- Amazon Web Services. n.d. "What Is Nitro Enclaves?" AWS Documentation. Accessed June 19, 2026. <https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave.html>.
- Brown, Wikipedia. 2026. "What an AI Agent Actually Is." Wikipedia Brown. <https://wikipediabrown.dev/blog/what-an-ai-agent-actually-is/>.
- Model Context Protocol. n.d. "What Is the Model Context Protocol (MCP)?" Accessed June 19, 2026. <https://modelcontextprotocol.io/>.
- OpenCode. n.d. "OpenCode." Accessed June 19, 2026. <https://opencode.ai/>.
{:.refs}
