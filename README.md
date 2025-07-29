# Vite Plugin Convex Types

A Vite plugin that automatically generates TypeScript types and React Query hooks for your Convex database.

## Features

- **Type Generation**: Automatically generates TypeScript types for your Convex tables and functions
- **Query Hook Generation**: Optionally generates React Query hooks for cleaner frontend code
- **Hot Reload**: Watches for changes in your Convex files and regenerates types automatically

## Installation

```bash
npm install vite-plugin-convex-types
```

## Usage

### Basic Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { convexTypesPlugin } from 'vite-plugin-convex-types';

export default defineConfig({
  plugins: [
    convexTypesPlugin({
      outputPath: './src/types/convex.ts',
      convexPath: 'convex',
      importPath: 'convex',
    }),
  ],
});
```

### With Query Hook Generation

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { convexTypesPlugin } from 'vite-plugin-convex-types';

export default defineConfig({
  plugins: [
    convexTypesPlugin({
      outputPath: './src/types/convex.ts',
      convexPath: 'convex',
      importPath: 'convex',
      generateQueries: true,
      queriesPath: './src/types/convexQueries.ts',
    }),
  ],
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputPath` | `string` | `'./src/types/convex.ts'` | Path where generated types will be saved |
| `convexPath` | `string` | `'convex'` | Path to your Convex directory |
| `importPath` | `string` | `'convex'` | Import path for Convex modules |
| `generateQueries` | `boolean` | `false` | Whether to generate React Query hooks |
| `queriesPath` | `string` | `'./src/types/convexQueries.ts'` | Path where generated query hooks will be saved |

## Generated Files

### Types File (`convex.ts`)

The plugin generates TypeScript types for your Convex tables and functions:

```typescript
// Example generated types
export type User = DocTypes["users"];
export type UserId = IdTypes["users"];
export type Article = DocTypes["articles"];
export type ArticleId = IdTypes["articles"];

// Function return types
export type GetAllArticlesReturn = ArticleWithAuthor[];

// Common return types for populated documents
export type ArticleWithAuthor = Omit<Article, 'author'> & {
  author: User | null;
};
```

### Query Hooks File (`convexQueries.ts`)

When `generateQueries: true` is enabled, the plugin generates React Query hooks:

```typescript
// Example generated hooks
export const useGetAllArticles = () => useQuery<ArticleWithAuthor[]>(api.articles.getAll);
export const useCreateUserMutation = () => useMutation<any>(api.users.create);
export const useUpdateUserAction = () => useAction<any>(api.users.update);
```

## Hook Naming Convention

The plugin automatically generates hook names based on your function paths:

- Function: `users/getAll` → Hook: `useGetAllUsers`
- Function: `articles/create` → Hook: `useCreateArticleMutation`
- Function: `users/update` → Hook: `useUpdateUserAction`

## Usage in Components

```typescript
// Before (manual)
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';

const articles = useQuery(api.articles.getAll.default);

// After (auto-generated)
import { useGetAllArticles } from './types/convexQueries';

const articles = useGetAllArticles();
```

## Requirements

- Convex project with `npx convex dev` running
- TypeScript configuration
- React Query (if using query generation)

## Development

Make sure to run `npx convex dev` first to generate the necessary Convex files before using this plugin. 