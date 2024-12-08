import fs, { readFileSync } from 'fs';
import path from 'path';

let yaml = readFileSync( path.resolve('./config.yaml'), "utf-8" );
console.log(yaml.split('\n'));