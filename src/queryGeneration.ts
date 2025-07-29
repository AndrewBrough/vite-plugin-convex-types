import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, extname, join, resolve } from 'path';

interface FunctionInfo {
  name: string;
  path: string;
  type: 'query' | 'mutation' | 'action';
  returnType?: string;
}

interface QueryGenerationOptions {
  outputPath: string;
  convexPath: string;
  importPath: string;
  typesPath?: string;
}

/**
 * Extracts function information from Convex files
 */
function extractFunctionInfo(convexPath: string): FunctionInfo[] {
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

/**
 * Converts a function path to a camelCase hook name
 */
function generateHookName(functionPath: string, type: 'query' | 'mutation' | 'action'): string {
  // Convert path like "users/getAll" to "useGetAllUsers"
  const parts = functionPath.split('/');
  const functionName = parts[parts.length - 1];
  const tableName = parts[0];

  // Convert function name to camelCase
  const camelCaseFunction = functionName.charAt(0).toUpperCase() + functionName.slice(1);

  // Convert table name to singular and capitalize
  const singularTable = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
  const capitalizedTable = singularTable.charAt(0).toUpperCase() + singularTable.slice(1);

  // Add appropriate prefix based on type
  const prefix = type === 'query' ? 'use' : type === 'mutation' ? 'use' : 'use';
  const suffix = type === 'mutation' ? 'Mutation' : type === 'action' ? 'Action' : '';

  return `${prefix}${camelCaseFunction}${capitalizedTable}${suffix}`;
}

/**
 * Extracts return types from the generated convex.ts file
 */
function extractReturnTypes(typesPath: string): Record<string, string> {
  const returnTypes: Record<string, string> = {};

  try {
    if (existsSync(typesPath)) {
      const content = readFileSync(typesPath, 'utf-8');

      // Look for return type exports
      const returnTypeRegex = /export type (\w+Return) = ([^;]+);/g;
      let match;

      while ((match = returnTypeRegex.exec(content)) !== null) {
        returnTypes[match[1]] = match[2];
      }
    }
  } catch (error) {
    console.warn('Could not read types file for return types:', error);
  }

  return returnTypes;
}

/**
 * Generates React Query hooks for Convex functions
 */
export async function generateQueryHooks(options: QueryGenerationOptions): Promise<void> {
  const { outputPath, convexPath, importPath, typesPath = './src/types/convex.ts' } = options;

  try {
    // Check if Convex generated files exist
    const dataModelPath = resolve(process.cwd(), 'convex/_generated/dataModel.d.ts');

    if (!existsSync(dataModelPath)) {
      console.warn('Convex dataModel.d.ts not found. Run "npx convex dev" first.');
      return;
    }

    // Extract function information
    const functions = extractFunctionInfo(convexPath);
    const returnTypes = extractReturnTypes(typesPath);

    if (functions.length === 0) {
      console.warn('No Convex functions found.');
      return;
    }

    console.log(`Found functions: ${functions.map(f => f.name).join(', ')}`);

    // Generate the hooks file content
    const imports = `/**
 * WARNING: This file is auto-generated by the convex-types plugin.
 * Any manual changes made to this file will be overridden on the next build.
 * To modify hooks, update your Convex functions instead.
 */

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "${importPath}/_generated/api";
import type {
  ArticleWithAuthor,
  User,
  Article,
  GetAllArticlesReturn,
} from "./convex";

`;

    // Generate hooks for each function
    const hooks = functions.map(func => {
      const hookName = generateHookName(func.name, func.type);
      const functionPath = func.name.split('/').join('.');

      // Determine the appropriate hook type and return type
      let hookType: string;
      let returnType: string;
      let hookParams: string;

      if (func.type === 'query') {
        hookType = 'useQuery';

        // Try to find a matching return type
        const functionName = func.name.split('/').pop() || func.name;
        const pascalCase = functionName.charAt(0).toUpperCase() + functionName.slice(1);
        const returnTypeName = `${pascalCase}Return`;

        returnType = returnTypes[returnTypeName] || func.returnType || 'any';
        hookParams = `api.${functionPath}`;
      } else if (func.type === 'mutation') {
        hookType = 'useMutation';
        returnType = 'any';
        hookParams = `api.${functionPath}`;
      } else {
        hookType = 'useAction';
        returnType = 'any';
        hookParams = `api.${functionPath}`;
      }

      return `/**
 * Auto-generated hook for ${func.name}
 * @returns ${hookType} hook for ${func.name}
 */
export const ${hookName} = () => ${hookType}<${returnType}>(${hookParams});`;
    }).join('\n\n');

    const footer = `

// Auto-generated on ${new Date().toISOString()}
`;

    const generatedContent = imports + hooks + footer;

    // Write the generated file
    const outputDir = dirname(resolve(process.cwd(), outputPath));
    if (!existsSync(outputDir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(resolve(process.cwd(), outputPath), generatedContent);
    console.log(`✅ Generated Convex query hooks at ${outputPath}`);
  } catch (error) {
    console.error('Error generating Convex query hooks:', error);
  }
}
