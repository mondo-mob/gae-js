# GAE JS

> **Replaced with [MondoKit](https://mondokit.dev)**: We are excited to announce the next generation of GAE JS. Our `ESM-only` set of libraries, migrated from GAE JS and rebranded as [MondoKit](https://mondokit.dev).
> 
> You can see a [Migration guide from GAE JS](https://mondokit.dev/migration-from-gae-js) to help you move to the new libraries. Many changes are simple search/replace.
> 
> We will continue to add minor fixes and patches to this library as required.
> 
> Find  [MondoKit on GitHub](https://github.com/mondo-mob/mondokit).


Simplify building NodeJS applications on Google App Engine (GAE)

[Official documentation](https://mondo-mob.github.io/gae-js-docs)

## Package documentation

- [gae-js-core](https://mondo-mob.github.io/gae-js-docs/packages/gae-js-core.html)
- [gae-js-firestore](https://mondo-mob.github.io/gae-js-docs/packages/gae-js-firestore.html)
- [gae-js-firestore-backups](https://mondo-mob.github.io/gae-js-docs/packages/gae-js-firestore-backups.html)
- [gae-js-datastore](https://mondo-mob.github.io/gae-js-docs/packages/gae-js-datastore.html)
- [gae-js-datastore-backups](https://mondo-mob.github.io/gae-js-docs/packages/gae-js-datastore-backups.html)
- [gae-js-storage](https://mondo-mob.github.io/gae-js-docs/packages/gae-js-storage.html)
- [gae-js-tasks](https://mondo-mob.github.io/gae-js-docs/packages/gae-js-tasks.html)
- [gae-js-bigquery](https://mondo-mob.github.io/gae-js-docs/packages/gae-js-bigquery.html)
- [gae-js-google-auth](https://mondo-mob.github.io/gae-js-docs/packages/gae-js-google-auth.html)
- [gae-js-firebase-auth](https://mondo-mob.github.io/gae-js-docs/packages/gae-js-firebase-auth.html)
- [gae-js-migrations](https://mondo-mob.github.io/gae-js-docs/packages/gae-js-migrations.html)
- [gae-js-search](https://mondo-mob.github.io/gae-js-docs/packages/gae-js-gae-search.html)

## Contributing

This is a mono-repo using npm workspaces.
Publishing is done using Atlassian Changesets (https://github.com/changesets/changesets).
This helps be consistent with versioning and auto-generates changelogs.

Here's the basic flow:

1. Create one or more changesets

- Once you've made your changes, create a changeset. You can create more than one changeset for a single version.

```
npx changeset
```

- From the cli tool, choose which packages to update and if major/minor/patch update
- Enter summary for changes
- Review and commit files

2. Update package versions

- Based on the changeset configuration - this will automatically version the packages.

```
npx changeset version
```

- Commit changes

3. Build and publish

Would be nice if this was done from CI but for now we do this locally.

- Check you're running a suitable version of node/npm. If not switch and clear out old node_modules.
- Build and publish

```
npm run publish-libs
```

### Adding new packages

There's nothing automated to do this. Essentially you just need to add a new package to `/packages` folder but
these steps should save some time:

- Create new folder in `/packages`. e.g. `/packages/gae-js-new-thing`
- Copy `package.json`, `tsconfig.json`, `tsconfig.prod.json`, `jest.config.json` from one of the existing packages
- Update `package.json` to match desired name, version, dependencies, etc
- Update `tsconfig.json` to match desired project references.
- Create file src/index.ts and export some constant
- Run `npm install` from root folder
- Run `npm run build` from project folder
