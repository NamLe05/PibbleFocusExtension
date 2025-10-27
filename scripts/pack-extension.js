// Simple pack script to copy build output + manifest into zip
const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

const out = fs.createWriteStream(path.resolve(process.cwd(),'extension.zip'))
const archive = archiver('zip', { zlib: { level: 9 }})
out.on('close', ()=> console.log('extension.zip created'))
archive.pipe(out)
archive.directory('dist/', false)
archive.file('public/manifest.json', { name: 'manifest.json' })
archive.finalize()
