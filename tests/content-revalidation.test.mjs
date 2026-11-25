import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import test from "node:test"
import vm from "node:vm"
import {timingSafeEqual} from "node:crypto"
import ts from "typescript"

test("public cache invalidation requires the backend secret and expires only public content",async()=>{
 const calls=[],exports={},secret="private-revalidation-".repeat(3)
 const source=ts.transpileModule(readFileSync(new URL("../app/api/content/revalidate/route.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
 vm.runInNewContext(source,{exports,Buffer,Response,process:{env:{CONTENT_REVALIDATION_SECRET:secret}},require(name){
  if(name==="node:crypto")return {timingSafeEqual}
  assert.equal(name,"next/cache");return {revalidateTag:(...args)=>calls.push(["tag",...args]),revalidatePath:(...args)=>calls.push(["path",...args])}
 }})
 for(const authorization of [null,"Bearer invalid"]){
  const result=await exports.POST(new Request("https://site.test/api/content/revalidate",{method:"POST",headers:authorization?{authorization}:{}}))
  assert.equal(result.status,401)
 }
 assert.equal(calls.length,0)
 const result=await exports.POST(new Request("https://site.test/api/content/revalidate",{method:"POST",headers:{authorization:`Bearer ${secret}`}}))
 assert.equal(result.status,200)
 assert.equal(JSON.stringify(calls),JSON.stringify([["tag","posts",{expire:0}],["path","/blog"],["path","/blog/[slug]","page"],["path","/feed.xml"],["path","/sitemap.xml"]]))
})
