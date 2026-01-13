/**
 * Custom script to copy public directory to dist, excluding patterns
 * This is used during build to avoid bundling 591MB of pattern files
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname=path.dirname( fileURLToPath( import.meta.url ) )
const publicDir=path.resolve( __dirname, '../public' )
const distDir=path.resolve( __dirname, '../dist' )

// Recursively copy directory, excluding certain paths
function copyDir( src, dest, exclude=[] ) {
  if( !fs.existsSync( dest ) ) {
    fs.mkdirSync( dest, { recursive: true } )
  }

  const entries=fs.readdirSync( src, { withFileTypes: true } )

  for( const entry of entries ) {
    const srcPath=path.join( src, entry.name )
    const destPath=path.join( dest, entry.name )
    const relativePath=path.relative( publicDir, srcPath )

    // Check if this path should be excluded
    if( exclude.some( pattern => relativePath.startsWith( pattern ) ) ) {
      console.log( `Skipping: ${ relativePath }` )
      continue
    }

    if( entry.isDirectory() ) {
      copyDir( srcPath, destPath, exclude )
    } else {
      fs.copyFileSync( srcPath, destPath )
    }
  }
}

// Copy public directory, excluding patterns
console.log( 'Copying public assets (excluding patterns)...' )
copyDir( publicDir, distDir, [ 'patterns' ] )
console.log( 'Done!' )
