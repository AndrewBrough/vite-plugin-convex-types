# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2025-07-29

### Added
- **Pre-configured React Hooks**: Auto-generated hooks that eliminate the need for `.default` syntax when using Convex queries and mutations
- **Enhanced Type Generation**: Improved function argument types and return type inference
- **Better Import Management**: Cleaner imports from `@src/types/convex` with all necessary types and hooks
- **Organization Support**: Added support for organization-related types and queries
- **Improved Type Safety**: Better TypeScript intellisense for function arguments, return types, and error handling

### Features
- **Auto-generated Hooks**: Functions like `getAllArticles.ts` automatically generate `useGetAllArticlesQuery` hooks
- **Consistent API**: All hooks follow the same pattern for queries and mutations
- **Zero Configuration**: Hooks are automatically updated when new Convex functions are added
- **Type-Safe Arguments**: Proper TypeScript support for function arguments and return types

### Generated Hooks Include
- Query hooks: `useGetAllArticlesQuery`, `useGetAllUsersQuery`, `useGetCurrentUserQuery`, `useGetOrganizationsForUserQuery`
- Mutation hooks: `useCreateArticleMutation`, `useUpdateCurrentUserMutation`
- All hooks handle the `.default` syntax automatically
- Proper TypeScript types for arguments and return values

### Usage Examples
```tsx
// Before (Old Way)
import { api } from "@convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
const articles = useQuery(api.articles.getAllArticles.default, { sort: "desc" });
const createArticle = useMutation(api.articles.createArticle.default);

// After (New Way)
import { useGetAllArticlesQuery, useCreateArticleMutation } from "@src/types/convex";
const articles = useGetAllArticlesQuery({ sort: "desc" });
const createArticle = useCreateArticleMutation();
```

### Breaking Changes
- None - this is a feature enhancement that maintains backward compatibility

### Documentation
- Added comprehensive documentation for the new hooks system
- Updated usage examples to demonstrate the new simplified API
- Added troubleshooting guide for common hook usage patterns
## [1.0.1] - 2025-07-27

### Added
- **Repository links**: Repo links were missing
- **Documentation updates**: Some README and CHANGELOG information was inaccurate from the 1.0.0 release. Corrected.
- **Convex root config**: Added config for convex directory if you've installed convex somewhere other than in the root of your project at `convex/`
- **Configurable import paths**: Added support for custom import path prefixes in schema files

### Configuration Options
- `convexPath`: Customize what folder to look in for convex schema and functions (default: `"convex"`)
- `importPath`: Customize the import path prefix for table imports in schema (default: `"@convex"`)

## [1.0.0] - 2025-07-27

### Added
- **Initial Release**: First public release of vite-plugin-convex-types
- **Automatic Type Generation**: Creates TypeScript type exports for all tables in your Convex schema
- **Function Return Type Inference**: Automatically generates return types for queries and mutations
- **Populated Document Types**: Creates types for documents with populated relations (e.g., `ArticleWithAuthor`)
- **Hot Reload Support**: Regenerates types when your convex schema or functions change during development
- **Singular Naming Convention**: Converts plural table names to singular type names (e.g., `users` → `User`)
- **Zero Configuration Setup**: Works out of the box with existing Convex projects
- **Advanced Type Helpers**: Provides generic types like `WithPopulatedField`, `GetDocType`, `GetIdType`

### Features
- **Schema Detection**: Reads `convex/schema.ts` to detect all tables
- **Function Analysis**: Scans Convex functions to detect queries, mutations, and actions
- **Type Export Generation**: Creates comprehensive type exports using Convex's generated `dataModel.d.ts`
- **Return Type Inference**: Analyzes function code to infer return types based on patterns
- **Directory Structure Support**: Works with both flat and nested Convex function structures

### Technical Details
- **Node.js Support**: Requires Node.js >= 18.0.0
- **Vite Integration**: Compatible with Vite >= 4.0.0
- **TypeScript Support**: Full TypeScript integration with proper type definitions
- **Convex Compatibility**: Works with any Convex version that supports TypeScript

### Generated Types Include
- Document types for each table (e.g., `User`, `Article`)
- ID types for each table (e.g., `UserId`, `ArticleId`)
- Populated document types (e.g., `ArticleWithAuthor`)
- Function return types (e.g., `GetAllArticlesReturn`)
- Generic helper types for advanced usage
- Mapped types for all tables (`AllDocTypes`, `AllIdTypes`)

### Configuration Options
- `outputPath`: Customize where generated types are written (default: `'src/types/_generated/convex.ts'`)

### Known Issues
- Function return type inference is based on pattern matching and may not catch all cases
- Requires Convex to be running (`npx convex dev`) for initial type generation
- Generated files must not be manually edited as they will be overridden (you could always extend them yourself in another file in your app)

### Documentation
- Complete README with usage examples and configuration options
- Troubleshooting guide for common issues
- API reference for all generated types 