# Server template

A minimal skeleton for bootstrapping a new app inside `apps/`. Not a workspace,
not consumed at runtime. Copy and adapt.

## How to use

1. Copy the contents of `template/` to your new app directory:

   ```bash
   cp -R shared/server-template/template apps/<your-app>
   ```

2. Strip the `.template` suffix from every file:

   ```bash
   find apps/<your-app> -name '*.template' -exec sh -c \
     'mv "$1" "${1%.template}"' _ {} \;
   ```

3. Edit `package.json`, replace the `<placeholder>` strings, add real
   dependencies, and wire your routes/views.

4. Register the new workspaces in the root `package.json` (or rely on the
   existing `apps/*/backend` and `apps/*/frontend` globs).

5. Add `init/<lab-id>.sh` that exports `APP_DIR=apps/<your-app>` and a
   `LAB_ID`, then sources `init/common.sh`.

## What's in the template

- `package.json.template` — minimal `@apps/<name>` workspace manifest.
- `backend/src/server.ts.template` — boots Express, loads its lab catalogue
  via `@shared/config-loader`, serves the built frontend with an SPA fallback.
- `frontend/src/App.tsx.template` — empty React root the build can consume.
- `lab-configs.json.template` — minimal catalogue matching the
  `ParsedConfig` schema.
