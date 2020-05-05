# Juno – release notes

This folder contains release notes of Juno.
Those notes are also posted as [Julia Discourse](https://discourse.julialang.org/c/tools/juno).

The release notes will be automatically opened when an user has updated this package
and the updated version has a release note.
Also we can manually view a release note via `julia-client: open-release-note` command.


## Developer notes

- in order for those features to work properly, release notes must be named under the rule: `major.minor.patch.md`
- markdowns are parsed and transformed into HTML by [marked](https://marked.js.org/#/README.md) npm package
- URLs should already exist somewhere; e.g. we should replace "upload://" when we use Discourse's image upload feature
