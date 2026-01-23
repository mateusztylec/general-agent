
# Env
There are 3 types of env variables:
- Server-side
- Client-side
- Predefined

Those predefined env must be always refered via process.env. For example:
```ts
process.env.SITE_URL
```

## Server
For server-side code, we use the `src/lib/env-server.ts` file.

## Client
For client-side code, we use the `src/lib/env-client.ts` file.

## Predefined
There are some predefined env variables in Next.js that we can use:
- `NODE_ENV` - determine the environment of the app. Can be `development`, `production` or `test`.
- `SITE_URL` - the URL of the app. Can be `http://localhost:3000` or `https://domain.com`.


## Library
For managing env variables, we use library `@t3-oss/env-nextjs` which is theo library for next.js (https://github.com/t3-oss/t3-env).
We cannot put 'server-only' in the file because it's not a server-side file. We can safely put this file in the client-side file. The only donwside is that in the developer tools someone gonna see names of the server variables. 

## Loading and validation

- Next.js auto-loads `.env.local`, `.env`, `.env.development`, `.env.production` based on `next dev/build/start`.
- `@t3-oss/env-nextjs` does not load files; it reads from `process.env` and validates with Zod via `runtimeEnv` in `src/lib/env-server.ts` and `src/lib/env-client.ts`.
- Only `NEXT_PUBLIC_*` vars are exposed to the browser; others are server-only.
- After editing `.env*` files, restart the dev server.
