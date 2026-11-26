import {resolveLoginAlias} from './secondary-account.js';
import {getFirebaseAuth} from './firebase-client.js';
import {usernameServiceEnabled,accountServiceRegion} from './account-service-config.js';
export async function signInWithIdentifier(identifier,password){
 const {auth,sdk}=await getFirebaseAuth(),alias=resolveLoginAlias(identifier);if(alias||identifier.includes('@'))return sdk.signInWithEmailAndPassword(auth,alias||identifier,password);
 if(!usernameServiceEnabled)throw Object.assign(Error('Username sign-in is not available yet. Please use your email address.'),{code:'app/username-unavailable'});
 const functions=await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js');
 const result=await functions.httpsCallable(functions.getFunctions(auth.app,accountServiceRegion),'usernameLogin')({username:identifier,password});
 return sdk.signInWithCustomToken(auth,result.data.token);
}
