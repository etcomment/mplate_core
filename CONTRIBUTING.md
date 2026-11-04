# Contributing to mplate

Thanks for helping. mplate is maintained on limited time, so small, focused pull requests get reviewed fastest.

## Before you start

- Open an issue for anything larger than a bug fix or a new template, so we can agree on the approach.
- Read [`project/conventions.md`](project/conventions.md) for the code style and [`docs/authoring-templates.md`](docs/authoring-templates.md) for templates.

## Development

```bash
npm install
npm test          # unit and layout tests
npm run typecheck
npm run build
npm run gallery   # regenerates docs/templates.md and docs/gallery/
```

Node ≥ 20. The runtime has **zero dependencies**; please keep it that way. Dev dependencies are fine.

## Templates

New templates are very welcome, under one condition: they must be **your original design**. Do not submit templates copied, traced or closely adapted from commercial slide packs, company templates or other products. Pull requests adding a template must state in the description that the design is original.

## Sign-off (DCO)

Contributions are accepted under the [Developer Certificate of Origin 1.1](https://developercertificate.org/). Sign every commit:

```bash
git commit -s -m "feat(templates): add timeline:swimlanes"
```

## Commit messages

`type(scope): summary` in English, e.g. `fix(dsl): accept tabs in indentation`. Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`.

## Licence

By contributing you agree that your contributions are licensed under the Apache License 2.0.
