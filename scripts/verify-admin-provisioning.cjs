const assert = require('node:assert/strict');
const {randomUUID, randomBytes} = require('node:crypto');
const {MongoClient} = require('mongoose').mongo;
// This executable check never contacts hosted auth or metadata, and touches only its own fixtures.
if (process.env.USER_METADATA_LOCAL_DEV !== 'true' || process.env.NODE_ENV !== 'development' ||
    process.env.MONGODB_URI !== 'mongodb://127.0.0.1:27017/user_metadata_local')
  throw Error('Requires explicit isolated local metadata configuration');
(async()=>{
 const requestId=randomUUID();const email=`journey-${requestId}@example.invalid`;
 const password=`Local7${randomBytes(12).toString('hex')}`;
 const client=new MongoClient('mongodb://127.0.0.1:27017');await client.connect();
 let uuid;
 const call=(path,body)=>fetch(`http://127.0.0.1:3004/user-metadata${path}`,{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
 });
 const payload={requestId,email,password,role:'regular',firstName:'Local journey',lastName:'Verification'};
 try {
  const created=await call('/admin/users',payload);assert.equal(created.status,201,await created.clone().text());
  assert.equal(created.headers.get('set-cookie'),null);
  const user=await created.json();uuid=user.uuid;assert(uuid);assert.equal(user.email,email);assert.equal(user.password,undefined);
  const retry=await call('/admin/users',payload);assert.equal(retry.status,201);assert.equal((await retry.json()).uuid,uuid);
  const duplicate=await call('/admin/users',{...payload,requestId:randomUUID()});assert.equal(duplicate.status,409);
  const invalid=await call('/admin/users',{...payload,requestId:randomUUID(),password:'short1'});assert.equal(invalid.status,400);
  const authUsers=client.db('auth_users_local').collection('users');
  assert.equal(await authUsers.countDocuments({email}),1);
  const account=await authUsers.findOne({email});assert.notEqual(account.password,password);
  const signin=await fetch('http://127.0.0.1:3005/sign-in',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  assert.equal(signin.status,200);const cookie=signin.headers.get('set-cookie').split(';')[0];
  const identity=await fetch('http://127.0.0.1:3005/user-metadata',{headers:{Cookie:cookie}});assert.equal(identity.status,200);assert.equal((await identity.json()).email,email);
  const edit=await fetch(`http://127.0.0.1:3004/user-metadata/${uuid}/admin-override`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({firstName:'Updated local journey'})});
  assert.equal(edit.status,200);assert.equal((await edit.json()).firstName,'Updated local journey');
  const roleChange=await fetch(`http://127.0.0.1:3004/user-metadata/${uuid}/role`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'publisher'})});
  assert.equal(roleChange.status,200,await roleChange.clone().text());assert.equal((await roleChange.json()).role,'publisher');
  assert.equal((await authUsers.findOne({email})).role,'publisher','Local identity role is synchronized');
  const removed=await fetch(`http://127.0.0.1:3004/user-metadata/${uuid}`,{method:'DELETE'});assert.equal(removed.status,204);
  assert.equal(await authUsers.countDocuments({email}),1,'Deleting metadata retains sign-in account');
  console.log('PASS: real isolated account+profile creation, idempotent retry, duplicate/validation errors, hashed password, actual sign-in, profile edit, identity-role synchronization and metadata-only deletion.');
 } finally {
  if(uuid) await client.db('user_metadata_local').collection('usermetadatas').deleteOne({uuid,email});
  await client.db('auth_users_local').collection('users').deleteOne({provisioningRequestId:requestId,email});
  await client.close();
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
