import test from 'node:test';
import assert from 'node:assert/strict';
import endpoint from '../api/contact.ts';

test('Retired form endpoint rejects stale clients without accepting a message',async()=>{
  for(const method of ['GET','POST']) {
    const response=await endpoint.fetch(new Request('https://reacstudio.com/api/contact',{method,...(method==='POST'?{body:'stale form payload'}:{})}));
    assert.equal(response.status,410);
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.deepEqual(await response.json(),{ok:false,error:'contact_form_retired',contact:'/contacto'});
  }
});
