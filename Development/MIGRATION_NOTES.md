# Project integration sizing contract

Do not migrate gameplay into project.html until the user approves it.

## Characters

Use scene-metrics.js in both the development preview and the eventual project renderer:

- Normal player/NPC sprite area: 89.6 CSS/world pixels.
- Boss sprite area: 268.8 CSS/world pixels.
- Shared sprite display padding: 5.6 pixels.

These values approximate the apparent size of the former 130/260-pixel actors after the old 1280-pixel canvas was displayed at roughly 1108 pixels wide. Actual visible artwork size still depends on each sheet's referenceSize and transparent padding. Preserve those per-sheet settings and source crops. Do not multiply character size by browser width, fullscreen size, or map zoom.

viewport.js sets canvas dimensions to its displayed CSS dimensions. This makes one world unit equal one displayed pixel; larger views reveal more world. Reuse it in the project screen. Keep the CSS canvas dimensions explicitly controlled by the viewport/container. If high-DPI rendering is added later, apply devicePixelRatio to the backing buffer/context only; keep world and collision coordinates in CSS pixels.

## Maps

- Playarea 1: scale background to viewport height; horizontal scroll only.
- Playarea 2: scale background to viewport width; vertical scroll only.
- Playarea 3: retain fixed world tile dimensions, overlap, seed, and source collision scale. Larger viewports display more tiles without enlarging them.
- Playarea 4: retain islandScale and finite image world dimensions. Larger viewports reveal more of the island; do not automatically fit/stretch the island to fullscreen.

Player/NPC rendering, collision footprints, placement bounds, tower occlusion, and arrow positioning use the same shared character size defaults. NPCs cloned from player sheets still use NPC movement speeds. Keep this distinction when implementing the future player character picker.

## Agreed game viewport reference
Use a centered 1280x720 game area on the user's 1920x1080 display, matching the supplied screenshot. Keep fixed character sizes; do not stretch the view to fill 1920x1080. The Development Preview Game Area button demonstrates this layout with a dark surround. Fit smaller browser windows at 16:9 while keeping one world pixel equal to one CSS pixel. Project migration still requires the user's instruction.

Development settings use dev-session.js/sessionStorage. Live Server reload signals (and Vite full-reload messages) preserve admin form values, character selection, supported toggles and panel expansion. Manual refresh/new navigation clears saved settings; gameplay state is not restored. Restore runs after gameplay tools initialize in both movement previews.

Boss movement policy: all four boss types ignore props, shorelines and strip boundaries, including selected admin boss avatars. NPC placement checks and spawn clamps also exempt bosses. Knockback placement permits bosses outside conventional play areas. Explicit boss:false miniboss overrides retain normal classification.

Tuning Parts menu now follows the supplied attachment-screen reference: shared Pause/Crafter character-stat panel on the left; starting weapon linked to three equipped slots; Found box on the left of the diagram; Finish on the right; cyan-bordered selection description and three actions below. All labels use the existing bitmap font, descriptions highlight numeric stats, and part icons retain levels. Remove puts an equipped part in Found, allowing later swap/strengthening/selling or dropping with Finish. Selling applies to the currently inspected part. Menu remains within the game surface, pausing game simulation only.

All prior gameplay references to the temporary name Mod now mean Tuning Parts. No separate Mod system should be migrated or implemented. Existing eligibility,three-slot limit,level1-3,run exclusions and starting-weapon-only effects apply. Yuuka reward already uses Tuning Parts.

Explosive Tuning added to catalog/admin spawn options. Runtime tuning-explosions.js integrates normal umbrella swings and EX projectile,one proc per attack object,small artillery splash,normal on-hit notifications and EX knockback inheritance. weapon-progression/combat-stats accept Growth exclusion for secondary damage without dropping enhancements. Both previews update/draw/clear effect pool.

Frozen status: frozen-status.js uses sprites/icons/effects/frozen.png at55% opacity over enemy hurtbox/body. frozenRemaining is gameplay-seconds only; enemy-control blocks AI, displacement and attack/contact updates until thawing. Incoming damage still uses the normal damage pipeline. Frozen bosses also hold their existing projectiles/area effects so these cannot damage the player while frozen. Admin / Status effects > Freeze onscreen enemies (3 seconds) targets all living enemies whose sprite hurtboxes intersect the viewport, including bosses. Both movement previews load the asset and expose the control. Frozen GIF frame clocks pause. Configuration: frozenSettings in frozen-status.js.

Stun graphic added:stunned-status.js loads sprites/icons/effects/stunned.png and draws aspect-correct stars centered above enemy heads while stunRemaining>0. Existing Neutralization1s stun automatically shows graphic. Admin/Status effects now includes Stun onscreen enemies(3seconds),matchingfreeze test duration. Both previews preloadasset andNPC renderingdrawsstatus.

Stun graphic switched to stunned.gif.48decodeddisplayframes in generated/stunned preserve307x159 dimensions,50ms/frame and2.4s loop. stunned-status uses gif-animation.js frame selection driven by enemy.stunVisualElapsed;enemy-control advances this onlyduringactivegameplay/stun. Above-head placement retained,sourceGIFunchanged.

Duel Trigger Tuning:weight1,Colorful Penlights.png,+1/+2projectiles,maxLV2,sell50/100Credits. Only a ranged starting weapon whose attackType is 'Multishot' qualifies. No existing starter is tagged Multishot,so it has no current firing effect. Future firing implementation must use startingWeaponProjectileCount(player,weaponId,basePrimaryCount),which totalWeaponDamage also uses to split flat enhancement/Growth bonuses consistently. Explicit ranged:false disqualifies a weapon. Per-part maxLevel now governs strengthening/equip validation andadminspawn clamping;otherparts retainLV3 cap.

Scope exception per user: Reverse Tuning and RGB Tuning now apply to every applicable equipped player weapon,including Supernova,Luminous Nova,The Princess and the Key and their EXs,besides umbrella. Other Tuning Parts remain starting-weapon-only. Reverse LV1/3 addsPI at weapon aim/firing boundaries,LV2normal;tracking callbacks are adjusted exactly once. RGB marks player plasma bullets for a seven-color tail and replaces eligible beam glow layers with rainbow gradients;enemy projectiles retain normal colors. Both princess-key implementations updated. RGB remains cosmetic at every level.

RGB bullet visibility correction:sharedplasmarecolor nowaffectshead andbloom aswellasrainbowwake,withage/shotphasecolorvariation.ExistingplayerbulletsupdateRGBstateondraw;enemybulletsremainunchanged.RegressionexercisesactualCanvasgradientcolors,notonlymetadata.

Reverse Tuning replacement:icon Event 27 - Peroro Plush.png. LV1/LV3(MAX) vertically invert only the controlled wielder's sprite around its own visual center;LV2normal. All weapon/EX firing directions are normal again. This supersedes the earlier reverse-aim behavior and all-weapon reversal exception. Weight3 andLV3cap retained. No physics,hitboxes,stats,HUD or weapon projectiles are flipped. Animated player copies carry a render-only isPlayerVisual flag so the same wearer transform applies toGIF poses without affecting NPCs. Both renderers updated;RGB remains all-weapon cosmetic.

Ability Upgrades table recorded in ability-upgrades.js as inactive metadata only(enabled:false,no gameplay/UI imports). All11descriptions,rank costs andtotals saved. Await user directives;existingDevelopmentmechanics remainungated.

Stats Upgrades table recorded as inactive metadata in stat-upgrades.js.14definitions includeper-rank values,caps,costs andtotals.No gameplay/purchase behavior added;awaitdirectives,matchingAbilityUpgrades.

Other Upgrades table saved in other-upgrades.js as inactive metadata only:7entries,costs,totalcosts andfuturelimitvalues.No spawning/inventory/ban/Hardcore/refundbehavior enabled.

SuperSynnergyframework added:super-synergy-recipes(empty),rules(sharedone-per-runstate),system(progressHUD/hammerpickup).GoldenHammerPieces.gif3stagesdecodedforstatefuldisplay. GoldenCrafter supportsweapon+MAX/SuperItem andatomicconsumption. Bothpreviewsintegrated. Awaitfiveuserrecipes;noplaceholderSuperweaponsactivated.

Decagrammaton integration (Development)
- First real recipe is now registered in super-synergy-recipes.js; four future recipes remain undefined.
- Port decagrammaton.js (paired plasma/homing attack), decagrammaton-ultimate.js (star reference/viewport execution/flash and orange wave), and ultimate-hud.js with the shared crafting/skill modules.
- Both movement entry points integrate attacks, ultimate simulation/rendering, white enemy silhouettes and admin tests. Both HTML previews contain its EX compendium entry; movement.css contains its independent ultimate HUD style.
- Keep super-synergy-rules.js ancestor exclusions, item-catalog.js passive DB and consumed-item filtering, skill-cast-state.js independent ultimate timer, and skill-pattern-recognition.js star/retained EX routing together.
- Current Malkuth asset lives at sprites/items/malkuth.png; Decagrammaton icon at sprites/attacks/Decagrammaton_Icon.png.
- Regression suite: 85 files passed. Module graphs link; no browser visual/playthrough validation claimed.

Ultimate HUD revision: removed the standalone bottom-right ultimate label and ultimate-hud.js. Readiness is now a steady outer glow on Decagrammaton's weapon slot, layered above neighbouring slots; the glow turns off while its independent ultimate cooldown is active. Bitmap text canvases are tagged data-bitmap-text and forced transparent by the shared Development stylesheet, preventing inherited white canvas backgrounds.

Pickup re-entry integration: pickup-reentry.js supplies the shared per-drop leave-plus-1.5-second guard for tuning-system.js and crafter-system.js (normal and Golden). Their update signatures are now (player, previous, delta); both Development movement entry points pass simulation delta. Preserve this delta when migrating so pauses do not consume the delay. Tuning release detection uses the full player/pickup overlap, not just the player center.

Retained EX spray: princess-key.js now accepts the Decagrammaton loadout for EX-only emission and aims its unchanged straight blue cone at visible enemies. decagrammaton.js exposes setExMode to suppress ordinary emission during that spray without deleting existing rounds. Both movement entry points must set both attack modes from princessSkill.casting/sprayActive. Do not replace the EX with normal Decagrammaton volleys or change its cone/cadence.

Decagrammaton visual size is restored to its pre-experiment value (reference diameter x 2 x 0.8). Keep visual trail timing separate from gameplay movement: blue wake starts immediately and visual trailSpeed scales with diameter so the full plasma tail forms before its 0.12s fade. Pink trail timing is unchanged. The comparison preview at tests/plasma-comparison.html reflects the restored size; it has not been visually accepted in-browser.

Verified Decagrammaton render-only fix: luminous-nova.js now exports rememberPlasmaTrail/plasmaTrailPoints; decagrammaton.js records blue projectile motion after each movement step. drawLuminousPlasma uses the bounded traveled path when present and retains its existing straight path for other projectiles. Preserve this integration when migrating: it prevents rotating straight-tail spikes during homing/orbits, without changing diameter, fade, combat or firing mechanics. Controlled headless before/after images are in outputs/plasma-created-before.png and outputs/plasma-created-after.png. All87tests pass.

Admin equip UI: both previews now wrap separate loadout-test-sidebar and skill-test-sidebar panels in admin-test-sidebar. Keep equip weapon/synergy IDs in the former, #admin-equip-items for createItemEquipAdmin, and #admin-ultimate-tests in Skills. loadout-admin.js handles direct Hat LV1/MAX/awakened testing without altering permanent unlocks. Fullscreen CSS targets the shared scrollable wrapper.88testfiles passed; isolated layout screenshot in outputs/admin-loadout-preview.png.

Developer reward unlock bypass and fresh non-admin simulation added in both Development previews. Simulation objective unlocks are memory-only and never write real account progress. Generic isContentUnlocked/unlockContent API supports future weapon locks. Existing account unlocks remain localStorage per UID, not cloud synced.

Decagrammaton blue rounds no longer disappear when their homing target dies or is removed. They release target tracking and continue along their last heading, preserving normal lifetime, fade, collision and hit limits. Regression verifies survival, straight movement and normal expiry.

Plana base stats applied to both Development previews: HP70, baseATK130, baseSPD130, CRT10; additive SPD bonuses now include independent baseSPD. SIZE0.2 stored without visual scaling; characterSkills reserved separately. No future skill upgrades/UI added.

Level-up card left bar category colors: skills yellow, weapons blue, items/equipment green, retained on hover/focus/selection.

Level-up footer Reroll/Eliminate/Hold implemented via shared level-up-actions.js and menu integration in both previews. Developer10/10/5, rank-based normal access, isolated action selection mode, permanent per-run level-up elimination, next-level hold. Validation91 test files0 failures; module graph linked. No browser layout/playthrough validation.

Shared character stat display now includes baseATK/baseSPD bonuses relative to100%, in addition to additive upgrades/tuning; negative totals use correct signed percentages. Plana base display ATK+30%,SPD+30%,CRT10%,HP70/70. Existing item/buff CRT modifiers remain reflected. Four focused test files pass.

Plana CRT correction: baseCritPercent10 initializes through ensureCombatStats. Admin reset now restores per-character defaults instead of generic0CRT. Legacy dev-session snapshots skip old CRT field once; current explicit admin edits remain supported.

Bad Cooking implemented in both Development previews with procedural cached miasma, fixed per-enemy ticks, seven-level progression, MAX knockback, generic enhancement support, default reward availability and admin equip button. No pending Synnergies invented. Full reward pool exposed for randomized level-up selection and Files; apply validation uses full pool. Validation92 tests0 failures plus module graph; no authenticated browser gameplay/visual acceptance.

Bad Cooking visual-only revision: light translucent purple filled circle, softly feathered edge,24 independently phased particles rising vertically with fade-in/out. Removed dark haze, baked static flecks and orbital movement. Radius/damage/progression unchanged. Focused weapon regression passes; no browser visual verification.

Bad Cooking visibility:32 saturated purple particles,4-6px,85%peak alpha,up to52px ascent over1.5-2.1s; thin1.25px38%-opacity purple range outline. Radius/damage unchanged. Focused test passes and isolated headless screenshot visually inspected at outputs/bad-cooking-preview.png; fixture Development/tests/bad-cooking-preview.html, not authenticated gameplay.

Crafter successful level upgrades, enhancements, awakening and fusion no longer display the post-use notification box. Failure feedback remains available. Crafter system regression passes.

Molotov Cocktail implemented with full seven-level progression, fixed ground fire DoT, multishot throws, default availability,weight3 and Dakimakura icon.40frame napalm decoded from supplied GIF and drawn immediately after playarea, before other objects. Both previews include ready/update/reset/toggle/admin hooks. Level-up/File/Crafter/enhancement integration uses existing generic systems. Validation93 test files0 failures, module graph linked, headless texture preview inspected. Not full authenticated gameplay.

Racer Pass item +Super implemented with defaults/weight/icon/levels/descriptions; generic item pool now includes bothHat andRacer. SuperFiles accept Racerreplacement andowned/fullslots correctly. New shared size/knockback helpers reach autoattack geometry/visuals and eligible umbrellaEX; pickup magnet/display integrated. FlatSuperHP sync in ensurePlayerStats prevents stacking perframe. AdminLV1/MAX/Super controls added. Reward weightedselection uses definedweightvalues. Validation94tests0failures plusmodulegraph; no authenticated gameplay check.

Protocol SUPERNOVA display rename/newicon and Activate Protocol SUPERNOVA activationlabel replace Decagrammaton/Band of Atsilut in current menus. InternalIDs intentionallystable. Validation94tests0failures includingconstructor/icon/activation/bothHTMLmenus andexistinggameplayregressions.

Protocol SUPERNOVA EX/activation detail title uses sprites/protocol-supernova-plus.png instead of bitmap text in bothpreviews. Responsive width420pxmax/aspectpreserved;accessiblealtname;outside data-thin-text processing and directweapon-iconhide selector.

SaintPredator implemented withnewsharedconfig/constructor/levels andsaint-predator.js. Bothpreviewruntimeupdate/reset/draw/autotoggle/admincontrols;defaultrewardpoolandgenericCrafter/enhancementsupport. Sweptonehitprojectiles,randomvisibletargetselection,Hastecadence,RacerPassgeometry. Validation95testfiles0failures,modulegraphpass.Noauthenticatedgameplay/visualverification.

SafetyHelmetimplementedthroughitemcatalog/newdamageguardruntime safety-helmet.js. Bothpreviewsregisterguard,update/reset/drawshockwave. Normal5levels/weight4/defaultunlockandSuper40%+10%heal;sharedknockback10frames/speed10;nocooldown. Itemreward/Crafter/SuperFile/adminsinglebuttonroutesincluded. Validation97testfiles0failures,modulegraphpass,focusedCrafterHelmettestpass. Noauthenticatedgameplay/visualacceptance.

LifeJacket item andlife-jacket.js timerengine implemented. ShieldpoolseparatefromHP/adminshield,multiplicativeDRbeforeabsorption,Superfullshieldheal3s,15srefresh,pause-safeupdatebothpreviews. PlayerdamagepublishesHP/shieldresultandavoidsHPflashonshieldonlyhits.SafetyHelmetnegationpreservesshield. HUDsync/displayandnormal/Superrewards/adminintegration. Validation98testfiles0failures,modulegraphpass;noauthenticatedgameplaycheck.

ChisePlushiedamageeffectactivatedafteruserconfirmed1damageevery1.5seconds. Runtimealreadywireddebtengine;productionconfigenabled. Shield-firstdrainandoriginal30/20/10initialfractionsactive;timerspausewithgame. Validation100testfiles0failures.

2026-11-20 - Overheated Overclocking
Implemented Stat item (weight 2), three normal levels (+40/+60/+80% additive ATK), Super (+100% ATK and +200% Skill Damage, no drain). Normal drains 5% Max HP each active second down to 1 HP, bypassing damage/hit effects. Confirmed user rule: Life Jacket absorbs this drain only when Luminous Nova is also equipped. Unlock: complete a stage with Luminous Nova (It's Safe I Swear), persisted through the existing account-local unlock system. Added normal level-up/Crafter/File/admin progression and Super File replacement. Future penalty-negation item is supported by flags but not invented. Validation: 101 test files passed; Development/movement.js module graph linked. No authenticated gameplay test performed.

2026-11-20 - Special Pharmaceuticals
User requested Utility item, weight 1, max level 3, icon Special Pharmaceuticals.png; unlock by surviving 10 minutes as Plana in one run; reductions 33%, 66%, then negate item penalties.
Implemented catalog, reward eligibility, level-up/Crafter progression and admin equip/level button. Shared itemPenaltyMultiplier reduces Malkuth's Hat CRT penalty and Overheated Overclocking HP drain, retaining positive effects. No Super form invented. Paused time excluded from Plana survival objective; unlock uses existing account-local persistence. Chise deferred damage remains its timing mechanic, not erased as an item penalty.
Assistant: I’ll add Special Pharmaceuticals with its three levels and Plana survival unlock, and connect it to the existing item penalties.
Assistant: The item now reduces Malkuth’s Hat’s critical-chance penalty and Overheated Overclocking’s HP drain by 33%, 66%, then 100%, while preserving their benefits. I’m treating Chise Plushie’s deferred damage as its damage-timing mechanic, so Pharmaceuticals won’t erase damage already owed.
Validation: 102 test files passed; movement module graph linked. No browser gameplay validation.
