---
layout: post
title: "Why we review: code review as a trust system in the agentic age"
summary: "AI can find many of the things humans used to find in pull requests. That does not mean the review process is obsolete. In good teams, review is also how knowledge spreads, judgment develops, and the SDLC earns trust."
tags: [ai-agents, code-review, platform-engineering, sdlc, pr-review, software-engineering]
---

A recent arXiv paper by Martin Monperrus has the kind of title that does exactly what a good position paper title should do: it makes you want to argue with it.

[The End of Code Review: Coding Agents Supersede Human Inspection](https://arxiv.org/abs/2606.13175) argues that coding agents have reached the point where mandatory human code review is no longer a necessary part of the software quality pipeline. Agents can read code, run tests, inspect history, reason over larger context, produce structured findings, and iterate on fixes. Humans, meanwhile, are slow, inconsistent, expensive, and increasingly overwhelmed by the amount of code AI tools can generate.

There is a lot in that argument I agree with.

PR review was already a bottleneck before AI made code cheaper to produce. Most teams have felt this. A pull request waits for the one person who knows the subsystem. That person is in meetings, on leave, overloaded, or no longer on the team. The author pings Slack. The reviewer skims after dinner. The PR grows stale. By the time approval arrives, everyone has lost the thread.

If AI-assisted development increases the number of changes, the old review queue gets worse. Asking humans to manually inspect every generated diff does not scale. Some part of review has to become more automated, more continuous, and more evidence-driven.

> Just as formatters and linters moved review beyond whitespace and formatting arguments, AI reviewers should move humans beyond mechanical inspection. The goal is not to remove people from review. It is to spend their attention on the questions that still need judgment.

But I do not think the interesting question is whether AI can replace human review comments.

The interesting question is why we review in the first place.

Alexander Pretschner [made a useful objection to the paper](https://www.linkedin.com/posts/alexander-pretschner-132a295_this-is-a-nice-and-thought-provoking-piece-share-7473648410089164800-JqxD): what if the value of review is not only in the findings? What if the act of reviewing is itself valuable because it makes a person think, possibly outside the box? What if review matters because it transfers knowledge, builds judgment, and keeps humans connected to the system they are responsible for?

That objection lands for me because I have spent a lot of time around platform engineering and SDLC design. The job is not only to make code move from development to production quickly. The job is to make that path trustworthy.

A good review process is part of that trust system.

It helps prevent bad changes from reaching production, yes. But it also spreads ownership, keeps teams familiar with more of the codebase, exposes assumptions, teaches norms, and prevents one person from becoming the only keeper of a critical path. When someone leaves the team, gets reassigned, or is simply unavailable, the system should not fall apart because all knowledge lived in their head.

That is why "AI can find defects" is not enough. Defect finding is only one job review performs.

## Code review was never only about bugs

The older code review literature is useful here because it reminds us that review started as a process discipline, not as a comment generator.

In 1976, Michael Fagan published the classic paper on design and code inspections at IBM. Fagan inspections were formal and heavy by modern standards: defined roles, overview, preparation, inspection, rework, and follow-up. The point was not just to catch errors. The process produced measurement, feedback, and control. It helped teams understand where errors came from, which modules were risky, whether fixes were completed, and how the development process could improve.

That matters because it frames review as a control loop. The finding is one artifact. The preparation, discussion, follow-up, and learning are part of the mechanism.

Modern pull request review is much lighter than Fagan inspection, but the broader function did not disappear.

In their 2013 paper [Expectations, Outcomes, and Challenges of Modern Code Review](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/ICSE%202013-codereview.pdf), Alberto Bacchelli and Christian Bird studied review practice at Microsoft. Developers and managers said defect finding was the top motivation. But when the researchers classified actual review comments, only about 14% were defect-related. The review conversations were often about code improvement, clarification, alternative solutions, knowledge transfer, team awareness, and shared ownership.

That gap is important. We say review is for bugs. We use it for understanding.

Bacchelli and Bird also found that understanding the change was the central challenge. Reviewers with prior context produced deeper feedback. Developers said unfamiliar files took longer to review. File owners left more detailed and insightful comments.

This should make us careful with the claim that agents simply replace reviewers. If the hard part of review is constructing enough context to reason well, then agents are extremely useful. They can summarize diffs, find related files, retrieve prior decisions, inspect history, and run checks. But if humans stop doing any of that comprehension work, the team may lose one of the mechanisms that kept knowledge distributed.

The review may still produce a report. The team may understand less.

## Good review systems fight silos

Peter Rigby and Christian Bird studied review across several firms and open-source projects in [Convergent Contemporary Software Peer Review Practices](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/rigby2013convergent.pdf). They found that despite very different settings, review practices had converged around a few patterns: lightweight process, early and frequent review, small changes, roughly two active reviewers, and review as group problem solving rather than defect counting.

One result is especially relevant to platform teams: peer review increased the number of distinct files a developer knew about by 66% to 150%, depending on the project.

That is not a minor side effect. That is organizational resilience.

Teams do not only need code that passes tests. They need enough people to understand enough of the system that work can continue when the usual expert is unavailable. They need a way for knowledge to cross component boundaries. They need to avoid the slow drift where every critical subsystem has exactly one person who understands it.

PR review is imperfect at this. Sometimes it spreads knowledge. Sometimes it creates queues around the same overburdened experts. But the intent matters. A good review process can be designed to expose more of the team to more of the codebase.

This is where an agentic review process can help or hurt.

If the agent becomes the only reviewer, the team may reduce human exposure to the codebase. The knowledge silo does not disappear. It moves into an opaque agent prompt, memory store, or vendor service.

If the agent is designed well, it can do the opposite. It can recommend reviewers to spread knowledge, produce review briefings for people who do not own the file, explain why a change matters, and keep a history of prior decisions that humans can actually read. It can make cross-team review less painful.

The difference is design intent.

## Google's review culture was about readability and education

The Google case study is the strongest counterexample to the idea that review is mainly a bug filter.

In [Modern Code Review: A Case Study at Google](https://sback.it/publications/icse2018seip.pdf), Caitlin Sadowski, Emma Söderberg, Luke Church, Michal Sipko, and Alberto Bacchelli describe a review system operating at enormous scale: more than 25,000 developers and over 20,000 reviewed changes per workday.

The process is lightweight. Changes are small. Iterations are quick. Tooling is tightly integrated. Often one reviewer is enough.

But the motivation is not simply "find bugs before merge." Review at Google was introduced early to force readable, maintainable code. Code should act as a teacher for future developers. The paper describes expectations around education, maintaining norms, gatekeeping, accident prevention, and history tracking.

That phrase, code as teacher, is worth sitting with.

A codebase is not only an artifact executed by machines. It is also a body of material read by humans. The next engineer learns from what is already there. If the code is confusing, inconsistent, or locally clever in ways that do not match the surrounding system, it teaches the wrong thing.

Review is one of the places where a team says: this is how we write here.

An agent can help enforce that. It can catch naming drift, missing tests, bad patterns, and unclear explanations. It can compare the change against local conventions more consistently than a tired human reviewer.

But if nobody on the team learns the convention because the agent silently enforces it, the organization has traded human judgment for hidden automation. That may be fine for formatting. It is less fine for architecture, product semantics, safety, or compliance.

## Compliance has the same trap

Pretschner's compliance analogy is the right one.

A lot of compliance work feels bureaucratic. So does a lot of review work. Expensive, slow, repetitive, easy to resent. If you see compliance as paperwork whose purpose is to satisfy an external gate, AI-generated safety cases and audit documents look like an obvious win.

Sometimes they are.

But some compliance and quality activities exist because the process of doing them forces the organization to understand the product better. A safety case is not valuable only because it exists as a document. It is valuable because building it should force people to ask what can go wrong, which assumptions are unsupported, which mitigations are real, and where responsibility lives.

If AI generates the artifact and the organization skips the thinking, you get the document without the understanding.

The same failure mode exists in code review. You can get an approval, a checklist, a SARIF file, a security report, and a friendly summary. But did anyone understand the risk? Did anyone learn the subsystem? Did the team improve its shared mental model? Did the process make production safer, or did it only make merge faster?

Those questions matter more as AI gets better at producing plausible work products.

## The review bottleneck was already telling us something

Before AI, review queues were already painful. That pain was not only a capacity problem. It was often a signal that the review process was carrying too many jobs at once.

A PR review might be expected to:

- catch defects;
- enforce style;
- check tests;
- teach a junior developer;
- spread knowledge to another team;
- validate architecture;
- enforce ownership boundaries;
- satisfy compliance;
- record history;
- prevent production incidents;
- approve release risk.

No wonder it gets slow.

The mistake is to respond by asking whether a human or an AI should do "the review." There is no single review job. There are many jobs bundled into one social ritual around a pull request.

Agentic review gives us a chance to unbundle them.

Let agents handle the mechanical work: run the tests, inspect the diff, check policy, find related incidents, identify risky files, compare against known patterns, summarize changes, and produce structured evidence.

Let humans handle the work where human participation is part of the value: architecture, product intent, mentoring, ownership, risk acceptance, compliance interpretation, and the uncomfortable questions that do not reduce cleanly to a rule.

That is not a defense of slow review. It is an argument for better review.

## What should transfer into agentic review?

A good agentic PR review system should inherit the lessons from good human review systems.

First, keep changes reviewable.

Reviewability research has shown what every maintainer already knows: smaller, coherent changes with clear descriptions are easier to review. AI makes this more important, not less. If agents generate larger diffs faster, review quality drops unless the system pushes back. A review agent should be willing to say: split this PR, explain the intent, separate mechanical churn from behavior change, or provide the missing test evidence.

Second, make understanding cheaper.

A reviewer should not have to reconstruct everything from scratch. The agent can prepare the briefing: what changed, why it appears to matter, which files are risky, which prior decisions are relevant, what CI did and did not validate, what assumptions remain untested, and where the agent is uncertain.

That last part matters. A useful review agent should not only produce findings. It should produce better questions.

Third, route review for knowledge distribution, not only ownership.

If the same expert reviews every change in a subsystem, the queue is fragile and the team learns nothing. Agents can recommend reviewers in a way that balances expertise with knowledge spreading. They can generate context packs that let a non-owner participate meaningfully. They can track whether familiarity is broadening or narrowing over time.

Fourth, keep public trust expensive.

This is one lesson I keep coming back to from building PR review automation. A bad bot comment in a public PR thread is not a small mistake. It spends maintainer attention and lowers trust in the system. A few low-quality AI comments can cause people to ignore the whole thing.

The better pattern is a back channel first: let the agent reason, run commands, make mistakes, and refine its findings somewhere private or semi-private. Only surface the grounded, actionable parts to the public PR thread. Public comments should be selected output, not raw agent thought.

Fifth, preserve the human learning loop.

If the agent finds an issue, the team should be able to learn from it. If a human corrects the agent, the system should retain that correction as a rule, example, or evaluation case. If a reviewer asks a follow-up question, the agent should be able to run a simulation and bring back evidence.

This is where agentic review can become better than old review. A persistent PR thread can hold context across days. A human can drop a short question from a phone while away from the desk, then come back to a played-out scenario: commands run, assumptions checked, failure modes explored, and remaining uncertainty made explicit.

That is not replacing human thought. It is extending it.

## What should not be automated away?

Some work should absolutely be automated. Nobody needs a human to argue about formatting. Nobody needs a senior engineer to manually check every import order. Machines are better at many repetitive checks.

But we should be careful about automating away processes whose value lies partly in the human doing them.

Students do homework because the work changes the student. Engineers review code partly because the review changes the engineer and the team. Researchers write papers partly because writing forces the argument to become clear. Professors prepare classes partly because preparation reorganizes their own understanding.

The output matters. The process also matters.

For code review, the risky areas are the ones where understanding and accountability matter:

- architecture and long-term maintainability;
- product semantics and business intent;
- safety and compliance reasoning;
- privacy, fairness, and ethical tradeoffs;
- mentoring and onboarding;
- cross-team awareness;
- ownership of production risk.

Agents can assist all of these. They should. But assistance is different from pretending the human process had no value.

## The end of rubber-stamp review

I do think one kind of review should die: the ritual approval that gives everyone the feeling of safety without much actual safety.

If a reviewer is skimming a 2,000-line generated diff at 9 PM and clicking approve because CI is green, that is not meaningful human oversight. It is ceremony. Agents can probably do better than that already.

But that is not the same as saying code review should end.

The better conclusion is that review needs to move up a level.

Agents should take over the parts of review that are repetitive, evidence-gathering, and mechanically checkable. They should make changes smaller, context easier to recover, risk more visible, and history easier to query. They should help teams preserve the good parts of review instead of drowning in the bad parts.

Humans should spend less time acting as slow linters and more time asking the questions that actually require ownership:

Does this change fit the system we want to have a year from now?

What assumption would make this safe-looking change dangerous?

Who needs to understand this before it ships?

What did we learn that should become a rule, a test, or documentation?

Are we approving this because it is understood, or because the process produced an approval-shaped artifact?

That last question is the one I would put at the center of agentic review.

AI can review code. The harder question is whether it can help an organization keep understanding its software as the software changes faster.

That is the standard I would use for agentic PR review systems. Not "did the agent leave comments?" Not "did it approve faster?" But: did it make the path from development to production more trustworthy?

If it did, we should use it.

If it only made the paperwork cheaper, we should be much more suspicious.

## Sources

- Martin Monperrus, [The End of Code Review: Coding Agents Supersede Human Inspection](https://arxiv.org/abs/2606.13175), 2026.
- Michael E. Fagan, [Design and Code Inspections to Reduce Errors in Program Development](https://www.ida.liu.se/~TDDC90/labs/lab-papers/fagan76.pdf), IBM Systems Journal, 1976.
- Alberto Bacchelli and Christian Bird, [Expectations, Outcomes, and Challenges of Modern Code Review](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/ICSE%202013-codereview.pdf), ICSE 2013.
- Peter C. Rigby and Christian Bird, [Convergent Contemporary Software Peer Review Practices](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/rigby2013convergent.pdf), ESEC/FSE 2013.
- Caitlin Sadowski, Emma Söderberg, Luke Church, Michal Sipko, and Alberto Bacchelli, [Modern Code Review: A Case Study at Google](https://sback.it/publications/icse2018seip.pdf), ICSE-SEIP 2018.
- Maria Caulo, Bin Lin, Gabriele Bavota, and Michele Lanza, [Knowledge Transfer in Modern Code Review](https://www.inf.usi.ch/lanza/PUBS/P/Caul2020a.pdf), ICPC 2020.
- Achyudh Ram et al., [What Makes a Code Change Easier to Review](https://marco-c.github.io/publications/reviewability-fse2018.pdf), FSE 2018.
- [A Survey on Modern Code Review: Progresses, Challenges and Opportunities](https://arxiv.org/html/2405.18216v1), 2024.
