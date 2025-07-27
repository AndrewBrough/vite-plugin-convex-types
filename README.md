# vite-plugin-convex-types

A Vite plugin that automatically generates TypeScript types for Convex tables and function return types, so you can import them directly without any manual setup.

## Features

- ✅ **Automatic Type Generation**: Creates type exports for all tables in your Convex schema
- ✅ **Function Return Types**: Generates return types for queries and mutations
- ✅ **Populated Document Types**: Creates types for documents with populated relations
- ✅ **Hot Reload**: Regenerates types when your schema or functions change
- ✅ **Singular Naming**: Converts plural table names to singular type names (e.g., `users` → `User`)
- ✅ **Zero Configuration**: Works out of the box with your existing Convex setup

## Installation

```bash
npm install vite-plugin-convex-types
```

## Usage

### 1. Add to your Vite config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { convexTypesPlugin } from 'vite-plugin-convex-types';

export default defineConfig({
  plugins: [
    convexTypesPlugin(),
    // ... other plugins
  ],
});
```

### 2. Import the generated types

```typescript
import type { 
  User, 
  Article, 
  UserId, 
  ArticleId,
  ArticleWithAuthor,
  GetAllArticlesReturn 
} from '../types/_generated/convex';

// Use them in your components
const ArticleCard = ({ article, onArticleClick }: {
  article: ArticleWithAuthor; // Populated article with author object
  onArticleClick: (articleId: ArticleId) => void;
}) => {
  return (
    <div onClick={() => onArticleClick(article._id)}>
      <h3>{article.title_md}</h3>
      {/* Safely access author properties */}
      {article.author && (
        <p>By {article.author.name} ({article.author.email})</p>
      )}
    </div>
  );
};
```

## Configuration

### Options

```typescript
convexTypesPlugin({
  outputPath: 'src/types/_generated/convex.ts', // Where to output types
  watch: true                                   // Watch for changes (default: true)
})
```

### Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputPath` | `string` | `'src/types/_generated/convex.ts'` | Path where generated types will be written |
| `watch` | `boolean` | `true` | Whether to watch for changes and regenerate types |

## Generated Types

The plugin automatically generates these types for each table:

### Document Types
- `User` - Document type for users table
- `Article` - Document type for articles table

### ID Types
- `UserId` - ID type for users table
- `ArticleId` - ID type for articles table

### Populated Document Types
- `ArticleWithAuthor` - Article with populated author object
- `UserWithProfile` - User with additional profile fields

### Function Return Types
- `GetAllArticlesReturn` - Return type for getAllArticles query
- `GetCurrentUserReturn` - Return type for getCurrentUser query
- `CreateArticleReturn` - Return type for createArticle mutation

### Advanced Types
```typescript
import type { 
  Doc,                    // Generic document type
  Id,                     // Generic ID type
  TableNames,             // Union of all table names
  GetDocType,             // Helper to get doc type for any table
  GetIdType,              // Helper to get ID type for any table
  AllDocTypes,            // Mapped type of all document types
  AllIdTypes,             // Mapped type of all ID types
  WithPopulatedField      // Generic type for populated fields
} from '../types/_generated/convex';

// Use generic helpers
type CustomUser = GetDocType<"users">;
type CustomUserId = GetIdType<"users">;

// Create custom populated types
type ArticleWithCustomAuthor = WithPopulatedField<Article, 'author', User | null>;
```

## How It Works

1. **Schema Detection**: The plugin reads your `convex/schema.ts` file to detect all tables
2. **Function Analysis**: Scans your Convex functions to detect queries and mutations
3. **Type Generation**: Creates type exports using the generated `convex/_generated/dataModel.d.ts`
4. **Return Type Inference**: Analyzes function code to infer return types
5. **Hot Reload**: Watches for changes and regenerates types automatically
6. **Output**: Writes types to the specified output path

## Requirements

- **Node.js**: >= 18.0.0
- **Vite**: >= 4.0.0
- **Convex**: Any version with TypeScript support

## Project Structure

Your project should have this structure:

```
your-project/
├── convex/
│   ├── schema.ts              # Your Convex schema
│   ├── _generated/            # Convex generated files
│   │   └── dataModel.d.ts
│   ├── users/
│   │   └── getCurrentUser.ts  # Your Convex functions
│   └── articles/
│       └── getAllArticles.ts
├── src/
│   └── types/
│       └── _generated/        # Plugin output (auto-generated)
│           └── convex.ts
└── vite.config.ts
```

## Benefits

- **No Manual Maintenance**: Types are always in sync with your schema and functions
- **Type Safety**: Full TypeScript support with proper field types and return types
- **Developer Experience**: IntelliSense and autocomplete for all tables and functions
- **Consistency**: Standardized naming across your codebase
- **Populated Relations**: Proper typing for documents with populated foreign keys

## Troubleshooting

### Types Not Generated

1. Make sure Convex is running: `npm run convex:dev`
2. Check that `convex/_generated/dataModel.d.ts` exists
3. Verify your schema file is properly structured

### Type Errors

1. Run `npm run convex:codegen` to regenerate Convex types
2. Restart your dev server: `npm run dev`
3. Check that table names in your schema match the generated types

### Function Return Types Not Detected

1. Make sure your functions use `export default query({...})` or `export default mutation({...})`
2. Check that the plugin can find your function files
3. Verify the function analysis patterns in the plugin code

## Examples

### Basic Usage

```typescript
// Before (manual approach)
import type { Doc, Id } from "@convex/_generated/dataModel";
type User = Doc<"users">;
type UserId = Id<"users">;
// No return types for functions

// After (with plugin)
import type { 
  User, 
  UserId, 
  GetCurrentUserReturn,
  ArticleWithAuthor 
} from "../types/_generated/convex";
// Ready to use with full type safety!
```

### With Populated Relations

```typescript
// Your Convex query returns articles with populated authors
const articles = useQuery(api.articles.getAllArticles.default);

// Use the generated type for type safety
const ArticleList = ({ articles }: { articles: GetAllArticlesReturn }) => {
  return (
    <div>
      {articles.map(article => (
        <div key={article._id}>
          <h3>{article.title_md}</h3>
          {/* TypeScript knows author is populated */}
          <p>By {article.author?.name}</p>
        </div>
      ))}
    </div>
  );
};
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/yourusername/vite-plugin-convex-types/issues) on GitHub. 