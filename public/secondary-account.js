// A fixed non-personal Firebase login alias, not a password or authentication bypass.
export const secondaryDeveloperUid='7LlA8Z0wdCcs8ylH96hnjfZYr5r2';
export const secondaryLoginEmail='nora-dev@orbitrail.invalid';
export function resolveLoginAlias(identifier){return String(identifier||'').trim().toLowerCase()==='nora'?secondaryLoginEmail:null;}
export function isSecondaryDeveloper(user){return user?.uid===secondaryDeveloperUid;}
