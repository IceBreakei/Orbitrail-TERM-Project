import {getFirebaseAuth} from '../firebase-client.js';
import {isGuestSession} from '../guest-session.js';
/** The live arena remains hidden until both session restoration and asset loading finish. */
export async function requireGameAccess(){
 const content=document.querySelector('#development-content');content.hidden=true;
 if(isGuestSession())return true;
 try{const {auth,sdk}=await getFirebaseAuth();return await new Promise(resolve=>{sdk.onAuthStateChanged(auth,user=>{if(!user){content.hidden=true;window.location.replace('../index.html');}resolve(Boolean(user));},()=>{window.location.replace('../index.html');resolve(false);});});}
 catch{window.location.replace('../index.html');return false;}
}
