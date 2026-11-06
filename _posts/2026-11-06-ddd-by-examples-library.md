---
layout: post
title: "Learn DDD by following a library through its rules"
summary: "ddd-by-examples/library is a compact Java reference project that starts with library rules, turns them into EventStorming artefacts, and shows bounded contexts, aggregates, events, CQRS and hexagonal architecture without pretending every context needs the same design."
tags:
  - domain-driven-design
  - ddd
  - architecture
  - event-storming
  - java
  - software-design
sources:
  - title: "ddd-by-examples/library"
    url: "https://github.com/ddd-by-examples/library"
    note: "The MIT-licensed reference project discussed here, including its domain description, EventStorming material, architecture notes and tests."
  - title: "Bounded Context — Martin Fowler"
    url: "https://martinfowler.com/bliki/BoundedContext.html"
    note: "A concise explanation of why large systems need multiple internally consistent models rather than one universal model."
  - title: "Anti-Corruption Layer pattern — Microsoft Learn"
    url: "https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer"
    note: "Practical guidance on preserving a model when integrating systems with different semantics."
  - title: "DDD Resources — Domain Language"
    url: "https://www.domainlanguage.com/ddd/"
    note: "Eric Evans' resource hub, including the original book and the downloadable DDD Reference."
---

[ddd-by-examples/library](https://github.com/ddd-by-examples/library) is one of the more useful ways to study Domain-Driven Design (DDD): it does not begin with a diagram full of pattern names. It begins with a small, believable problem.

A public library lends books from branches. Some copies are restricted. A regular patron may have at most five holds; a researcher may hold restricted books and request open-ended holds. Patrons with too many overdue checkouts at a branch cannot place another hold there. Those are rules people can disagree about, clarify, and test. They are a much better starting point than deciding that a project “needs aggregates.”

The repository is a Java/Spring reference project, published under MIT. It is not a drop-in architecture or a claim that every application should be event-driven. Its value is the visible path from business language to code.

## The sequence is the lesson

The project documents three discovery steps before it presents its package structure:

1. **Big Picture EventStorming** turns the library story into events, actors, policies, and questions.
2. **Example Mapping** converts the fuzzy story into examples and rules.
3. **Design Level EventStorming** examines individual examples closely enough to choose a design.

That order matters. DDD patterns are tools for protecting business decisions, not a vocabulary to sprinkle over entities. “Only one patron can hold an available copy” is an invariant. “A daily sheet identifies expiring holds” is a business process. Once those ideas are explicit, the technical design has something real to preserve.

## Two contexts, deliberately not symmetrical

The project separates the system into **catalogue** and **lending** bounded contexts inside a modular monolith. The lending context contains the more interesting business logic, so it has a domain model and hexagonal architecture. The catalogue context is described as CRUD-like, because its problem does not justify the same machinery.

That asymmetry is refreshing. A bounded context is not synonymous with a microservice, and DDD is not a command to make every package look equally sophisticated. The repository keeps contexts in separate packages, with the option to move them into Maven modules or services later if the organisational and operational boundaries make that worthwhile.

This maps neatly to Martin Fowler's explanation of a bounded context: large systems cannot usually sustain one globally unified model. A word such as “book” can mean a catalogue record in one context and a copy whose hold state matters in another. The goal is not to erase the difference; it is to make the boundary and any translation explicit.

## Aggregates protect rules; events connect them

The lending model uses aggregates around business boundaries and lets aggregates communicate through events. The README makes the trade-off concrete: the project includes examples for immediate and eventual consistency behind a `DomainEvents` interface.

That is a useful teaching choice. Eventual consistency is often a healthy default when separate aggregates must remain independent, but it costs infrastructure and operational attention. The project starts with a simple in-process event path and also demonstrates storing and forwarding events. It does not treat asynchronous messaging as automatically more “DDD.”

The practical question is smaller: **which rule must be true at the end of this operation, and which updates can safely arrive later?** Answer that before choosing a broker, event store, or distributed transaction.

## What to borrow from it

If you are exploring DDD, do not try to copy all of this repository at once. Pick one workflow and repeat its moves:

- write the rules and exceptions in the language domain experts use;
- collect concrete examples before choosing class names;
- locate the invariant that must be enforced atomically;
- draw a boundary when a term changes meaning or a team needs autonomy;
- keep framework and persistence choices outside the core model where possible;
- use events for the facts other parts of the system genuinely need, not as a way to broadcast every internal change.

The project also uses architecture tests to keep model code from depending on Spring infrastructure. That is an important final move: an architectural diagram is a hypothesis; automated checks are how it remains true after the next hundred changes.

## Further reading: patterns worth learning next

- **Bounded Context and Context Mapping.** Read Fowler's [Bounded Context](https://martinfowler.com/bliki/BoundedContext.html) explainer, then map where terms such as “customer,” “order,” or “book” change meaning in a system you know.
- **Anti-Corruption Layer (ACL).** Microsoft’s [ACL pattern guide](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer) describes the translation boundary used when a legacy or external model would otherwise leak into yours. Keep it focused on translation—not a new home for unrelated business rules.
- **Aggregates and domain events.** Revisit the library project’s aggregate and event sections with a single consistency question in mind: what must be atomic, and what can be asynchronous?
- **The original vocabulary.** [Domain Language’s DDD resources](https://www.domainlanguage.com/ddd/) link to Eric Evans’ *Domain-Driven Design* and the shorter downloadable DDD Reference. Use the reference as a glossary; use real examples like this library to build the judgement the glossary cannot supply.

The best outcome of reading a DDD example is not adopting its directory tree. It is getting better at asking: *what are the business rules, who owns them, and how will the code make violations difficult or impossible?*
