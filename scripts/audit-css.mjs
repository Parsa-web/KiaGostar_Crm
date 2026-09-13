// Dev-only audit helper.
//  - `node scripts/audit-css.mjs missing`  → class names used in TSX but never defined in CSS
//  - `node scripts/audit-css.mjs dead`     → per-CSS-file report of selectors never referenced in source
import {readdirSync,readFileSync,statSync} from 'node:fs'
import {join,extname,relative} from 'node:path'

const root='src'
const files=[]
const walk=(dir)=>{for(const entry of readdirSync(dir)){const full=join(dir,entry);if(statSync(full).isDirectory())walk(full);else files.push(full)}}
walk(root)

const cssFiles=files.filter((f)=>extname(f)==='.css')
const srcFiles=files.filter((f)=>/\.tsx?$/.test(f))
const source=srcFiles.map((f)=>readFileSync(f,'utf8')).join('\n')

const classesIn=(text)=>{const set=new Set();for(const m of text.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g))set.add(m[1]);return set}

const mode=process.argv[2]??'dead'

if(mode==='dead'){
  for(const file of cssFiles){
    const text=readFileSync(file,'utf8')
    const classes=[...classesIn(text)]
    // a class counts as "used" if its literal name, or a prefix of it (BEM/modifier
    // built by template strings such as `ui-button--${variant}`), appears in source
    const used=classes.filter((c)=>{
      if(source.includes(c))return true
      for(let i=c.length-1;i>3;i--){const stem=c.slice(0,i);if(/[-_]$/.test(stem)&&source.includes(stem))return true}
      return false
    })
    const dead=classes.filter((c)=>!used.includes(c))
    const pct=classes.length?Math.round((used.length/classes.length)*100):100
    console.log(`${relative(root,file).padEnd(26)} ${String(classes.length).padStart(4)} classes  ${String(pct).padStart(3)}% used   dead: ${dead.length}`)
    if(dead.length&&process.argv[3]==='-v')console.log('   ',dead.join(' '))
  }
}else{
  const defined=new Set()
  for(const file of cssFiles)for(const c of classesIn(readFileSync(file,'utf8')))defined.add(c)
  const used=new Map()
  for(const file of srcFiles){
    const text=readFileSync(file,'utf8')
    const add=(raw)=>{for(const token of raw.split(/[\s`${}'"+?:()|,]+/)){const t=token.trim();if(!t||!/^[a-zA-Z][\w-]*$/.test(t))continue;if(!used.has(t))used.set(t,new Set());used.get(t).add(relative(root,file))}}
    for(const m of text.matchAll(/className="([^"]*)"/g))add(m[1])
    for(const m of text.matchAll(/className=\{`([^`]*)`\}/g))add(m[1])
    for(const m of text.matchAll(/cx\(([^)]*)\)/g))add(m[1])
  }
  const missing=[...used.entries()].filter(([name])=>!defined.has(name)&&name.includes('-')).sort()
  for(const [name,where] of missing)console.log(name.padEnd(42),[...where].slice(0,2).join(', '))
  console.log(`\n${missing.length} class names used in source but not defined in CSS`)
}
