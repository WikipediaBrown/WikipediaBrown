---
layout: post
title: Judge the Path, Not the Output
date: 2026-06-19 14:00:00 -0000
summary: 'Agents are non-deterministic, so grading the artifact at the end means comparing noise. The thing that holds still is the path — the sequence of tool calls it made, and the state of the workspace at each one.'
dek: 'A follow-up to ["The Agent Landscape"](/blog/the-agent-landscape/) — agents are non-deterministic, so grading the artifact at the end means comparing noise. The thing that holds still is the path: the sequence of tool calls it made, and the state of the workspace at each one.'
image: /img/posts/judge-the-path-not-the-output.png?v=1
image_alt: "Judge the Path, Not the Output — measuring an agent by its sequence of tool calls, not the artifact at the end."
---

The earlier posts were about what an agent is — a [driver, a tool set, an environment, and context management](/blog/what-an-ai-agent-actually-is/) — and [how those parts compose into systems](/blog/the-agent-landscape/). This one is about the question that comes after you've built the thing: how do you tell whether it's any good? The reflex is to grade the output — did it write a good article, did it close the ticket, did it pass the eval. That's the wrong place to look, and the reason is that agents aren't deterministic.

Run the same agent on the same task a hundred times and you get a hundred slightly different outputs. Comparing those outputs means comparing noise, so people reach for ways to pin the system down — retrieval, scaffolding, "ours is more reliable than theirs." But the systems are non-deterministic, and that's fine. The mistake is judging them by the artifact at the end.

An agent can only change the world through a tool call, and its state only moves when it makes one. So you can record something more stable than the output: the sequence of tool calls it made, and the state of the workspace at each one, tracked separately for every sub-agent. Because every state change is a tool call and every tool call is observable, that sequence is a complete snapshot of what the agent did, step by step.

Say you ask an agent to write a newspaper article and run it a hundred times. Maybe seventy times it reads the workspace and then writes. Twenty-nine times it writes first and reads afterward to check for anything it missed. Once it asks a question and never finishes the run. You aren't measuring the article — the article varies every time. You're measuring how it works: the course of action it took, given that tool set, in that environment, under that context. That holds still even when the output doesn't, and it's the honest answer to "what did this thing actually do, and why," without pretending it was deterministic.

None of this makes the output unimportant. You still ship the article, and it still has to be good. But the output is one sample from a distribution, and you can't learn much about a system by staring at a single sample. The path is the system. Watch the path and you can see what the agent does, where it goes wrong, and whether a change you made actually changed anything — none of which the artifact at the end will tell you.

## References

- Brown, Wikipedia. 2026. "What an AI Agent Actually Is." Wikipedia Brown. <https://wikipediabrown.dev/blog/what-an-ai-agent-actually-is/>.
- Brown, Wikipedia. 2026. "The Agent Landscape." Wikipedia Brown. <https://wikipediabrown.dev/blog/the-agent-landscape/>.
{:.refs}
