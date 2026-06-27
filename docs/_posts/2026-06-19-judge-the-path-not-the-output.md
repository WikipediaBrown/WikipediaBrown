---
layout: post
title: Judge the Path, Not the Output
date: 2026-06-19 14:00:00 -0000
summary: 'An agent is a non-deterministic system, so grading it by the artifact at the end means comparing noise. Track the path instead — the sequence of tool calls it made, and the state of the workspace at each one.'
dek: 'An agent is a non-deterministic system, so grading it by the artifact at the end means comparing noise. Track the path instead: the sequence of tool calls it made, and the state of the workspace at each one.'
image: /img/posts/judge-the-path-not-the-output.png?v=1
image_alt: "Judge the Path, Not the Output — measuring an agent by its sequence of tool calls, not the artifact at the end."
---

An agent is a non-deterministic system. Run the same one on the same task a hundred times and you get a hundred slightly different results — that isn't a defect to engineer away, it's what these systems are. So the usual instinct — judge the agent by its output — is the wrong one. The output is noisy by construction, and comparing noisy outputs means comparing noise.

It shows up the moment you try to run several agents and pick a winner. One way to do that is to hand each agent its own copy of the data and run them in isolation — their own containers, their own Kubernetes pods, even their own AWS Nitro Enclaves, where you genuinely can't see in — and then compare the outputs at the end. It's a reasonable setup. But the outputs are non-deterministic, so whatever you measure has randomness baked into it. People reach for ways to pin that down — retrieval, scaffolding, "ours is more reliable than theirs" — but the system is non-deterministic, and that's fine. The mistake is grading the artifact at the end.

So track something else. What if, instead of the output, you tracked the way the agent got to it?

An agent can only act on the world through its tools. The driver produces tokens, some of those tokens are interpreted as tool calls, and the tools run in the environment — that is the only way anything outside the model's own output ever changes. Its state can only move on a tool call. So you can record something far more stable than the output: the sequence of tool calls it made, and the state of the workspace at each one, tracked separately for every sub-agent it spins up. Every state change is a tool call, and every tool call is observable, so that sequence is a complete snapshot of what the agent did, step by step.

Say you ask an agent to write a newspaper article and run it a hundred times. Maybe seventy times it reads the workspace and then starts writing. Twenty-nine times it writes first and reads afterward to check whether it missed anything, then finishes. Once it hits a question it can't answer and crashes without completing the run. You aren't measuring the article — the article varies every time. You're measuring how it works: the course of action it took, given that tool set, in that environment, under that context.

That's the thing worth comparing. Not any single output of a non-deterministic model, but the meta output: the path the model took with the tools it had, in the environment it ran in, given the context it was handed. It's a robust, honest way to say what an agent is doing, has done, and why — because at every juncture you have a snapshot of its entire internal state, and every snapshot lands on a tool call, since a tool call is the only thing that can change that state.

## References

- Brown, Wikipedia. 2026. "What an AI Agent Actually Is." Wikipedia Brown. <https://wikipediabrown.dev/blog/what-an-ai-agent-actually-is/>.
- Brown, Wikipedia. 2026. "The Agent Landscape." Wikipedia Brown. <https://wikipediabrown.dev/blog/the-agent-landscape/>.
{:.refs}
