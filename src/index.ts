import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, extname, join, resolve } from 'path';
import type { Plugin } from 'vite';

interface ConvexTypesPluginOptions {
  outputPath?: string;
  watch?: boolean;
}

interface FunctionInfo {
  name: string;
  path: string;
  type: 'query' | 'mutation' | 'action';
  returnType?: string;
}

export function convexTypesPlugin(options: ConvexTypesPluginOptions = {}): Plugin {
  const {
    outputPath = 'src/types/convex.ts',
    watch = true
  } = options;

  let generatedContent = '';

  function extractTableNames(): string[] {
    const convexDir = resolve(process.cwd(), 'convex');
    const tableNames: string[] = [];

    // Read the schema.ts file to get table names
    const schemaPath = join(convexDir, 'schema.ts');
    if (existsSync(schemaPath)) {
      const schemaContent = readFileSync(schemaPath, 'utf-8');

      // Look for table imports and exports
      const importMatches = schemaContent.matchAll(/import\s+(\w+)\s+from\s+["']@convex\/(\w+)\/\w+["']/g);
      for (const match of importMatches) {
        const tableName = match[2]; // Extract from path like @convex/users/users
        if (tableName && !tableNames.includes(tableName)) {
          tableNames.push(tableName);
        }
      }

      // Also look for direct table definitions in the schema
      const tableMatches = schemaContent.matchAll(/(\w+):\s*\w+/g);
      for (const match of tableMatches) {
        const tableName = match[1];
        if (tableName && !tableNames.includes(tableName)) {
          tableNames.push(tableName);
        }
      }
    }

    // Fallback: scan convex directory for table folders
    if (tableNames.length === 0) {
      try {
        const entries = readdirSync(convexDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('_') && entry.name !== 'migrations') {
            tableNames.push(entry.name);
          }
        }
      } catch (error) {
        console.warn('Could not scan convex directory:', error);
      }
    }

    return tableNames;
  }

  function extractFunctionInfo(): FunctionInfo[] {
    const convexDir = resolve(process.cwd(), 'convex');
    const functions: FunctionInfo[] = [];

    function scanDirectory(dirPath: string, basePath: string = '') {
      try {
        const entries = readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dirPath, entry.name);
          const relativePath = join(basePath, entry.name);

          if (entry.isDirectory() && !entry.name.startsWith('_') && entry.name !== 'migrations') {
            scanDirectory(fullPath, relativePath);
          } else if (entry.isFile() && extname(entry.name) === '.ts' && entry.name !== 'schema.ts') {
            try {
              const content = readFileSync(fullPath, 'utf-8');

              // Check if it's a Convex function
              if (content.includes('export default') &&
                (content.includes('query({') || content.includes('mutation({') || content.includes('action({'))) {

                // Determine function type
                let type: 'query' | 'mutation' | 'action' = 'query';
                if (content.includes('mutation({')) type = 'mutation';
                else if (content.includes('action({')) type = 'action';

                // Extract function name from file path
                const fullFunctionName = relativePath.replace(/\\/g, '/').replace('.ts', '');

                // Try to infer return type from the code
                let returnType: string | undefined;

                if (type === 'query') {
                  // Look for return statements to infer type
                  if (content.includes('articlesWithAuthors')) {
                    returnType = 'ArticleWithAuthor[]';
                  } else if (content.includes('return user')) {
                    returnType = 'User | null';
                  } else if (content.includes('return articles')) {
                    returnType = 'Article[]';
                  } else if (content.includes('return users')) {
                    returnType = 'User[]';
                  }
                }

                functions.push({
                  name: fullFunctionName,
                  path: relativePath,
                  type,
                  returnType
                });
              }
            } catch (error) {
              console.warn(`Could not read function file ${fullPath}:`, error);
            }
          }
        }
      } catch (error) {
        console.warn(`Could not scan directory ${dirPath}:`, error);
      }
    }

    scanDirectory(convexDir);
    return functions;
  }

  async function generateTypes() {
    try {
      // Check if Convex generated files exist
      const dataModelPath = resolve(process.cwd(), 'convex/_generated/dataModel.d.ts');

      if (!existsSync(dataModelPath)) {
        console.warn('Convex dataModel.d.ts not found. Run "npx convex dev" first.');
        return;
      }

      // Extract table names and function info
      const tableNames = extractTableNames();
      const functions = extractFunctionInfo();

      if (tableNames.length === 0) {
        console.warn('No table names found. Check your Convex schema.');
        return;
      }

      console.log(`Found tables: ${tableNames.join(', ')}`);
      console.log(`Found functions: ${functions.map(f => f.name).join(', ')}`);

      // Generate the type file content
      const imports = `import type {
  DataModel,
  Doc,
  Id,
  TableNames,
} from "@convex/_generated/dataModel";

// Export the base types
export type {
  DataModel,
  Doc,
  Id,
  TableNames,
};

// Create mapped types for all tables
type DocTypes = {
  [K in TableNames]: Doc<K>;
};

type IdTypes = {
  [K in TableNames]: Id<K>;
};

`;

      const docExports = tableNames
        .map(tableName => {
          // Convert plural table name to singular type name
          const singularName = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
          const pascalCase = singularName.charAt(0).toUpperCase() + singularName.slice(1);
          return `export type ${pascalCase} = DocTypes["${tableName}"];`;
        })
        .join('\n');

      const idExports = tableNames
        .map(tableName => {
          // Convert plural table name to singular type name
          const singularName = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
          const pascalCase = singularName.charAt(0).toUpperCase() + singularName.slice(1);
          return `export type ${pascalCase}Id = IdTypes["${tableName}"];`;
        })
        .join('\n');

      // Generate function return types
      const functionReturnTypes = functions
        .filter(f => f.returnType)
        .map(f => {
          const functionName = f.name.split('/').pop() || f.name;
          const pascalCase = functionName.charAt(0).toUpperCase() + functionName.slice(1);
          return `export type ${pascalCase}Return = ${f.returnType};`;
        })
        .join('\n');

      // Generate common return types based on patterns
      const commonTypes = `
// Common return types for populated documents
export type ArticleWithAuthor = Omit<Article, 'author'> & {
  author: User | null;
};

export type UserWithProfile = User & {
  // Add any additional populated fields here
};

// Function return types
${functionReturnTypes}

// Generic types for populated documents
export type WithPopulatedField<T, K extends keyof T, P> = Omit<T, K> & {
  [key in K]: P;
};

// Example: Article with populated author
export type ArticleWithPopulatedAuthor = WithPopulatedField<Article, 'author', User | null>;
`;

      const footer = `

// Export the mapped types for advanced usage
export type AllDocTypes = DocTypes;
export type AllIdTypes = IdTypes;

// Helper type to get the document type for any table
export type GetDocType<T extends TableNames> = DocTypes[T];

// Helper type to get the ID type for any table
export type GetIdType<T extends TableNames> = IdTypes[T];

// Auto-generated on ${new Date().toISOString()}
`;

      generatedContent = imports +
        '\n// Automatically generated document type exports\n' + docExports +
        '\n\n// Automatically generated ID type exports\n' + idExports +
        commonTypes + footer;

      // Write the generated file
      const outputDir = dirname(resolve(process.cwd(), outputPath));
      if (!existsSync(outputDir)) {
        const { mkdirSync } = await import('fs');
        mkdirSync(outputDir, { recursive: true });
      }

      writeFileSync(resolve(process.cwd(), outputPath), generatedContent);
      console.log(`✅ Generated Convex types at ${outputPath}`);
    } catch (error) {
      console.error('Error generating Convex types:', error);
    }
  }

  return {
    name: 'convex-types',
    buildStart() {
      generateTypes();
    },
    configureServer(server) {
      if (watch) {
        // Watch for changes in the convex directory
        server.watcher.add('convex/**/*.ts');
        server.watcher.on('change', (file) => {
          if (file.includes('convex/_generated/dataModel.d.ts') ||
            file.includes('convex/schema.ts') ||
            file.includes('convex/') && file.endsWith('.ts')) {
            console.log('🔄 Convex files changed, regenerating types...');
            generateTypes();
          }
        });
      }
    },
    handleHotUpdate({ file }) {
      if (file.includes('convex/_generated/dataModel.d.ts') ||
        file.includes('convex/schema.ts')) {
        console.log('🔄 Convex schema changed, regenerating types...');
        generateTypes();
        return [];
      }
    }
  };
} 