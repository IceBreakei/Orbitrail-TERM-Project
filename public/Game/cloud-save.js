import {getFirebaseAuth} from '../firebase-client.js';
/** Per-UID document operations; realtime listener keeps parent/pop-out account progress in sync. */
export async function createCloudSaveAdapter(uid){
 const {auth}=await getFirebaseAuth();if(auth.currentUser?.uid!==uid)throw Error('Account changed');
 const sdk=await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js');
 const db=sdk.getFirestore(auth.app),ref=sdk.doc(db,'accountSaves',uid);
 return {async read(){const snapshot=await sdk.getDoc(ref);return snapshot.exists()?snapshot.data():null;},write(patch){return sdk.setDoc(ref,{...JSON.parse(JSON.stringify(patch)),schemaVersion:1,updatedAt:sdk.serverTimestamp()},{merge:true});},listen(next,error){return sdk.onSnapshot(ref,snapshot=>{if(snapshot.exists()&&!snapshot.metadata.hasPendingWrites)next(snapshot.data());},error);}};
}
