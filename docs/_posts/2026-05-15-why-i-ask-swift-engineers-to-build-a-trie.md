---
layout: post
title: Why I Ask Swift Engineers to Build a Trie
summary: A trie is a Swift question dressed up as a data-structure question — value semantics, copy-on-write, and the real cost of the code you write.
---

In technical interviews, I often ask candidates to implement a trie in Swift. It sounds almost quaint — a data structure most engineers haven't touched since college — but it's become one of my favorite questions, and I want to explain why.

The short version: a trie is a *Swift question* dressed up as a data structure question. It surfaces how a candidate thinks about value semantics, copy-on-write, and the actual cost of the code they write. And unlike a lot of interview chestnuts, it scales naturally — there's a clean baseline implementation, and then a long ladder of optimizations that lets us have a real engineering conversation rather than a trivia quiz.

## Why a trie, specifically

A trie (pronounced "try", from re*trie*val) is a tree where each node represents a character, and paths from the root spell out keys. Insert `"cat"`, `"car"`, and `"cars"`, and you get something like:

```
       root
        |
        c
        |
        a
       / \
      t*  r*
          |
          s*
```

(Asterisks mark nodes that terminate a real word.)

It's a tree of nodes, but the nodes share structure aggressively. That's the whole game — and it's exactly where Swift's value semantics start to matter.

## Level 1: The naive implementation

Here's where most candidates start, and it's a perfectly reasonable place to begin:

```swift
final class TrieNode {
    var children: [Character: TrieNode] = [:]
    var isTerminal: Bool = false
}

final class Trie {
    private let root = TrieNode()

    func insert(_ word: String) {
        var node = root
        for char in word {
            if let next = node.children[char] {
                node = next
            } else {
                let next = TrieNode()
                node.children[char] = next
                node = next
            }
        }
        node.isTerminal = true
    }

    func contains(_ word: String) -> Bool {
        var node = root
        for char in word {
            guard let next = node.children[char] else { return false }
            node = next
        }
        return node.isTerminal
    }

    func hasPrefix(_ prefix: String) -> Bool {
        var node = root
        for char in prefix {
            guard let next = node.children[char] else { return false }
            node = next
        }
        return true
    }
}
```

This works. It's correct. And it's the moment I start asking questions.

**Complexity, as written:**

- `insert(_:)` — `O(k)` time where `k` is word length, `O(k)` space worst case
- `contains(_:)` — `O(k)` time, `O(1)` extra space
- `hasPrefix(_:)` — `O(k)` time, `O(1)` extra space

That's the easy part. Now: *why a class?* Most candidates reach for `class` reflexively because "trees have references." Fine — but Swift has a strong cultural preference for value types, and the obvious follow-up is whether this could be a `struct`. That's where it gets interesting.

## Level 2: Value semantics with a struct

If we make `TrieNode` a struct, copying a trie copies the whole tree — which sounds catastrophic for performance until you remember that Swift's standard library collections (`Array`, `Dictionary`, `Set`) do exactly this, cheaply, via copy-on-write. The copy is `O(1)` until you mutate, and then only the path you touch gets copied.

A first cut:

```swift
struct TrieNode {
    var children: [Character: TrieNode] = [:]
    var isTerminal: Bool = false
}

struct Trie {
    private var root = TrieNode()

    mutating func insert(_ word: String) {
        Self.insert(word[...], into: &root)
    }

    private static func insert(_ remaining: Substring, into node: inout TrieNode) {
        guard let first = remaining.first else {
            node.isTerminal = true
            return
        }
        // Subscript-with-default gives us in-place mutation through the dictionary,
        // which preserves COW semantics for the child subtree.
        insert(remaining.dropFirst(), into: &node.children[first, default: TrieNode()])
    }

    func contains(_ word: String) -> Bool {
        var node = root
        for char in word {
            guard let next = node.children[char] else { return false }
            node = next
        }
        return node.isTerminal
    }
}
```

This is where a good candidate gets animated. A few things to notice:

1. **`subscript(_:default:)` with `inout` recursion.** This is the idiomatic way to mutate a nested value type in Swift without paying for a copy at every level. If a candidate doesn't know this trick, walking them to it is a good conversation. If they reach for it unprompted, that tells me something.
2. **The struct copy is cheap.** Passing a `Trie` by value, returning it from a function, storing it in a property — all `O(1)` until someone mutates. That's a real ergonomic win for callers, and it makes the type thread-safe by default (no shared mutable state).
3. **`isTerminal` belongs on the node, not in a separate set.** Some candidates try to track terminal words in a side `Set<String>`, which defeats the whole point of the structure.

But there's still a problem hiding here, and it's the one I really want to talk about.

## Level 3: The space problem

`[Character: TrieNode]` is convenient, but it's *expensive*. A Swift `Dictionary` has meaningful per-entry overhead: hash table buckets, load factor slack, and the `Character` type itself is a grapheme cluster that can be much larger than a single byte. For a trie storing English words, that's a lot of bytes per node for what could be a single index.

If we know our alphabet is constrained — say, lowercase ASCII letters — we can do dramatically better with a fixed-size array:

```swift
struct CompactTrieNode {
    // 26 slots for 'a'...'z'. nil means no child.
    var children: [CompactTrieNode?] = Array(repeating: nil, count: 26)
    var isTerminal: Bool = false

    static func index(of char: Character) -> Int? {
        guard let ascii = char.asciiValue,
              ascii >= 0x61, ascii <= 0x7A else { return nil }
        return Int(ascii - 0x61)
    }
}
```

Now lookups are an array index instead of a hash, and the per-node footprint is predictable. But we've made a trade: every node carries 26 optional slots whether or not it uses them. For a dense trie (a dictionary of English words), that's a win. For a sparse one (a handful of long keys), it's wasteful.

This is the conversation I actually want to have. *When does each representation win?* What's the workload? Are we read-heavy or write-heavy? Is memory or latency the constraint? A candidate who can reason about this — even roughly, even with hand-waved numbers — is showing me the thing I'm hiring for.

## Level 4: Compressing the structure itself

Once we've talked about per-node cost, the next move is to attack node *count*. A trie storing `"interview"`, `"interviewer"`, and `"interviewing"` has a long chain of single-child nodes from the root down to `"interview"` — nine nodes that exist only to spell out a prefix nobody branches off of. That's the insight behind a **radix tree** (or compressed trie): collapse runs of single-child nodes into a single edge labeled with a string instead of a character.

```swift
struct RadixNode {
    var children: [Character: Edge] = [:]
    var isTerminal: Bool = false
}

struct Edge {
    var label: String       // The full string along this edge
    var target: RadixNode
}
```

Insertion gets harder — you now have to split edges when a new word diverges partway through a label — but lookups stay `O(k)` in the *query* length, and the total number of nodes drops dramatically for realistic dictionaries. This is where the question stops being about Swift and starts being about engineering judgment: is the implementation complexity worth the memory win for *your* workload?

I don't expect candidates to implement a radix tree end-to-end in 45 minutes. I do want them to be able to sketch the idea, identify where the tricky cases live (edge splits, prefix mismatches), and tell me when they'd reach for it.

## What I'm actually looking for

The trie question is a vehicle for a few things I care about:

- **Does the candidate default to `class` or `struct`, and can they defend the choice?** Swift's value semantics are the language's most distinctive feature, and a working engineer should have opinions about when to use them.
- **Do they understand copy-on-write deeply enough to trust it?** A lot of Swift performance work is just *not fighting the runtime*. Mutating through `subscript(_:default:)` with `inout` is a small thing, but it's the kind of small thing that compounds.
- **Can they reason about complexity beyond Big O?** `O(k)` is `O(k)`, but the constant factor between a `[Character: Node]` dictionary and a `[Node?]` array is enormous, and it shows up in real profiles. I want candidates who can hold both abstractions in their head at once.
- **Can they have an engineering conversation?** The interesting part of this question isn't the first implementation — it's the second, third, and fourth, and the trade-offs between them.

There are flashier interview questions. There are harder ones. But for Swift specifically, I haven't found a better one for the breadth of signal it gives in the time available. If you're prepping for Swift interviews, build a trie. Build it as a class first. Then build it as a struct. Then make it small. You'll learn more about the language than from any single book chapter I know of.
