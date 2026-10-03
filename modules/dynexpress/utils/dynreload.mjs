// dynreload.mjs
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

class Dynreload {
  constructor(options = {}) {
    this.options = {
      silent: options.silent ?? false,
      cache: new Map(),
      watchedFiles: new Map(),
      routeUpdateCallbacks: new Map(),
      lastValidModules: new Map(), // Store last valid module versions
      dependencyGraph: new Map(), // Track dependencies between modules
      moduleParents: new Map(), // Track which modules import this module
      maxDepth: options.maxDepth ?? 1, // Default depth is 1 (only the main module)
      fileExtensions: options.fileExtensions ?? ['.js', '.mjs', '.cjs'], // File extensions to watch
      forceWatchDependencies: options.forceWatchDependencies ?? true // Always watch dependencies
    };
  }

  #validateRouteStructure(routes) {
    if (!Array.isArray(routes)) {
      throw new Error('Routes must be an array');
    }

    const validMethods = new Set(['get', 'post', 'put', 'delete', 'patch', 'options', 'head']);

    for (const route of routes) {
      // Check required properties
      if (!route.method || !route.path || !route.handler) {
        throw new Error('Each route must have method, path, and handler properties');
      }

      // Validate method
      if (!validMethods.has(route.method.toLowerCase())) {
        throw new Error(`Invalid HTTP method: ${route.method}`);
      }

      // Validate path
      if (typeof route.path !== 'string' || !route.path.startsWith('/')) {
        throw new Error(`Invalid path: ${route.path}`);
      }

      // Validate handler
      if (typeof route.handler !== 'function') {
        throw new Error('Route handler must be a function');
      }
    }

    return true;
  }

  async #tryImportModule(fileUrl, timestamp) {
    try {
      const module = await import(`${fileUrl}?update=${timestamp}`);
      const routes = module.default || module;

      // Validate route structure if it's a routes module
      if (Array.isArray(routes)) {
        // Optional validation
        // this.#validateRouteStructure(routes);
      }

      return { success: true, routes, module };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Extract imports from file content to track dependencies
   * Uses a simple regex pattern to find imports instead of a full parser
   */
  async #extractDependencies(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const dependencies = [];
      const dirName = path.dirname(filePath);
      
      // Regex to match ES imports (import X from 'path')
      const importRegex = /import(?:["'\s]*([\w*${}\n\r\t, ]+)from\s*)?["'\s]["'\s](.*?)["'\s]/g;
      // Regex to match dynamic imports (import('path'))
      const dynamicImportRegex = /import\(["'](.*?)["']\)/g;
      // Regex to match require statements
      const requireRegex = /require\(["'](.*?)["']\)/g;
      
      // Process all types of imports
      const processMatches = (regex, content) => {
        let match;
        while ((match = regex.exec(content)) !== null) {
          const importPath = match[match.length - 1]; // Last group contains the path
          
          // Skip built-in modules and node_modules
          if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
            continue;
          }
          
          // Process the import path
          try {
            // Resolve the absolute path
            let resolvedPath = path.resolve(dirName, importPath);
            
            // Add file extension if not present
            if (!path.extname(resolvedPath)) {
              let found = false;
              
              for (const ext of this.options.fileExtensions) {
                const testPath = `${resolvedPath}${ext}`;
                if (fs.existsSync(testPath)) {
                  resolvedPath = testPath;
                  found = true;
                  break;
                }
              }
              
              // If direct file not found, check for index files
              if (!found) {
                for (const ext of this.options.fileExtensions) {
                  const indexPath = path.join(resolvedPath, `index${ext}`);
                  if (fs.existsSync(indexPath)) {
                    resolvedPath = indexPath;
                    found = true;
                    break;
                  }
                }
              }
              
              // Skip if no valid file found
              if (!found) continue;
            }
            
            // Only add if the file exists
            if (fs.existsSync(resolvedPath) && !dependencies.includes(resolvedPath)) {
              dependencies.push(resolvedPath);
            }
          } catch (err) {
            if (!this.options.silent) {
              console.warn(`Could not resolve dependency: ${importPath} in ${filePath}`);
            }
          }
        }
      };
      
      // Process all types of imports
      processMatches(importRegex, fileContent);
      processMatches(dynamicImportRegex, fileContent);
      processMatches(requireRegex, fileContent);
      
      return dependencies;
    } catch (error) {
      if (!this.options.silent) {
        console.error(`Error extracting dependencies from ${filePath}:`, error);
      }
      return [];
    }
  }

  /**
   * Update the dependency graph for all modules
   */
  async #updateDependencyGraph(rootPath, currentDepth = 1) {
    if (currentDepth > this.options.maxDepth && !this.options.forceWatchDependencies) {
      return;
    }
    
    // Don't process the same file multiple times in recursion
    if (currentDepth > 1 && this.options.processedInCurrentUpdate?.has(rootPath)) {
      return;
    }
    
    // Initialize processing set if first call
    if (currentDepth === 1) {
      this.options.processedInCurrentUpdate = new Set();
    }
    
    // Mark this file as processed
    this.options.processedInCurrentUpdate.add(rootPath);
    
    // Extract dependencies from this file
    const dependencies = await this.#extractDependencies(rootPath);
    
    // Update dependency graph
    this.options.dependencyGraph.set(rootPath, dependencies);
    
    // Update parent references for each dependency
    for (const dep of dependencies) {
      if (!this.options.moduleParents.has(dep)) {
        this.options.moduleParents.set(dep, new Set());
      }
      this.options.moduleParents.get(dep).add(rootPath);
    }
    
    // Process dependencies recursively
    const shouldProcessDeps = currentDepth < this.options.maxDepth || this.options.forceWatchDependencies;
    
    if (shouldProcessDeps) {
      for (const dependency of dependencies) {
        await this.#updateDependencyGraph(dependency, currentDepth + 1);
      }
    }
    
    // Clean up processing set if this is the root call
    if (currentDepth === 1) {
      delete this.options.processedInCurrentUpdate;
    }
  }

  /**
   * Find all modules that depend on the changed file
   */
  #findAffectedModules(changedFilePath) {
    const affectedModules = new Set([changedFilePath]);
    
    // Create a queue for breadth-first search
    const queue = [changedFilePath];
    const processed = new Set(queue);
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      // Find direct parents (modules that import this one)
      const parents = this.options.moduleParents.get(current) || new Set();
      
      for (const parent of parents) {
        if (!processed.has(parent)) {
          affectedModules.add(parent);
          queue.push(parent);
          processed.add(parent);
        }
      }
      
      // Also check the traditional dependency graph for completeness
      for (const [modulePath, dependencies] of this.options.dependencyGraph.entries()) {
        if (dependencies.includes(current) && !processed.has(modulePath)) {
          affectedModules.add(modulePath);
          queue.push(modulePath);
          processed.add(modulePath);
        }
      }
    }
    
    return affectedModules;
  }

  /**
   * Reload a specific module
   */
  async #reloadModule(filePath) {
    try {
      const absolutePath = path.resolve(filePath);
      const fileUrl = pathToFileURL(absolutePath).href;
      const timestamp = Date.now();
      
      // Try importing and validating the updated module
      const importResult = await this.#tryImportModule(fileUrl, timestamp);

      if (!importResult.success) {
        if (!this.options.silent) {
          console.error(`Invalid module in ${filePath}. Keeping previous version.`);
          console.error('Error:', importResult.error.message);
        }
        return { success: false, error: importResult.error };
      }

      const newModule = importResult.routes;

      // Update cache and last valid module
      const stats = fs.statSync(absolutePath);
      const moduleInfo = {
        module: newModule,
        lastModified: stats.mtime,
        filePath: absolutePath
      };

      this.options.cache.set(absolutePath, moduleInfo);
      this.options.lastValidModules.set(absolutePath, moduleInfo);

      return { success: true, module: newModule };
    } catch (error) {
      if (!this.options.silent) {
        console.error(`Error reloading module ${filePath}:`, error);
      }
      return { success: false, error };
    }
  }

  /**
   * Configure the depth of dependency tracking
   */
  setDepth(depth) {
    if (typeof depth !== 'number' || depth < 1) {
      throw new Error('Depth must be a positive number');
    }
    
    this.options.maxDepth = depth;
    
    // Rebuild dependency graph with new depth
    for (const filePath of this.options.watchedFiles.keys()) {
      this.#updateDependencyGraph(filePath);
    }
    
    if (!this.options.silent) {
      console.log(`Update depth set to ${depth}`);
    }
  }

  async preload(filePath) {
    try {
      const absolutePath = path.resolve(filePath);
      
      const fileUrl = pathToFileURL(absolutePath).href;
      
      // Check if file exists
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`File ${filePath} does not exist`);
      }

      const timestamp = Date.now();
      const importResult = await this.#tryImportModule(fileUrl, timestamp);

      if (!importResult.success) {
        if (!this.options.silent) {
          console.error(`Error loading module ${filePath}:`, importResult.error);
        }
        throw importResult.error;
      }

      const routes = importResult.routes;
      
      // Store in cache and as last valid module
      const stats = fs.statSync(absolutePath);
      const moduleInfo = {
        module: routes,
        lastModified: stats.mtime,
        filePath: absolutePath
      };

      this.options.cache.set(absolutePath, moduleInfo);
      this.options.lastValidModules.set(absolutePath, moduleInfo);
      
      // Build initial dependency graph for this module with the configured depth
      await this.#updateDependencyGraph(absolutePath);

      return routes;
    } catch (error) {
      if (!this.options.silent) {
        console.error(`Error preloading file ${filePath}:`, error);
      }
      throw error;
    }
  }

  async watchFile(filePath) {
    const absolutePath = path.resolve(filePath);
    
    if (this.options.watchedFiles.has(absolutePath)) {
      return;
    }

    try {
      let updateInProgress = false;

      const watcher = fs.watch(absolutePath, async (eventType) => {
        if (eventType === 'change' && !updateInProgress) {
          updateInProgress = true;

          try {
            // Small delay to ensure file writing is complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Update the dependency graph first
            await this.#updateDependencyGraph(absolutePath);
            
            // Find all modules affected by this change based on the dependency graph
            const affectedModules = this.#findAffectedModules(absolutePath);
            
            if (!this.options.silent) {
              console.log(`File changed: ${path.basename(absolutePath)}`);
              console.log(`Affected modules: ${affectedModules.size}`);
            }
            
            // Sort modules in dependency order (dependencies first, then dependents)
            const sortedModules = this.#sortModulesForReload(Array.from(affectedModules));
            
            // Track reload results
            const reloadResults = new Map();
            
            for (const modulePath of sortedModules) {
              const result = await this.#reloadModule(modulePath);
              reloadResults.set(modulePath, result);
              
              // Execute callback if exists and reload was successful
              if (result.success) {
                const callback = this.options.routeUpdateCallbacks.get(modulePath);
                if (callback) {
                  await callback(result.module);
                }
              }
            }
            
            if (!this.options.silent) {
              console.log(`Reload complete for ${path.basename(absolutePath)} and dependencies`);
            }
          } catch (error) {
            if (!this.options.silent) {
              console.error(`Error processing update for ${filePath}:`, error);
              console.log('Keeping previous valid versions');
            }
          } finally {
            updateInProgress = false;
          }
        }
      });

      // Store the watcher
      this.options.watchedFiles.set(absolutePath, watcher);

      // Handle watcher errors
      watcher.on('error', (error) => {
        if (!this.options.silent) {
          console.error(`Watch error for ${filePath}:`, error);
        }
        this.stopWatching(absolutePath);
      });
      
      // Start watching dependencies if force watch is on or depth > 1
      if (this.options.maxDepth > 1 || this.options.forceWatchDependencies) {
        await this.#watchDependencies(absolutePath);
      }

    } catch (error) {
      if (!this.options.silent) {
        console.error(`Error setting up watcher for ${filePath}:`, error);
      }
      this.stopWatching(absolutePath);
    }
  }
  
  /**
   * Sort modules for reload in the right order (dependencies first)
   */
  #sortModulesForReload(modules) {
    // Create a copy of the dependency graph for modules we need to reload
    const subgraph = new Map();
    for (const mod of modules) {
      const deps = this.options.dependencyGraph.get(mod) || [];
      // Only include dependencies that are in our modules list
      subgraph.set(mod, deps.filter(d => modules.includes(d)));
    }
    
    // Topological sort (dependencies first)
    const result = [];
    const visited = new Set();
    const temp = new Set(); // for cycle detection
    
    function visit(module) {
      if (temp.has(module)) {
        // Cycle detected, just continue - we'll handle it later
        return;
      }
      if (visited.has(module)) {
        return;
      }
      
      temp.add(module);
      
      // Visit all dependencies first
      const dependencies = subgraph.get(module) || [];
      for (const dep of dependencies) {
        visit(dep);
      }
      
      temp.delete(module);
      visited.add(module);
      result.push(module);
    }
    
    // Visit all modules
    for (const mod of modules) {
      if (!visited.has(mod)) {
        visit(mod);
      }
    }
    
    return result;
  }
  
  /**
   * Watch all dependencies of a file based on current depth setting
   */
  async #watchDependencies(filePath, currentDepth = 1) {
    if (currentDepth >= this.options.maxDepth && !this.options.forceWatchDependencies) {
      return;
    }
    
    // Make sure dependency graph is updated
    await this.#updateDependencyGraph(filePath);
    
    const dependencies = this.options.dependencyGraph.get(filePath) || [];
    
    for (const dependency of dependencies) {
      // Only watch if not already watching
      if (!this.options.watchedFiles.has(dependency)) {
        // If file exists, watch it
        if (fs.existsSync(dependency)) {
          if (!this.options.silent) {
            console.log(`Watching dependency: ${path.relative(process.cwd(), dependency)}`);
          }
          
          await this.watchFile(dependency);
          
          // Watch recursively with incremented depth
          await this.#watchDependencies(dependency, currentDepth + 1);
        }
      }
    }
  }

  getLastValidModule(filePath) {
    return this.options.lastValidModules.get(path.resolve(filePath))?.module;
  }

  getCached(filePath) {
    return this.options.cache.get(path.resolve(filePath))?.module;
  }

  setRouteUpdateCallback(filePath, callback) {
    const absolutePath = path.resolve(filePath);
    this.options.routeUpdateCallbacks.set(absolutePath, callback);
  }

  stopWatching(filePath) {
    const absolutePath = path.resolve(filePath);
    const watcher = this.options.watchedFiles.get(absolutePath);
    if (watcher) {
      watcher.close();
      this.options.watchedFiles.delete(absolutePath);
      this.options.routeUpdateCallbacks.delete(absolutePath);
    }
  }

  stopWatchingAll() {
    for (const [filePath] of this.options.watchedFiles) {
      this.stopWatching(filePath);
    }
  }

  getDependencyGraph() {
    // Return a copy of the dependency graph
    const graph = {};
    for (const [module, deps] of this.options.dependencyGraph.entries()) {
      graph[module] = [...deps];
    }
    return graph;
  }

  cleanup() {
    this.stopWatchingAll();
    this.options.cache.clear();
    this.options.routeUpdateCallbacks.clear();
    this.options.lastValidModules.clear();
    this.options.dependencyGraph.clear();
  }
}

export default Dynreload;