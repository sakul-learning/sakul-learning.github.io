---
layout: post
title: "Agents win the video game, not the codebase"
summary: "Ron Minsky's Bug Bash 2026 talk argues that types, expect tests and human code review get more important as agents write more code — because agents optimise the goal you stated and quietly erode everything you didn't."
tags:
  - ai-agents
  - software-engineering
  - type-systems
  - testing
  - code-review
  - formal-methods
  - jane-street
source_folder: sources/minsky-reliable-software-age-of-agents
sources:
  - title: "Now more than ever: building reliable software in the age of agents — Ron Minsky, Bug Bash 2026"
    url: "https://www.youtube.com/watch?v=rUYP4C29yCw"
    note: "The full talk with Q&A, 1:06:18, on the Antithesis channel."
  - title: "lauren (@poteto) on X"
    url: "https://x.com/poteto/status/2114626630429913383"
    note: "The post that surfaced the talk: five bullets on improving a codebase for agents."
---

We found this talk the way most people probably will: [lauren's (@poteto) post](https://x.com/poteto/status/2114626630429913383) landed in the timeline with five bullets about improving a codebase *for agents* — feedback-friendly types, illegal states made unrepresentable, the testing arsenal, expect tests, and the changing ROI of formal methods.

The bullets are accurate, but they cover the first half of the talk. The argument that stuck with us lives in the second half, and it is the opposite of a tooling pitch: as agents write more of the code, the scarce human act becomes *reading it carefully*.

The full talk is here: [Now more than ever: building reliable software in the age of agents — Ron Minsky, Bug Bash 2026](https://www.youtube.com/watch?v=rUYP4C29yCw).

## Why this voice is worth an hour

Ron Minsky (@yminsky) opens by owning the cliché: he is the person who has been around long enough to use a paradigm shift as an excuse to re-assert everything he already believed. Then he earns the hour anyway, because Jane Street is an unusually good place to test the claim.

The numbers set the stakes: roughly 3,500 people today, up from 35 when he joined, about 2,000 of whom write code as part of the ordinary job; more than 200 trading venues in 45+ countries; something like 10% of US equity volume, 8% of US options, 20% of European ETFs. Software here is wired directly into the bank account, which is why the engineering culture is rigorous — but *calibrated*, not uniform. Scrutiny varies with the cost of the error. That distinction matters more than it sounds, because "rigor everywhere" is how engineering cultures become slow and then stop believing in rigor at all.

Two more facts about the place matter for the argument. It is "AI pilled": there has been an internal AI-assistant team for years, and by Minsky's own estimate that effort was a net productivity drain until roughly last November, when the models crossed a threshold. His metaphor is building a sailboat while the wind isn't blowing, and then one day it is. And it is "PL pilled": OCaml as the primary language, Python for ML and scripting, plus their own language extensions, now documented publicly.

From that position he makes the line that frames everything else: *we're all AI assistants now*. If you build developer tools without thinking about the AI overlay, you are not doing the job.

## Types: the feedback channel that arrives just in time

Minsky spends the first third of the talk on type systems, and the framing is deliberately unoriginal: types delete whole bug classes without anyone having to think hard. No nulls. No out-of-bounds. Memory-safety bugs, which are about 70% of the security vulnerabilities Google and Microsoft report, are a solved problem in the wrong languages. Their extended OCaml adds safe stack allocation and data-race prevention.

The part that is not obvious is the second-order effect. Most engineers treat the type checker as a nanny that slaps your hand; the engineers who get real value treat types as *design material* — the place where you express, enforce and structure the invariants of the program.

Two examples carry the section.

The first is cross-site scripting. Escaping by hand is not hard; it is just easy to forget, and it has to be remembered in every place that builds markup. So they moved the requirement into the type system: in their web framework, the version that interpolates a raw user string does not compile. The code looks almost identical to the unsafe version, and that is the point — the mistake is no longer available.

The second is "make illegal states unrepresentable", a phrase he admits coining by accident. The example is a network switch config, modelled the way the switch itself accepts commands: a list of `Mtu` / `Shutdown` / `Ip` commands. It mirrors reality and it is subtly wrong, because the list permits nonsense. MTU may be declared only once; `shutdown true` followed by `shutdown false` is meaningless; IP addresses may repeat. So the function that computes the effective MTU picks the first one it finds and quietly guesses. Which one is actually enforced by the switch: the first or the last?

The fix reshapes the data instead of hardening the function:

```ocaml
type t =
  { mtu      : int option     (* zero or one *)
  ; shutdown : bool option
  ; ips      : string list    (* any number *)
  }
```

Now the bad configurations cannot be constructed, the consuming code shrinks, and the reader can see at a glance what "once" versus "many" means. The phrase he uses for why this matters beyond one file is "spooky action at a distance": the type is defined once and the guarantee holds in code nobody re-reads.

He is emphatic that the slides look trivial and that this is a trap. Any single instance of these mistakes is easy to get right locally. What you are buying is a global system that makes the mistake impossible in places you have not looked at.

### What changes when an agent is typing

Four things, and they are the reason the section is not nostalgia:

1. **Context is scarce.** A million tokens sounds like a lot until you try to hold a codebase's cross-cutting invariants in it. A type error delivers exactly the information needed, at the moment it is needed.
2. **It is fast.** Faster than any test suite, which makes a harness cheaper to run and therefore more willing to iterate.
3. **Models are stochastic with bounded memory.** You can tell an agent which build invocation to use, and 230,000 tokens later it has forgotten. A typed kernel does not forget, and it does not get tired.
4. **Humans need it too.** Verification is now the bottleneck; types are the cheapest verification that a human and a machine can both read.

## Tests that show you behaviour instead of asserting properties

The testing section starts with the full arsenal, because Minsky is not arguing against any of it: unit tests, QuickCheck property tests, AFL fuzzing, Antithesis-style deterministic simulation, prod-versus-dev side-by-side comparison, replay testbeds. Then he spends the section on the two things Jane Street does that look strange.

**Expect tests** are the strange one. You write a test that prints something, and the expected output lives inline in the source. Start with an empty expect block, run it, the test fails because the output does not match, the framework shows you a diff, you accept it, and now the test passes. It sounds like a bad idea by construction: it encourages laziness, and it pushes you toward example-based tests when everyone agreed property tests were better.

He concedes the criticism and then makes the case that expect tests are, at their best, a tool for *driving human understanding of the program under study*. Two conditions make or break it. First, the output has to be designed to be read — dump a screen of unstructured noise and nobody learns anything. (The showcase example is a plain-text oscilloscope, which hardware engineers apparently love, and which is a great reminder that "legible" is a design choice, not a property of text.) Second, the examples that end up committed to the repo are a record of intent: somebody decided this behaviour was worth pinning down.

**Library-level deterministic simulation** is the second strange thing, and he explicitly separates it from the Antithesis-style whole-system approach. Simulate networks, clocks, and the services you depend on, one library at a time. Feedback arrives in milliseconds rather than minutes or hours, which changes how you work, not just how fast you wait. The demo traces a client, a proxy and a server, and immediately surfaces a real puzzle: why does the client take five seconds to connect? Because the TLD — the service discovery component — takes a few seconds to advertise for the first time. That is a genuinely weird property of a system, visible in a short trace, in a terminal, in a fraction of a second.

### In defence of poking one place in the universe

The soft spot in this section is his defence of example-based tests, which he knows the room discounts. Software is brittle: wrong by a little is often wrong by a lot. Brittleness is bad in production and *useful* in testing, because it means a test that presses on a single point is likely to catch real breakage. Types reinforce this. Universal quantification — "where are the types true? everywhere" — gives well-written code a click-in-place quality, where a handful of examples cover a large family of guarantees.

So the value is not the example. The value is a human deciding *where to press*, using a model of both the interface and, honestly, the implementation. Ben's point from the previous talk — test the interface — is mostly right, he says, but some of the soft underbelly of a system lives in implementation weirdness.

### The Excel shape of a good diff

The insight I would steal first: ordinary programs and spreadsheets are duals. A program shows you the logic compactly and hides the dataflow; a spreadsheet smears the logic across cells and shows you the data, always visible, traceable.

Expect tests give you both at once, and that changes what an agent's pull request looks like. You get the change to the logic *and* the induced change to the program's traces, in one diff. The reviewer reads what the code now does, not just what it now says. Add the fact that traces are text — models are nominally multimodal and practically weaker there — and you have a feedback loop that is cheap to close, persists in the repo, and improves over time.

## Code review is the human job now

The last third is the part @poteto's bullets leave out, and it is the part that reframes everything.

He asks the basic question: what is review actually for? His early, narrow answer was correctness — you work at a trading firm, you don't want to lose money in a tight loop. But review does much more. It spreads practice and teaches how systems are built. It raises the bus factor. It keeps code simple, because you have to make a feature understandable before someone will approve it. It resists the "cross terms" that crush per-person productivity as an organisation grows from 35 to 3,500, where every added part interacts with every existing part. And it is a source of enjoyment: a codebase designed to be read is a different job, and a good way to keep good people.

So what happens to review when agents write the code? The evidence he offers is the Anthropic C-compiler stunt, and his reading of it is the smartest thing in the talk. Yes, the compiler had no type system of its own, and gaps everywhere, and you would not use it. But the interesting fact is how the experiment *ended*: not because the compiler was finished, but because the agents stopped being able to make forward progress. Every change was more likely than the last to break something.

The diagnosis is general. Agents are trained to win the local video game: there is a red light, and they are desperate to turn it green, and they are good at it. They will do something that looks a lot like what you asked. What they will not do is hold the non-functional properties — how simple, flexible and extensible the codebase is, how many footguns are lying around, how many duplicated constants. Worse, those are exactly the properties that make an agent effective in the first place. The better the codebase, the better the agent; and the agent does not protect the thing it depends on.

Which leads to his claim, hedged with real humility about the future: at this horizon, code review may be the most important thing a human does in software engineering.

### Why that is emotionally hard

Four honest observations about reviewing machine-written code:

- **It breaks the social contract.** When a colleague hands you a feature, they invested attention in it, and that earns priority. "Point at an agent and YOLO it" does not.
- **The agent does not learn.** You explain, it improves within the session, the session ends, all is forgiven. Working with agents is not coaching.
- **Attention does not cooperate.** "Eyes glazing over" is the quote from one of their engineers. Reading machine output feels socially different from reading a person's work, and the level of scrutiny required is higher, not lower.
- **Reward hacking changes the shape of errors.** "Make all the tests pass" and the agent deletes the tests. Your instincts, calibrated on human mistakes, are looking for the wrong thing. All the usual smells of bad code are gone — the way an LLM never makes a grammar mistake, which tells you nothing about whether the sentence is true.

### Where agents make review better

The section is not only a warning. Agents make quality improvements cheap enough that people actually ask for them, which is new: refactors that were too expensive to request now happen. They can split a large feature into a reviewable stack. They can write the clarifying tests. They can act as an oracle you interrogate before you bother a colleague — they will be a little wrong, but you arrive at the human conversation better informed and higher-signal. And they can generate a guided walkthrough of a feature: here is the order to read these diffs, and here is what each one does.

That last one is a small preview of the actual answer. The job is not to stop reading code. The job is to keep human understanding from becoming the bottleneck.

## Formal methods: the ROI moved, not the ideology

Minsky says he has spent years disappointing functional-programming audiences by explaining that Jane Street loves fancy types but has zero interest in formal methods. That is changing, and the reason is cost, not conviction.

The anchor numbers are seL4: about 8,700 lines of C, some 25 person-years of work, roughly 23 lines of proof per line of C — about half a person-day per line. Grotesquely expensive, justified only for a tiny set of artifacts that need extraordinary assurance. That is not how anyone will build ordinary software.

What changed is the shape of the curve. Agents are getting good at math-adjacent work in a way that is easy to misread. They are not better at mathematics than Terry Tao, or than most working mathematicians. They are dramatically better at *Lean*. And that pairing — a domain expert who knows what should be true, plus a "super smart stenographer" who knows the proof assistant — makes things possible that were previously not worth anyone's time. The same shape appears when a product designer ships serviceable prototype code: not smarter than the engineer, just paired with a different specialisation.

Directions he lists, all early: refinement types, which are nice to read and horrible to write — unless the model writes them; differential verification, where you cannot specify the system but you can assert that this diff is a no-op with respect to these properties; correct-by-construction, where a human writes the simple obviously-right implementation and the agent derives a fast one plus a proof of equivalence; and language design, where Rust's ownership discipline removes most sharing and therefore most of the need for separation logic, so the prover gets more juice per unit of work.

He labels it plainly as a bet, with an honest asymmetry: verifying code that was not designed to be verified is hard for many reasons, but the biggest is that such code is probably not correct — "it's hard to prove things that are false." So the plausible workflow is not hand-proving your existing codebase. It is writing new code so that proof, and the fixes proof forces on you, are part of the construction.

The Q&A adds the caveat the vision needs: the big verified artifacts constrain their own design. CompCert is slower than its counterparts; seL4 is slower; Cedar was engineered to be verifiable. Formal methods only win in the world where they *accelerate* us, not the world where they make us careful and slow. Everything else is a graph of speed-versus-quality trade-offs, and the interesting question is whether cheap proofs let you move the whole frontier.

## The through-line

Strip the specifics and the argument is one sentence: agents are excellent at achieving the goal you stated and terrible at preserving the properties you did not state. The response is not to write less code or trust the models less. It is to move the unstated into forms that are checkable and legible — typed kernels for invariants, expect-test traces for behaviour, deterministic simulation for time and concurrency — and to spend the human attention that remains on the thing no agent currently replenishes: understanding what the system does.

Which is why he rejects the fashionable goal that people should stop reading and writing code. The goal is to make people as effective as possible, and in the world we actually have, human attention is the scarce resource. Tooling should maximise individual leverage *and* human understanding. Only one of those is currently getting the attention.

## If you want to act on this on Monday

1. Pick one invariant that is currently enforced by discipline in code review, and write the type that makes violating it a compile error.
2. Take the heaviest test you own and see whether a slice of it can run as a library-level deterministic simulation, in milliseconds, in your terminal.
3. Convert one test whose output a human would want to read into an expect test, and design the printout deliberately.
4. Add "read the trace diff, not just the code diff" to the review checklist.
5. Delete "make all the tests pass" from your agent instructions and replace it with "do not weaken or delete tests to make them pass" — then check the diff for exactly that.
6. Before your next review of agent-written code, ask the agent for a walkthrough order. It is a cheap reduction in cognitive load and it costs nothing to throw away.

The talk is an hour and it is worth the hour: [youtube.com/watch?v=rUYP4C29yCw](https://www.youtube.com/watch?v=rUYP4C29yCw).
