import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVercelConfig} from './vercel-config.mjs';
test('unconfigured and invalid backends cannot produce a broken deployment',()=>{
  for(const value of [undefined,'','not-a-url','http://example.com','https://localhost','https://127.0.0.1','https://user:secret@example.com','https://example.com/api','https://example.com/?secret=1','https://example.com/#path']) {
    assert.throws(()=>createVercelConfig(value),/BACKEND_URL/);
  }
});
test('API including SSE precedes SPA routing and stays on the same browser origin',()=>{
  const config=createVercelConfig(' https://velora-api.example.com/ ');
  assert.deepEqual(config.rewrites[0],{source:'/api/:path*',destination:'https://velora-api.example.com/api/:path*'});
  assert.equal(config.outputDirectory,'frontend/dist');
  assert.match(config.installCommand,/--include=dev/);
  assert.equal(config.headers[0].headers[0].value,'private, no-store');
  assert.ok(config.rewrites.some(r=>r.source==='/craft/:path*'));
});
