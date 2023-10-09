import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

function loadConfig() {
  try {
    const currentModulePath = fileURLToPath(import.meta.url);
    const currentDirectory = path.dirname(currentModulePath);
    const configPath = path.join(currentDirectory, '../../config.yaml');
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

    const blogContentSelectors = config.blogContentSelectors;
    const blogNavigation = config.blogNavigation;
    const blog = config.blog;

    return { blogContentSelectors, blogNavigation, blog };
  } catch (error) {
    throw error.message;
  }
}

export const { blog, blogContentSelectors, blogNavigation } = loadConfig();