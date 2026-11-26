// Prepared only: do not deploy while the project remains on Spark.
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const v1=require('firebase-functions/v1');
const {defineString}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {username,owner,recent,createLoginHandler}=require('./account-core.cjs');
initializeApp();const db=getFirestore(),auth=getAuth(),region='northamerica-northeast1';
const apiKey=defineString('AUTH_WEB_API_KEY',{default:"AIzaSyBkpje9RzP2ZNSBE2uYy9sStC8-m8CPZbU"});
const callable=handler=>onCall({region,maxInstances:5,cors:true},async request=>{try{return await handler(request);}catch(error){if(error instanceof HttpsError)throw error;const valid=['invalid-argument','unauthenticated','already-exists','resource-exhausted','failed-precondition'];throw new HttpsError(valid.includes(error.code)?error.code:'internal',valid.includes(error.code)?error.message:'Account action could not be completed.');}});
async function rateLimit(id){const ref=db.doc('loginAttempts/'+id);await db.runTransaction(async tx=>{const snapshot=await tx.get(ref),data=snapshot.data()||{},now=Date.now(),active=now-(data.startedAt||0)<600000,count=active?(data.count||0):0;if(count>=8)throw new HttpsError('resource-exhausted','Too many attempts. Try again later.');tx.set(ref,{count:count+1,startedAt:active?data.startedAt:now});});}
exports.usernameLogin=callable(createLoginHandler({
 limit:rateLimit,
 async lookup(name){const mapping=await db.doc('usernames/'+name).get();if(!mapping.exists)return null;try{const user=await auth.getUser(mapping.data().uid);return {uid:user.uid,email:user.email};}catch{return null;}},
 async verifyPassword(email,password){const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+encodeURIComponent(apiKey.value()),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});const result=await response.json();if(!response.ok)throw new HttpsError('unauthenticated','Username or password is incorrect.');return result.localId;},
 mintToken:uid=>auth.createCustomToken(uid)
}));
exports.claimUsername=callable(async request=>{const uid=owner(request),name=username(request.data?.username),profile=db.doc('accountProfiles/'+uid),alias=db.doc('usernames/'+name);await db.runTransaction(async tx=>{const prior=await tx.get(profile),target=await tx.get(alias),oldName=prior.data()?.username,old=oldName&&oldName!==name?db.doc('usernames/'+oldName):null,oldDoc=old?await tx.get(old):null;if(target.exists&&target.data().uid!==uid)throw new HttpsError('already-exists','That username is already taken.');if(oldDoc?.exists&&oldDoc.data().uid===uid)tx.delete(old);tx.set(alias,{uid,updatedAt:FieldValue.serverTimestamp()});tx.set(profile,{username:name,updatedAt:FieldValue.serverTimestamp()},{merge:true});});return {username:name};});
exports.getAccountProfile=callable(async request=>{const uid=owner(request),profile=await db.doc('accountProfiles/'+uid).get();return {username:profile.data()?.username||''};});
async function cleanup(uid){await db.runTransaction(async tx=>{const profile=db.doc('accountProfiles/'+uid),snapshot=await tx.get(profile),name=snapshot.data()?.username,alias=name?db.doc('usernames/'+name):null,mapping=alias?await tx.get(alias):null;if(mapping?.exists&&mapping.data().uid===uid)tx.delete(alias);tx.delete(profile);tx.delete(db.doc('accountSaves/'+uid));});}
exports.deleteAccount=callable(async request=>{const uid=recent(request);await auth.deleteUser(uid);await cleanup(uid);return {deleted:true};});
exports.cleanupDeletedAccount=v1.region(region).runWith({failurePolicy:true}).auth.user().onDelete(user=>cleanup(user.uid));
