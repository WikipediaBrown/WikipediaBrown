---
layout: post
title: The Agent Landscape
author: Paris Davis
summary: An agent is a driver, a tool set, an environment, and injected context — nothing more. Get the decomposition right and multi-agent design, evaluation, and the whole landscape stop being mysterious.
---

An agent is four things: a **driver**, a **tool set**, an **environment**, and **injected context**. I've made a version of this argument before ([Davis 2026]({% post_url 2026-05-15-what-an-ai-agent-actually-is %})), but I underdeveloped the piece that matters most, so let me walk the whole landscape again and put the weight where it belongs.

## The driver

The driver is the thing producing the agent's line of thought — or, more precisely, its line of *content that drives action*. For all practical purposes it's an LLM. You could rig up a diffusion model or some other model class to play the role, and it would work badly, but the point stands: the driver is a slot in the architecture, not a synonym for "LLM."

What the driver actually does is produce tokens. Those tokens are what we choose to treat as the agent's train of thought. It's worth being blunt about this: LLMs aren't smart, and they can't be. They're math — non-deterministic token-producing systems. But one model absolutely can be *better at using a given tool set* than another, and that — not intelligence — is the axis agent builders actually compete on: a better driver, with a better tool set, producing a better output. The output is the only thing anyone ever cared about.

## The environment

The agent runs *somewhere*, and by environment I mean exactly that: where the compute is actually happening. Locally on a laptop. On a mobile device. In a data center. On a rack of GPUs originally meant for crypto mining. The environment is where tokens get turned back into consequences — it's what the tool set executes against, so it bounds what the agent can touch.

I was once tempted to call this piece the agent's "context," and I want to explicitly take that back. Everything here happens in some environment, but **context** should mean one thing only: the context window of the LLM you're talking to in the moment. Keeping those two words apart is what makes the fourth component visible at all.

## The tool set

Tools are the bridge between tokens and actual actions. The only way an agent can operate on the world is through its tools: the driver emits tokens, some of those tokens are interpreted as tool calls, and the tools execute in the environment. That interpretation step is the whole trick — which tokens become actions, and which get passed back to you.

When people say tools today they generally mean MCP servers, but the category is wider: CLIs, APIs, any process the harness can invoke. There's been recent conversation along the lines of "MCP is dead, long live the CLI," and you can make those arguments, but they're mostly noise. LLMs can use lots of different tool surfaces. For a sufficiently exotic tool set you might need to train the model into it — LoRA or similar ([Hu et al. 2021](https://arxiv.org/abs/2106.09685)) — and even a model with no native tool use can be harnessed: ask it a hundred times to use the command line and you could build a harness around its responses that executes them. Same decomposition every time: a driver, a tool set, an environment, injected context.

It's worth pausing on what this decomposition does and doesn't claim. A person with agency has thoughts, some way to act on those thoughts, and is alive in the world. An agent rhymes with that — driver, tool set, environment — and the rhyme is exactly where people get confused. One of the strangest beliefs floating around is that these things will one day get up and go do something of their own accord. You have agency, a soul, a calling. An agent has none of that. Nothing in it wants. That's not a limitation to mourn; as we'll see, it's a property you get to design with.

## Context injection

Three components interoperate. But why would they do anything at all? That's the fourth thing, and it's the one I underdeveloped before: **context injection**.

Think about what actually happens when you use Claude Code ([Anthropic n.d.](https://www.anthropic.com/claude-code)). You say something at the command line and the agent does something for you. Underneath, the harness took your input, added a system prompt, added tool definitions, maybe added memory — those markdown files it re-reads and passes in every single time — and sent that assembled token string to the model. Then it took the tokens that came back and decided which ones were tool calls to execute and which ones were a reply to show you. Claude Code does this one way, OpenClaw another ([OpenClaw n.d.](https://openclaw.ai/)), Codex a third. When I say they do it differently, I mean it at the level of: given your sentence, *what exact string, broken down to tokens, is sent to the model* — and on the way back out, which tokens become actions.

That job is **context management**, and it is most of what an agent framework is. The vocabulary around agents collapses into it once you look:

- **Memory** is context management. Whether it's one markdown memory file or a pile of files referenced in different orders for different reasons, memory is just deciding what gets injected next time.
- **Skills** are context injection. They're essentially markdown pre-prompts (or post-prompts) — a way of managing what the model sees ([Anthropic 2025](https://www.anthropic.com/news/skills)).
- **The prompt** is the injected context that starts everything. You've got to say something to it.

So the full picture: the injected context is the prompt, the LLM is what you pass the prompt to, the tool set is what the agent operates, and the environment is where it operates them. Every agent product you've used is a particular opinion about how to wire those four together.

## Putting agents together

The next thought is obvious: how do we get agents operating in concert — competing with each other, or sharing information so the competition gets sharper?

Here's where the no-soul property pays off. With humans, the moment you put a group on a problem you inherit incentive structures, leadership questions, who gets to be on top. Agents need none of that. Nobody here has to eat. Coordinating agents is purely a question of how context is shared and injected — which means you can design the social structure directly:

- **Doer / watcher / overseer.** The common three-part setup: one agent works, one reviews, one directs. Totally valid. Note that none of it is deterministic, whatever a vendor tells you about theirs being better than yours — these are non-deterministic systems, and that's okay. They're still *systems*; they still do things.
- **Shared workspace.** Run agents in isolation but pointed at the same workspace, and the workspace *is* their shared memory — the same files a harness like Claude Code or OpenClaw would use for its own memory, now common property. This is not memory-safe, and that's worth saying plainly. But is memory safety even what you want? Put them all on the same problem over a read-only memory space and you can see how to make the scenario sound.
- **Full isolation.** Give each agent its own copy of the data in isolated containers in a Kubernetes cluster ([Kubernetes n.d.](https://kubernetes.io/)) — or go further with AWS Nitro Enclaves ([Amazon Web Services n.d.](https://aws.amazon.com/ec2/nitro/nitro-enclaves/)), where you can't even see in — and compare the outputs afterward.
- **Agents as each other's tools.** A2A is Google's concept here, as MCP is Anthropic's ([Google 2025](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/); [Model Context Protocol n.d.](https://modelcontextprotocol.io/)). But notice that the way an agent talks to another agent is the exact same way it uses an MCP server, a CLI, an API, or any other process. Agent-to-agent is just another tool surface.

And you can keep composing: maybe they share a memory workspace; maybe they share a context-injection method, so one prompt fans out to ten agents at once; maybe they share an environment but hold separate context windows and workspaces. Picture four or five agents working a cluster of four M3 Ultras with 512 GB of RAM apiece. These are all just arrangements of the same four components.

## Track the path, not the output

Every coordination scheme above ends the same way: you compare outputs. And the outputs, by the nature of the agents producing them, are non-deterministic. If you're going to compare outputs at all, build the expectation of noise in from the start.

But here's the better idea. What if you didn't track the output — not the characters, not the RGB map of the PowerPoint — but *the way the agent got there*?

The only way an agent can operate on the world is through its tools. That's not a slogan; it's a measurement opportunity. The agent's internal state can only ever advance through tool use, so if you record **the sequence of tool calls the agent made, plus a snapshot of the workspace at each call, tracked separately for every sub-agent**, you have a complete, faithful trace of what the agent *did* — a snapshot of its entire externally-visible state at every juncture.

Concretely: tell an agent to write a newspaper article and run that a hundred times. Maybe 70% of the time it reads the workspace first, then writes. Maybe 29% of the time it writes first, then reads to check whether anything else is there, finds nothing, and completes. And maybe 1% of the time it stalls on a question and never finishes the one-shot run (you could probe that tail with multi-shot variants). None of those numbers describe any particular article. They describe a **meta-output** of the non-deterministic system: the course of action the model took, with the tools it had, in the environment it ran in, given the context you injected. That is a robust and valid way to explain what an agent is doing, has done, and why — at every step.

## No perfect model, no perfect tool set

Some things will stay perpetually true about this landscape. Models will keep getting better and more varied — lots of models, lots of applications, no perfect model for every situation. The "best" agent is not a thing you can build once; agents are non-deterministic, and the best one is simply the one with the best solution *right now*.

The same goes for tool sets. There will be lots of them, no perfect one, and everyone claiming theirs is perfect right up until someone ships a better one for the specific use case at hand. This is not like cryptography, where the rule is "use this, never roll your own." Roll your own. Your tool set is your business — your boat, your moat: *we have these tools, they do these things, nobody else has them.* Some companies have open-sourced their tool sets — OpenCode ([OpenCode n.d.](https://opencode.ai/)), OpenClaw — and in OpenClaw's case got bought almost immediately. And the cost of entry has collapsed: I once built a tool set by hand, which was dumb. Have an LLM build it for you. People will build different ones for different use cases, and the good ones will be good for *specific* use cases. That plurality is the landscape, not a temporary condition of it.

## Agents aren't products

Last thing, and it's the one to carry out of here. An agent isn't a product. An agent *does* a thing — it's literally in the name. A standing critique of the AI space, and a fair one, is that people are building things customers pay for that don't do anything. The aim should be agent systems that actually achieve goals, on their own, cheaper than a human being doing the same work.

That's not "replace the people." We need lots of smart people figuring out how to wire these things so the people we already have produce a hundred times the output. Look at the asymmetry: agents have no value — that's *why* you can throw them away, rerun them, fork them a hundred times and keep the best trace. Human beings have value precisely because you can't. A human knows the right thing to do. An LLM is a non-deterministic token producer; a tool set is how you interpret those tokens into action; an environment is where that interpretation operates; and you've still got to say something to it.

That last part is the context injection. Manage it well and the rest is composition.

## References

- Amazon Web Services. n.d. "AWS Nitro Enclaves." Amazon Web Services. Accessed June 10, 2026. <https://aws.amazon.com/ec2/nitro/nitro-enclaves/>.
- Anthropic. n.d. "Claude Code." Anthropic. Accessed June 10, 2026. <https://www.anthropic.com/claude-code>.
- Anthropic. 2025. "Introducing Agent Skills." Anthropic. <https://www.anthropic.com/news/skills>.
- Google. 2025. "Announcing the Agent2Agent Protocol (A2A): A New Era of Agent Interoperability." Google for Developers Blog. <https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/>.
- Hu, Edward J., Yelong Shen, Phillip Wallis, Zeyuan Allen-Zhu, Yuanzhi Li, Shean Wang, Lu Wang, and Weizhu Chen. 2021. "LoRA: Low-Rank Adaptation of Large Language Models." arXiv. <https://arxiv.org/abs/2106.09685>.
- Kubernetes. n.d. "Kubernetes." Accessed June 10, 2026. <https://kubernetes.io/>.
- Model Context Protocol. n.d. "What Is the Model Context Protocol (MCP)?" Accessed June 10, 2026. <https://modelcontextprotocol.io/>.
- OpenClaw. n.d. "OpenClaw." Accessed June 10, 2026. <https://openclaw.ai/>.
- OpenCode. n.d. "OpenCode." Accessed June 10, 2026. <https://opencode.ai/>.
{:.refs}
