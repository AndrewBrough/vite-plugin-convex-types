# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-19

### Added
- **Initial Release**: First public release of vite-plugin-convex-types
- **Automatic Type Generation**: Creates TypeScript type exports for all tables in your Convex schema
- **Function Return Type Inference**: Automatically generates return types for queries and mutations
- **Populated Document Types**: Creates types for documents with populated relations (e.g., `ArticleWithAuthor`)
- **Hot Reload Support**: Regenerates types when your schema or functions change during development
- **Singular Naming Convention**: Converts plural table names to singular type names (e.g., `users` → `User`)
- **Zero Configuration Setup**: Works out of the box with existing Convex projects
- **Advanced Type Helpers**: Provides generic types like `WithPopulatedField`, `GetDocType`, `GetIdType`
- **File Watching**: Monitors Convex directory for changes and regenerates types automatically
- **Warning Comments**: Auto-generated files include clear warnings about manual edits being overridden

### Features
- **Schema Detection**: Reads `convex/schema.ts` to detect all tables
- **Function Analysis**: Scans Convex functions to detect queries, mutations, and actions
- **Type Export Generation**: Creates comprehensive type exports using Convex's generated `dataModel.d.ts`
- **Return Type Inference**: Analyzes function code to infer return types based on patterns
- **Directory Structure Support**: Works with both flat and nested Convex function structures
- **Error Handling**: Graceful handling of missing files and directories
- **Console Logging**: Helpful feedback during type generation process

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

### Breaking Changes
- None (initial release)

### Migration Guide
- No migration required (initial release)

### Known Issues
- Function return type inference is based on pattern matching and may not catch all cases
- Requires Convex to be running (`npx convex dev`) for initial type generation
- Generated files must not be manually edited as they will be overridden

### Documentation
- Complete README with usage examples and configuration options
- Troubleshooting guide for common issues
- API reference for all generated types 