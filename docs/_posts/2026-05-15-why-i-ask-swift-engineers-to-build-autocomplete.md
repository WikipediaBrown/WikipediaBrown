---
layout: post
title: Why I Ask Swift Engineers to Build Autocomplete
order: 1
summary: '"Build autocomplete for me" is a Swift question wearing a data-structure costume — value semantics, the small-string trap, and what O(1) space actually means.'
image: /img/posts/why-i-ask-swift-engineers-to-build-autocomplete.png?v=1
image_alt: "Why I Ask Swift Engineers to Build Autocomplete — tries, value semantics, the small-string trap, and O(1) space."
---

In technical interviews, I give Swift candidates one prompt: *build autocomplete for me.* Type `car`, get back `car`, `card`, `cars` — every word in the dictionary that continues the prefix.

It sounds like a data-structure question. It isn't. It's a *Swift* question wearing a data-structure costume. The structure everyone reaches for — a trie — is the easy part. What I'm actually watching is whether the candidate understands what their `String`s cost, what "efficient" means when you have to *produce* the answer, and what `O(1)` space honestly buys you in a language with value semantics. There's a clean baseline and a long ladder of refinements, so we get a real engineering conversation instead of a trivia quiz.

## The shape of the problem

A trie (pronounced "try", from re*trie*val) is a tree where each node is a character and a root-to-node path spells a prefix ([GeeksforGeeks n.d.](https://www.geeksforgeeks.org/trie-insert-and-search/)). Insert `"cat"`, `"car"`, and `"cars"`:

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

Autocomplete is two moves: **descend** to the node where the prefix ends, then **enumerate** every word in the subtree hanging off it. Move one is obvious. Move two is where the interview lives.

## Level 1: the baseline

```swift
final class TrieNode {
    var children: [Character: TrieNode] = [:]
    var isWord = false
}

struct Trie {
    private let root = TrieNode()

    func insert(_ word: String) {
        var node = root
        for ch in word {
            if let next = node.children[ch] { node = next }
            else { let n = TrieNode(); node.children[ch] = n; node = n }
        }
        node.isWord = true
    }

    private func node(endingAt prefix: String) -> TrieNode? {
        var node = root
        for ch in prefix {
            guard let next = node.children[ch] else { return nil }
            node = next
        }
        return node
    }
}
```

This is essentially the canonical class-based Swift trie ([Kodeco n.d.](https://github.com/kodecocodes/swift-algorithm-club/tree/master/Trie)). Each node keys its children by `Character` — *"a single extended grapheme cluster that approximates a user-perceived character"* ([Apple Inc. n.d.b](https://developer.apple.com/documentation/swift/character)) — in a `Dictionary` ([Apple Inc. n.d.c](https://developer.apple.com/documentation/swift/dictionary)). `node(endingAt:)` does the descent in `O(p)` for a prefix of length `p`. The whole question is now: given that node, how do you enumerate its subtree *well*?

## The shortcut everyone tries

Almost every candidate has the same idea, and it's a good instinct: *don't make me walk the subtree later — store the answer as I go.* Keep a list of words on every node, and as you insert a word, append it to each node along its path. Then autocomplete is "descend, return the list." `O(p)` and done.

Then they justify the memory: *"It's fine — `String` is a value type with copy-on-write. I'm storing the same string in a hundred nodes, but they all share one buffer until something mutates, and nothing ever mutates. So it's stored once and shared after that."*

This is the moment I lean in, because half of that is true and the wrong half is the half that matters.

The true half is in Apple's own reference, not folklore: *"Strings always have value semantics. Modifying a copy of a string leaves the original unaffected,"* and although they have value semantics, *"strings use a copy-on-write strategy to store their data in a buffer. This buffer can then be shared by different copies of a string. A string's data is only copied lazily, upon mutation, when more than one string instance is using the same buffer"* ([Apple Inc. n.d.e](https://developer.apple.com/documentation/swift/string)). The collections you'd store those strings in behave identically — *"Arrays, like all variable-size collections in the standard library, use copy-on-write optimization. Multiple copies of an array share the same storage until you modify one of the copies"* ([Apple Inc. n.d.a](https://developer.apple.com/documentation/swift/array)). The Swift project's design notes compress it to one line: buffers are shared *"among copies and slices,"* so copying is *"nearly free"* ([Swift Project n.d.a](https://github.com/swiftlang/swift/blob/main/docs/StringDesign.md)). Copy a long string into a hundred arrays, never mutate it, and you get one heap buffer with a hundred cheap references to it. The candidate's mental model is correct — *for long strings.*

The wrong half is the part Apple's API reference doesn't mention. Stop at "shared buffer" and you've missed the co-equal optimization the Swift project's String design notes call out: *"storing short strings without heap allocation"* ([Swift Project n.d.a](https://github.com/swiftlang/swift/blob/main/docs/StringDesign.md)). That's the **small-string optimization**: on 64-bit, a `String` is a two-word (16-byte) value, and a string short enough to fit (15 UTF-8 bytes) is stored *inline in those bytes, with no heap buffer at all.* (This last detail is an implementation note in the Swift project's design docs, not a guarantee in Apple's `String` reference — which is itself worth knowing.) There is no shared allocation because there is no allocation. Every node you copy that string into gets its own independent inline copy of the bytes.

Now look at the input. Autocomplete is for *dictionary words*. Essentially every English word is ≤ 15 UTF-8 bytes. So the candidate's design lands squarely in the regime where the copy-on-write argument *does not apply* — and a word of length `L` gets physically copied into all `L` nodes on its path. Across a dictionary of `W` words that's `O(Σ Lᵢ)` independent `String` values, not the "stored once" they pitched. It works; it is not free; and the reason it isn't free is the exact Swift detail the question exists to surface. A candidate who says "value type, COW, therefore free" has the right words and the wrong cost model.

The sharper candidates refine the pitch: *store a `Set<String>` on each node and just return the set — `Set` is copy-on-write, so handing it back is `O(1)`.* That part is true — Apple's own reference notes the *"copy-on-write optimization that is used when two instances of `Set` share buffer"* ([Apple Inc. n.d.d](https://developer.apple.com/documentation/swift/set)): returning the set shares its storage, no rehash, no deep copy. But the `O(1)` is an illusion that lasts exactly until the caller *reads* the words — which autocomplete always does. Iterating `k` completions of total length `N` is `O(N)`, the same floor as walking the trie; the set didn't remove that cost, it relocated it into the caller's loop and charged `O(Σ Lᵢ)` of permanent memory at insert time for the privilege. And "return without copying the words" still fails for the same reason: copy-on-write makes returning the *container* cheap, but the small-string optimization makes its *elements* — dictionary-length words — inline 16-byte values that are physically copied every time you read one out. You get a zero-copy view of the set, not of the strings. (A `Set` also discards order, and autocomplete wants ranked results, so the structure can't even be a plain set in the end.)

(For the record, the broader picture: `String` deliberately supports *"multiple representations,"* and `Substring` shares the parent's whole buffer until you convert it back to `String` — another place "free" hides a copy ([Swift Project n.d.b](https://github.com/swiftlang/swift/blob/main/docs/StringManifesto.md)).)

## The elegant answer: produce, don't precompute

Step back. You cannot beat the cost of *producing* the answer: if autocomplete returns `k` words totalling `N` characters, you must emit `N` characters, so `O(N)` time is the floor. The trie subtree under the prefix node *already encodes* every completion. So don't precompute a thing, don't allocate a thing per result — walk the subtree and reconstruct words into **one buffer you reuse**:

```swift
extension Trie {
    func forEachCompletion(of prefix: String, _ emit: (String) -> Void) {
        guard let start = node(endingAt: prefix) else { return }
        var path = Array(prefix)                 // the one and only buffer
        func walk(_ node: TrieNode) {
            if node.isWord { emit(String(path)) }
            for (ch, child) in node.children {
                path.append(ch)
                walk(child)
                path.removeLast()
            }
        }
        walk(start)
    }
}
```

Be precise about the bounds, because vague Big-O is the thing this question is designed to catch:

- **Time: `O(p + N)`** — `p` to descend, then `N` = total length of the output, which is optimal: you cannot return the answer without producing it.
- **Space: `O(1)` with respect to the result.** There is exactly one `path` buffer — a value-type `Array` with its own storage ([Apple Inc. n.d.a](https://developer.apple.com/documentation/swift/array)) — reused across the entire traversal. Nothing is allocated per match. Nothing is precomputed at insert time. The only memory that scales with anything is the buffer and the recursion, and both are bounded by the *longest word* — not by how many completions exist, not by dictionary size. The `String(path)` handed to `emit` is the output itself, not overhead.

And because it streams through a closure, **early exit is free** — a caller that wants the first ten just stops consuming; the walk doesn't run to completion, and we never built a list to throw away. That's the payoff the "store it at every node" design can't match: it pays `O(Σ Lᵢ)` memory up front to answer queries we may never ask, in exchange for being *slower* to insert and identical to produce.

## Removing even the call stack

A sharp candidate will push on my one hand-wave: the recursion is `O(longest word)` of call stack. Can we get *strictly* `O(1)` auxiliary space — no recursion, no explicit stack?

You can, and the way you do it is the punchline of the whole question. Give every node its **parent** and a stable **order** over its children, and a depth-first walk needs no stack at all: from any node you can compute where to go next (first child, else next sibling, else climb to the parent and resume after the slot you came from). Pointers in a value type fight you, so you move to an index arena:

```swift
struct ArenaTrie {
    struct Node {
        var isWord = false
        var parent = -1
        var edge: Character = "\0"   // edge label from parent
        var slotInParent = 0         // this node's index within parent.kids
        var kids: [Int] = []         // child node ids, sorted by their edge
    }
    private var nodes: [Node] = [Node()]   // id 0 == root

    mutating func insert(_ word: String) {
        var cur = 0
        for ch in word {
            if let k = nodes[cur].kids.firstIndex(where: { nodes[$0].edge == ch }) {
                cur = nodes[cur].kids[k]
            } else {
                var n = Node(); n.parent = cur; n.edge = ch
                nodes.append(n)
                let new = nodes.count - 1
                var pos = nodes[cur].kids.count
                for (i, kid) in nodes[cur].kids.enumerated()
                    where ch < nodes[kid].edge { pos = i; break }
                nodes[cur].kids.insert(new, at: pos)
                for j in pos..<nodes[cur].kids.count {
                    nodes[nodes[cur].kids[j]].slotInParent = j
                }
                cur = new
            }
        }
        nodes[cur].isWord = true
    }

    private func node(endingAt prefix: String) -> Int? {
        var cur = 0
        for ch in prefix {
            guard let k = nodes[cur].kids.firstIndex(where: { nodes[$0].edge == ch })
            else { return nil }
            cur = nodes[cur].kids[k]
        }
        return cur
    }

    func forEachCompletion(of prefix: String, _ emit: (String) -> Void) {
        guard let start = node(endingAt: prefix) else { return }
        var buf = Array(prefix)
        var cur = start
        var resumeSlot = -1            // last child slot we returned from
        while true {
            if resumeSlot == -1, nodes[cur].isWord { emit(String(buf)) }
            let kids = nodes[cur].kids
            if resumeSlot + 1 < kids.count {
                let child = kids[resumeSlot + 1]
                buf.append(nodes[child].edge)
                cur = child
                resumeSlot = -1
            } else {
                if cur == start { break }
                buf.removeLast()
                resumeSlot = nodes[cur].slotInParent
                cur = nodes[cur].parent
            }
        }
    }
}
```

Same `O(p + N)` time. Now the auxiliary space is genuinely `O(1)`: two integer cursors and the one reused buffer — no recursion, no stack, regardless of tree depth.

But notice what it cost. To delete the call stack I gave the trie *parent links* and *stable identity* for every node — and to express identity safely in a value-typed language I abandoned the natural `struct`-of-`struct` tree for an arena of integer ids. The data structure didn't change; the *Swift* did. That's the entire reason I ask this question: a trie is where Swift's value semantics stop being a slogan and start being a design decision. The candidate who feels that tension — who can say *why* the elegant `O(1)`-space version wants reference semantics and what it costs to fake them with indices — is the one I want.

## What I'm actually looking for

- **Do they know what their `String`s cost?** "Value type, copy-on-write, so it's free" is the trap. The small-string optimization means dictionary words are copied inline, not shared. Knowing *which regime your data is in* is the signal.
- **Can they state a bound honestly?** `O(N)` is meaningless until you say what `N` is. "Optimal, because you can't return the answer without producing it" is a different level of understanding than "the loop looks linear."
- **Do they reach for precomputation or production?** Storing the answer at every node feels clever and is usually wrong: it trades real memory and slower inserts for a query you can already serve in optimal time by walking what you have.
- **Can they feel the value/reference seam?** The `O(1)`-space version *wants* parent pointers and identity. Watching a candidate discover why — and decide whether an index arena is worth it — tells me more than any whiteboard sort.

There are flashier interview questions. For Swift specifically, I haven't found one that gives more signal per minute. If you're prepping: build the trie, build autocomplete the lazy way, then try to make it allocate nothing and use no stack. Somewhere in that third step you'll stop writing a data structure and start writing Swift.

## References

- Apple Inc. n.d.a. "Array." Apple Developer Documentation. Accessed May 15, 2026. <https://developer.apple.com/documentation/swift/array>.
- Apple Inc. n.d.b. "Character." Apple Developer Documentation. Accessed May 15, 2026. <https://developer.apple.com/documentation/swift/character>.
- Apple Inc. n.d.c. "Dictionary." Apple Developer Documentation. Accessed May 15, 2026. <https://developer.apple.com/documentation/swift/dictionary>.
- Apple Inc. n.d.d. "Set." Apple Developer Documentation. Accessed May 15, 2026. <https://developer.apple.com/documentation/swift/set>.
- Apple Inc. n.d.e. "String." Apple Developer Documentation. Accessed May 15, 2026. <https://developer.apple.com/documentation/swift/string>.
- GeeksforGeeks. n.d. "Trie \| (Insert and Search)." GeeksforGeeks. Accessed May 15, 2026. <https://www.geeksforgeeks.org/trie-insert-and-search/>.
- Kodeco. n.d. "Trie." Swift Algorithm Club. Accessed May 15, 2026. <https://github.com/kodecocodes/swift-algorithm-club/tree/master/Trie>.
- Swift Project. n.d.a. "String Design." Swift. Accessed May 15, 2026. <https://github.com/swiftlang/swift/blob/main/docs/StringDesign.md>.
- Swift Project. n.d.b. "String Manifesto." Swift. Accessed May 15, 2026. <https://github.com/swiftlang/swift/blob/main/docs/StringManifesto.md>.
{:.refs}
