import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, extname, join, resolve } from 'path';
import type { Plugin } from 'vite';

/**
 * This plugin is used to generate types and pre-configured hooks for the Convex database.
 * 
 * @param outputPath - The path to the output file.
 */
export interface ConvexTypesPluginOptions {
  outputPath?: string;
  convexPath?: string;
  importPath?: string;
}

export interface FunctionInfo {
  name: string;
  path: string;
  type: 'query' | 'mutation' | 'action';
  returnType?: string;
  args?: string;
  isDefaultExport: boolean;
}

/**
 * This plugin is used to generate types and pre-configured hooks for the Convex database.
 * 
 * @param {ConvexTypesPluginOptions} options - The options for the plugin.
 */
export function convexTypesPlugin(options: ConvexTypesPluginOptions = {}): Plugin {
  const {
    outputPath = './src/types/convex.ts',
    convexPath = 'convex',
    importPath = 'convex',
  } = options;

  let generatedContent = '';

  function extractTableNames(): string[] {
    const convexDir = resolve(process.cwd(), convexPath);
    const tableNames: string[] = [];

    // Read the schema.ts file to get table names
    const schemaPath = join(convexDir, 'schema.ts');
    if (existsSync(schemaPath)) {
      const schemaContent = readFileSync(schemaPath, 'utf-8');

      // Look for table imports and exports
      // Handle both @convex/users/users and @convex/organizations patterns
      const importRegex1 = new RegExp(`import\\s+(\\w+)\\s+from\\s+["']@${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(\\w+)/\\w+["']`, 'g');
      const importRegex2 = new RegExp(`import\\s+(\\w+)\\s+from\\s+["']@${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(\\w+)["']`, 'g');

      const importMatches1 = schemaContent.matchAll(importRegex1);
      for (const match of importMatches1) {
        const tableName = match[2]; // Extract from path like @convex/users/users
        if (tableName && !tableNames.includes(tableName)) {
          tableNames.push(tableName);
        }
      }

      const importMatches2 = schemaContent.matchAll(importRegex2);
      for (const match of importMatches2) {
        const tableName = match[2]; // Extract from path like @convex/organizations
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
    const convexDir = resolve(process.cwd(), convexPath);
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

              // Check for traditional function files (export default with query/mutation/action)
              // Skip if this is ONLY a table definition (defineTable with no functions)
              if (content.includes('export default') && content.includes('defineTable(') && !content.includes('export const')) {
                continue;
              }

              // Check for export default query/mutation/action pattern
              const defaultExportMatch = content.match(/export\s+default\s+(query|mutation|action)\s*\(/);
              if (defaultExportMatch && !content.includes('defineTable(')) {

                // Determine function type from the match
                const type = defaultExportMatch[1] as 'query' | 'mutation' | 'action';

                // Extract function name from file path
                const fullFunctionName = relativePath.replace(/\\/g, '/').replace('.ts', '');

                // Try to infer return type and args from the code
                let returnType: string | undefined;
                let args: string | undefined;

                // Extract args from the function definition
                // Look for args that are specifically in the query/mutation/action definition
                const functionStart = content.indexOf('query({') !== -1 ? 'query({' :
                  content.indexOf('mutation({') !== -1 ? 'mutation({' :
                    content.indexOf('action({') !== -1 ? 'action({' : '';

                if (functionStart) {
                  const startIndex = content.indexOf(functionStart) + functionStart.length;
                  const endIndex = content.indexOf('},', startIndex);
                  if (endIndex === -1) {
                    // Try to find the closing brace
                    const lastBraceIndex = content.lastIndexOf('}');
                    if (lastBraceIndex > startIndex) {
                      const functionBody = content.substring(startIndex, lastBraceIndex);
                      const argsMatch = functionBody.match(/args:\s*{([^}]+)}/);
                      if (argsMatch) {
                        args = argsMatch[1].trim();
                      }
                    }
                  } else {
                    const functionBody = content.substring(startIndex, endIndex);
                    const argsMatch = functionBody.match(/args:\s*{([^}]+)}/);
                    if (argsMatch) {
                      args = argsMatch[1].trim();
                    }
                  }
                }

                // Extract args from the function definition
                const argsMatch = content.match(/args:\s*{([^}]+)}/);
                if (argsMatch) {
                  // Check if this args is in a function definition, not in defineTable
                  const beforeArgs = content.substring(0, argsMatch.index);
                  const hasDefineTable = beforeArgs.includes('defineTable');
                  const hasQuery = beforeArgs.includes('query({');
                  const hasMutation = beforeArgs.includes('mutation({');
                  const hasAction = beforeArgs.includes('action({');

                  // Only use args if it's in a function definition and not in defineTable
                  if ((hasQuery || hasMutation || hasAction) && !hasDefineTable) {
                    args = argsMatch[1].trim();
                  }
                }

                // Infer return type based on function name and content
                if (type === 'query') {
                  if (fullFunctionName.includes('getAllArticles')) {
                    returnType = 'ArticleWithAuthor[]';
                  } else if (fullFunctionName.includes('getCurrent')) {
                    returnType = 'User | null';
                  } else if (fullFunctionName.includes('getAll')) {
                    returnType = 'User[]';
                  } else if (fullFunctionName.includes('get')) {
                    returnType = 'User | null';
                  }
                } else if (type === 'mutation') {
                  if (fullFunctionName.includes('create')) {
                    returnType = 'Id<"articles">';
                  } else if (fullFunctionName.includes('update')) {
                    returnType = 'void';
                  } else if (fullFunctionName.includes('delete')) {
                    returnType = 'void';
                  }
                }

                functions.push({
                  name: fullFunctionName,
                  path: relativePath,
                  type,
                  returnType,
                  args,
                  isDefaultExport: true
                });
              }

              // Check for export const getXXXX = query/mutation/action pattern
              const constExportMatches = content.matchAll(/export\s+const\s+(\w+)\s*=\s*(query|mutation|action)\s*\(/g);
              for (const match of constExportMatches) {
                const functionName = match[1];
                const type = match[2] as 'query' | 'mutation' | 'action';

                // Skip if this looks like a table definition
                if (functionName === 'default' || functionName.includes('Table')) {
                  continue;
                }

                // For flat model, the function name is just the export name
                const fullFunctionName = relativePath.replace(/\\/g, '/').replace('.ts', '') + '/' + functionName;

                // Try to infer return type and args
                let returnType: string | undefined;
                let args: string | undefined;

                // Extract args from the function definition
                // Look for args that are specifically in the query/mutation/action definition
                const functionStart = content.indexOf('query({') !== -1 ? 'query({' :
                  content.indexOf('mutation({') !== -1 ? 'mutation({' :
                    content.indexOf('action({') !== -1 ? 'action({' : '';

                if (functionStart) {
                  const startIndex = content.indexOf(functionStart) + functionStart.length;
                  const endIndex = content.indexOf('},', startIndex);
                  if (endIndex === -1) {
                    // Try to find the closing brace
                    const lastBraceIndex = content.lastIndexOf('}');
                    if (lastBraceIndex > startIndex) {
                      const functionBody = content.substring(startIndex, lastBraceIndex);
                      const argsMatch = functionBody.match(/args:\s*{([^}]+)}/);
                      if (argsMatch) {
                        args = argsMatch[1].trim();
                      }
                    }
                  } else {
                    const functionBody = content.substring(startIndex, endIndex);
                    const argsMatch = functionBody.match(/args:\s*{([^}]+)}/);
                    if (argsMatch) {
                      args = argsMatch[1].trim();
                    }
                  }
                }

                // Extract args from the function definition
                const argsMatch = content.match(/args:\s*{([^}]+)}/);
                if (argsMatch) {
                  // Check if this args is in a function definition, not in defineTable
                  const beforeArgs = content.substring(0, argsMatch.index);
                  const hasDefineTable = beforeArgs.includes('defineTable');
                  const hasQuery = beforeArgs.includes('query({');
                  const hasMutation = beforeArgs.includes('mutation({');
                  const hasAction = beforeArgs.includes('action({');

                  // Only use args if it's in a function definition and not in defineTable
                  if ((hasQuery || hasMutation || hasAction) && !hasDefineTable) {
                    args = argsMatch[1].trim();
                  }
                }

                // Infer return type based on function name
                if (type === 'query') {
                  if (functionName.includes('getCurrent')) {
                    returnType = 'Organization | null';
                  } else if (functionName.includes('getUser')) {
                    returnType = 'Organization[]';
                  }
                }

                functions.push({
                  name: fullFunctionName,
                  path: relativePath,
                  type,
                  returnType,
                  args,
                  isDefaultExport: false
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

  function generateArgsType(argsString: string): string {
    if (!argsString || argsString.trim() === '') {
      return '{}';
    }

    // Parse the args object structure
    const argTypes: string[] = [];

    // Handle multi-line validators by joining lines that don't start with a field name
    const processedLines: string[] = [];
    let currentLine = '';

    const lines = argsString.split('\n').map(line => line.trim()).filter(Boolean);

    for (const line of lines) {
      // If this line starts with a field name, it's a new field
      if (line.match(/^\w+:\s*/)) {
        if (currentLine) {
          processedLines.push(currentLine);
        }
        currentLine = line;
      } else {
        // This line continues the previous validator
        currentLine += ' ' + line;
      }
    }

    if (currentLine) {
      processedLines.push(currentLine);
    }

    for (const line of processedLines) {
      // Match patterns like: fieldName: v.validator(...)
      const match = line.match(/^(\w+):\s*(.+?)(?:,|$)$/);
      if (match) {
        const [, fieldName, validator] = match;

        const isOptional = validator.includes('v.optional(');
        const fieldType = convertValidatorToType(validator.trim());

        // Make the field optional if it's wrapped in v.optional()
        const optionalField = isOptional ? `${fieldName}?: ${fieldType}` : `${fieldName}: ${fieldType}`;
        argTypes.push(optionalField);
      }
    }

    return `{ ${argTypes.join(', ')} }`;
  }

  function convertValidatorToType(validator: string): string {
    // Handle nested validators recursively
    if (validator.includes('v.optional(')) {
      // Use a more robust regex that handles the entire optional wrapper
      // The regex needs to handle the entire validator, not just the start
      const match = validator.match(/^v\.optional\((.+)\)$/);
      if (match) {
        const innerValidator = match[1];
        // For optional fields, just return the inner type without | undefined
        // The field will be made optional at the object level
        return convertValidatorToType(innerValidator);
      }
    }

    if (validator.includes('v.union(')) {
      // Extract union members with better regex - handle whitespace
      const match = validator.match(/^v\.union\s*\((.+)\)$/);
      if (match) {
        const unionContent = match[1];
        // Split by comma, but be careful about nested parentheses
        const members = splitUnionMembers(unionContent);
        const memberTypes = members.map(member => convertValidatorToType(member.trim()));
        return memberTypes.join(' | ');
      }
    }

    if (validator.includes('v.array(')) {
      const match = validator.match(/^v\.array\((.+)\)$/);
      if (match) {
        const innerValidator = match[1];
        return `${convertValidatorToType(innerValidator)}[]`;
      }
    }

    if (validator.includes('v.object(')) {
      // For now, return a generic object type
      // In a more sophisticated implementation, you'd parse the object structure
      return 'Record<string, unknown>';
    }

    if (validator.includes('v.record(')) {
      return 'Record<string, unknown>';
    }

    // Handle basic validators
    if (validator === 'v.string()') return 'string';
    if (validator === 'v.number()') return 'number';
    if (validator === 'v.boolean()') return 'boolean';
    if (validator === 'v.bigint()') return 'bigint';
    if (validator === 'v.int64()') return 'bigint';
    if (validator === 'v.float64()') return 'number';
    if (validator === 'v.any()') return 'any';
    if (validator === 'v.null()') return 'null';

    // Handle literal values
    const literalMatch = validator.match(/^v\.literal\("([^"]+)"\)$/);
    if (literalMatch) {
      return `"${literalMatch[1]}"`;
    }

    // Handle ID types
    const idMatch = validator.match(/^v\.id\("([^"]+)"\)$/);
    if (idMatch) {
      return `Id<"${idMatch[1]}">`;
    }

    // Handle bytes
    if (validator === 'v.bytes()') return 'ArrayBuffer';

    // Default fallback
    return 'unknown';
  }

  function splitUnionMembers(unionContent: string): string[] {
    const members: string[] = [];
    let currentMember = '';
    let parenDepth = 0;

    for (let i = 0; i < unionContent.length; i++) {
      const char = unionContent[i];

      if (char === '(') {
        parenDepth++;
      } else if (char === ')') {
        parenDepth--;
      } else if (char === ',' && parenDepth === 0) {
        members.push(currentMember.trim());
        currentMember = '';
        continue;
      }

      currentMember += char;
    }

    if (currentMember.trim()) {
      members.push(currentMember.trim());
    }

    return members;
  }

  function generateHookName(functionName: string, type: string, isDefaultExport: boolean = false): string {
    if (isDefaultExport) {
      // For export default, use the filename
      const parts = functionName.split('/');
      const filename = parts[parts.length - 1];

      // Convert filename to PascalCase
      const pascalCase = filename
        .replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase())
        .replace(/^[a-z]/, letter => letter.toUpperCase());

      return `use${pascalCase}${type.charAt(0).toUpperCase() + type.slice(1)}`;
    } else {
      // For export const, use the const name
      const parts = functionName.split('/');
      const constName = parts[parts.length - 1];

      // Convert const name to PascalCase
      const pascalCase = constName
        .replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase())
        .replace(/^[a-z]/, letter => letter.toUpperCase());

      return `use${pascalCase}${type.charAt(0).toUpperCase() + type.slice(1)}`;
    }
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
      const imports = `/**
 * WARNING: This file is auto-generated by the convex-types plugin.
 * Any manual changes made to this file will be overridden on the next build.
 * To modify types, update your Convex schema and functions instead.
 */

import type {
  DataModel,
  Doc,
  Id,
  TableNames,
} from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { useQuery, useMutation } from "convex/react";

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

      // Generate argument types for functions
      const argTypeExports = functions
        .filter(func => func.args && func.args.trim() !== '')
        .map(func => {
          const functionName = func.name.split('/').pop() || func.name;
          const pascalCase = functionName.charAt(0).toUpperCase() + functionName.slice(1);
          const argsType = generateArgsType(func.args!);
          return `export type ${pascalCase}Args = ${argsType};`;
        })
        .join('\n');

      // Generate pre-configured hooks
      const hookExports = functions
        .map(func => {
          const hookName = generateHookName(func.name, func.type, func.isDefaultExport);
          const apiPath = func.name.replace(/\//g, '.');
          const functionName = func.name.split('/').pop() || func.name;
          const pascalCase = functionName.charAt(0).toUpperCase() + functionName.slice(1);

          // Check if function has args
          const hasArgs = func.args && func.args.trim() !== '';

          console.log(`Generating hook for ${func.name}, type: ${func.type}, hasArgs: ${hasArgs}`);

          if (func.type === 'query') {
            if (func.isDefaultExport) {
              // For export default, use .default
              if (hasArgs) {
                return `export const ${hookName} = (args: ${pascalCase}Args | "skip") => useQuery(api.${apiPath}.default, args);`;
              } else {
                return `export const ${hookName} = () => useQuery(api.${apiPath}.default);`;
              }
            } else {
              // For export const, don't use .default
              const functionName = func.name.split('/').pop();
              const tableName = func.name.split('/')[0];
              if (hasArgs) {
                return `export const ${hookName} = (args: ${pascalCase}Args | "skip") => useQuery(api.${tableName}.${functionName}, args);`;
              } else {
                return `export const ${hookName} = () => useQuery(api.${tableName}.${functionName});`;
              }
            }
          } else if (func.type === 'mutation') {
            // For mutations, always generate without args (as requested)
            console.log(`🔧 Generating mutation hook for ${func.name} without args`);
            if (func.isDefaultExport) {
              // For export default, use .default
              return `export const ${hookName} = () => useMutation(api.${apiPath}.default);`;
            } else {
              // For export const, don't use .default
              const functionName = func.name.split('/').pop();
              const tableName = func.name.split('/')[0];
              return `export const ${hookName} = () => useMutation(api.${tableName}.${functionName});`;
            }
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');

      console.log('🔧 Generated hook exports:', hookExports);

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
`;

      generatedContent = imports +
        '\n// Automatically generated document type exports\n' + docExports +
        '\n\n// Automatically generated ID type exports\n' + idExports +
        '\n\n// Function argument types\n' + argTypeExports +
        '\n\n// Pre-configured hooks for queries and mutations\n' + hookExports +
        commonTypes + footer;

      // Write the generated file
      const outputDir = dirname(resolve(process.cwd(), outputPath));
      if (!existsSync(outputDir)) {
        const { mkdirSync } = await import('fs');
        mkdirSync(outputDir, { recursive: true });
      }

      writeFileSync(resolve(process.cwd(), outputPath), generatedContent);
      console.log(`✅ Generated Convex types and hooks at ${outputPath}`);
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

export default convexTypesPlugin;