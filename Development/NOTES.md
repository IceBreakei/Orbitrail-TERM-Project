# Combat and weapon design notes


## Current implementation status

This section supersedes older pending-status paragraphs below.

- Combat formulas, EXP curve, Umbrella sweep, Supernova autoattack/EX, cooldowns and pause reference are implemented. Supernova recognition requires both side lines.
- Score counters/snapshots now connect to real defeats, campaign boss-wave clears and endless defeat. The Score testing dropdown shows the latest result. Counts/time are cumulative for the run. Leaderboard placement/persistence remains deferred; cleanup removals do not count.
- Yuuka and Sensei use HP9,999,999,999,ATK0,2.5x base-player speed,zeroEXP and25second lifetime. Sensei is available in the NPC selector. At expiry they run toward the nearest edge and despawn only once offscreen. The timeout escape remains; player hit-count defeat is also supported as described below. Adminseed0 intentionally retains1HP for all enemies.
- Yuuka now rolls30% at3:00,9:00,17:00, replacing kill/arrival-based odds. Automatic timed spawning respects the development spawning toggle. Manual spawning bypasses automatic restrictions.
- Sensei timestamps are still unspecified: automatic list is empty, manual testing works. Both retain the existing1credit perhit until credit caps/rewards are defined. Escaping gives no loot/kill credit. Mods/item boxes remain future work.
- Instant-KO requests reject bosses/mini-bosses/explicit immune enemies. No instant-KO attack was invented.
- Enemy scaling equations and optional endless clock exist as helpers; live activation awaits stage base-stat tables. Existing live scaling remains; do not stack both models.
- Spawn patterns/telegraphs are specifications awaiting event timings, counts and assignments; no automatic pattern schedule was invented.
- Growth, enhancements/mods/enchantments, secret stage, undefined bosses, item boxes and leaderboard placement/submission remain deferred.



These notes record the current damage, Growth, and knockback rules. For the wider gameplay formula reference, see [FORMULAS.md](FORMULAS.md). Gameplay remains in Development until explicitly approved for the project page.



## Editable code



- [game-config.js](game-config.js): `damageRules`, `growthSettings`, `weaponDamageFormula`, `attackDamageFormula`, weapon settings, and `knockbackSettings`.

- [combat-stats.js](combat-stats.js): character ATK/CRIT, main-weapon eligibility, and shared damage rolls.

- [weapon-progression.js](weapon-progression.js): Umbrella level bonuses and damage.

- [aris-weapon.js](aris-weapon.js): Aris level bonuses, projectile count, and damage.



## Damage calculation order



Weapon percentages are factors: 120% = 1.2 and 300% = 3. Total ATK starts at 100%; an ATK bonus of 30% means total ATK is 130%.



```text

weaponDamage = baseWeaponFactor * product(1 + applicableBonusPercent / 100)

totalWeaponDamage = weaponDamage + growthDamage / 10

attackDamage = 10 * totalWeaponDamage * totalATKPercent / 100



variance = attackDamage > 2 ? max(attackDamage * 0.1, 2) : 0

randAttackDamage = attackDamage - variance + randomUniform(0, 2 * variance)

totalDamage = round(randAttackDamage * damageMod)

```



Randomization is symmetric: no variation at damage <= 2, +/-2 up to 20, and +/-10% above 20. The earlier supplied random expression was incomplete and asymmetric; the stated symmetric range is the implemented rule. Round only the final damage. Critical hits and EX accuracy are post-randomization modifiers.



Starting examples without Growth, upgrades, ATK bonuses, or crits:



| Weapon | Nominal damage | Final range |

| --- | ---: | ---: |

| Plana's Umbrella | 12 | 10–14 |

| Aris's laser | 30 | 27–33 |



At +100% ATK, the starting Umbrella has 24 nominal damage. Its random range is 21.6–26.4 before final rounding.



## Weapon bonuses



Independent damage bonuses multiply with each other and the base weapon damage. Two +30% upgrades give `1.3 * 1.3 = 1.69`, rather than 1.6. Umbrella therefore reaches a 1.69 weapon damage multiplier at level 5.



Future applicable mods, enchantments, and weapon-specific character abilities belong in this same product. They must only affect eligible weapons. Growth is added separately and must not be multiplied by these base-weapon bonuses.



## Growth (future upgrade)



Growth is deferred. Do not enable it, add purchase controls, or expand its implementation until requested. The formulas below are retained as future design notes; current gameplay uses rank 0.



Growth applies to a character's main weapon and special attack. It adds flat damage per in-game character level, despite its percentage wording.



| Rank | Flat damage per character level | Purchase cost |

| --- | ---: | ---: |

| 1 | 0.1 | 500 |

| 2 | 0.2 | 10,000 |

| 3 | 0.3 | 50,000 |



Total cost: **60,500**. Growth defaults to rank **0**, pending a future purchase system. Set `character.growthRank` to test it.



```text

tickMultiplier = clamp(hitCooldownFrames / 20, 0.2, 1)

growthDamage = 0.1 * growthRank * playerLevel

               / primaryProjectileCount * tickMultiplier

```



- Divide Growth by the primary attack's projectile count, including extra primary projectiles from weapon levels and future projectile upgrades.

- Secondary attacks and on-hit effects generally do not increase this split count.

- Hit cooldown uses 60 Hz frames. Below 20 frames, reduce Growth proportionally; the maximum reduction is 80%, reached at 4 frames or below.

- Growth ignores weapon level damage bonuses and future base-weapon modifiers/enhancements, but scales with character ATK and subsequent damage multipliers.

- `character.mainWeaponId` defines eligibility. Plana defaults to `plana-umbrella`, including her umbrella EX. Aris is secondary unless explicitly designated as a main weapon. Aris's MAX forward/rear primary beams split Growth in two.

- The earlier sample `0.02 * playerLevel` is the weapon-factor contribution for rank 2 before projectile/tick adjustments. It is not an additional bonus on top of rank-based Growth.



## Deferred systems



Enhancements beyond maximum weapon level, Blacksmith's Gear, mods/stamps, enchantments, projectile enchantments, and the Growth purchase shop are **not implemented yet**. Reserved costs do not spend currency automatically.



The supplied future enhancement formula is retained here for later design work:



```text

totalWeaponDamage = (0.2 + blacksmithsGearBonus) * weaponEnhancements

                    + weaponDamage + growthFactor

```



Replace the example fixed `0.02 * playerLevel` with the actual rank-based, projectile-adjusted Growth factor when implementing it.



## Knockback



```text

effectiveSpeed = baseSpeed * (ignoreResistance ? 1 : 1 - resistance)

displacement = direction * effectiveSpeed * duration

resistance = clamp(baseResistance + accumulatedResistance, 0, 0.9)

```



Each valid knockback uses existing resistance, then adds 10 percentage points for subsequent knockbacks, capped at 90%. After 10 active gameplay seconds without another knockback, accumulated resistance resets; configured base resistance remains.



Collision with scenery stops knockback immediately. Collision with another enemy stops both enemies' knockback. Separate stun/recovery timers remain active. Normal enemy chase movement can still cross obstacles.



Attacks may ignore resistance. Absolute enemy knockback immunity takes precedence, including against resistance-ignoring attacks. Cosmetic death launches are separate; event-end deaths fade in place without knockback, drops, or kill credit.


## Character stats (current)

- **HP:** current life; reaching zero kills the unit. Development invincibility is an explicit exception: HP can reach zero without player death.
- **ATK:** bonuses add to the starting100% ATK, then the collective multiplier scales damage alongside other independent modifiers.
- **SPD:** bonuses add to base100% movement speed. Movement speed is base pixels/second multiplied by this total.
- **CRT:** critical chance in percentage points. Normal critical damage is1.5x; explicit weapon rules override it (Umbrella LV7 guarantees3x). Applicable target debuffs add to character CRT before clamping chance to0–100%. The shared roller accepts targetCritBonus; no debuff system is introduced here.
- **Pickup radius (PUR):** standard starting radius40px, +0.4px per1% bonus. Preserve established character overrides: Plana99px, Arona0px initially; bonuses add0.4px per percentage point to those bases. Walk-over collection still works without a magnet radius. No allied pickup NPC system yet.
- **Haste:** intervalFrames = max(1, round(baseIntervalFrames / (1 + hastePercent/100))). Convert seconds at60Hz. Only attack start intervals change; hit cooldowns, swing/beam duration, attack delay and visual trails remain unchanged. A weapon may impose a higher minimum. Umbrella's non-overlapping swing also limits actual repeat frequency.

Stats may eventually come from skills, items, weapons, character duplicates, shop upgrades and temporary run bonuses. This is a design direction, not an implementation of those future acquisition systems. Existing enemy HP/contact damage scaling continues over run time. Growth remains deferred.


## Total ATK

`totalATK = baseATK + (bonus1 + bonus2 + bonus3 + ...)`

ATK bonuses add; they do not multiply each other. Values use percentage points: base100% +20% from an item +30% from a skill =150% total ATK, a1.5x damage multiplier. Future item/skill systems should aggregate their bonuses into combatStats.atkPercent without counting the base again.

Edit attackStatSettings.baseATK (default100) in game-config.js, or set character.baseATK for a character-specific base. totalATKFormula sums independent bonuses; totalCharacterATK supplies the existing accumulated bonus to both damage rolls and nominal ATK-based calculations.


## Critical damage modifiers

`totalCritMod = baseCritMod + (critMod1 + critMod2 + ...)`

`criticalDamageMultiplier = 1 + totalCritMod / 100`

The default base modifier is +50%, producing1.5x damage. Bonuses add percentage points: +50% base +20% item +30% skill = +100%, or2x damage. This is separate from CRT, which determines the chance to trigger a critical hit. Noncritical hits do not receive this multiplier.

Edit combatBalance.criticalMultiplier (default1.5) for the default base, or set character.baseCritMod (percentage points) per character. combatStats.critDamagePercent stores accumulated bonus modifiers. The shared damage roller accepts weaponCritDamagePercent for applicable weapon-only bonuses. A weapon criticalMultiplier override replaces the base rather than erasing bonuses: Umbrella LV7 uses3x base, then adds character/weapon critical damage bonuses. Critical damage is applied after damage randomization and before final rounding.


## Bonus damage taken

`bonusDamageTaken = 1 + (bonus1 + bonus2 + bonus3 + ...) / 100`

Target debuffs add percentage points before becoming one independent damage multiplier. For example, +20% and +30% damage taken produce1.5x, not1.56x. No debuffs means1x.

Set enemy.bonusDamageTakenPercent to an array of active debuff percentages, e.g. [20,30]. The shared damage roller reads its target and applies bonusDamageTakenFormula before the single final rounding, alongside critical and other damage modifiers. Umbrella autoattack, Umbrella EX, and Aris pass the actual enemy target. No debuff application/duration system is added yet; admin raw damage retains its existing behavior.


## Damage Bonus (DB)

`DB = 1 + (bonus1 - 1) + (bonus2 - 1) + ...`

Sources use multipliers, not percentage points:1.2x and1.3x produce1.5x DB. Empty sources produce1x. DB belongs to the attacking character and is separate from target debuff-based bonus damage taken. Both independently multiply randomized damage, along with critical/EX modifiers, before the single final rounding.

Store applicable active source multipliers in character.combatStats.damageBonusMultipliers, initialized to an independent empty array for each character. damageBonusFormula in game-config.js combines them. Current shared weapon and EX damage rolls apply DB automatically. Future source acquisition/duration systems are deferred.


## Damage reduction (DR)

`DR = product(1 - reductionPercent / 100)`

Unlike additive Damage Bonus or damage-taken debuffs, independent reductions multiply. Two20% reductions give0.8*0.8=0.64 received damage (36% total reduction). No reductions gives1x. Each configured reduction is limited to0–100%;100% gives zero damage.

Set target.damageReductionPercent to an array of reduction percentages. Shared weapon/EX damage applies enemy DR before final rounding, independently from attacker DB and target vulnerability. Player damage applies player DR before shield absorption and HP loss, rounding once at this reception step. A hit reduced to zero causes no damage flash or damage popup. The existing admin Reduce HP action uses this same damage path. No items or timed reduction effects are introduced yet.


## Halo proximity multiplier

Halo is a separate item multiplier, applied independently of ATK, DB, critical damage, target vulnerability and DR before final rounding.

| Target distance from character | Halo LV1 | Halo LV2 | Halo LV3 |
| --- | ---: | ---: | ---: |
| Less than130px | 0.9x | 0.9x | 0.9x |
| 130px or farther | 1.2x | 1.4x | 1.6x |

Set character.haloLevel to1–3 for testing; missing/0 means unequipped and1x damage. Settings and haloDamageFormula are in game-config.js. Shared weapon/EX damage uses character-to-target world-coordinate distance at impact, not distance from the projectile. Missing target coordinates apply no Halo modifier. Equipment acquisition/UI is not added yet.


## Combined damage modifiers

```text
crit = criticalHit ? (1 + totalCritMod / 100) : 1
 damageMod = crit * bonusDamageTaken * DB * DR * Halo
 totalDamage = round(randAttackDamage * damageMod * attackSpecificModifier)
```

Independent categories multiply; aggregate their sources first using the category's rules. Critical modifiers, vulnerability debuffs and DB sources add within their category. DR reductions multiply within their category. Halo selects its proximity multiplier. Missing effects default to1x. EX drawing accuracy is an additional attack-specific multiplier. Apply these together before a single final rounding; do not apply a category twice.

The explicit shared composition helper is damageModifiersFormula in game-config.js, called by rollAttackDamage in combat-stats.js. This consolidates the existing behavior without changing balance.


## Spawn patterns

Status: design specification. The patterns below do not activate new events automatically. Existing periodic spawning and implemented Elite/Midori events retain their current behavior until pattern schedules and tuning are defined.

Periodic spawning uses randomized placements under the current stage's valid spawn surfaces and population/directional distribution rules. Timed events may override formation and movement using these patterns:

| Pattern | Formation and movement | Stats, rewards and warning |
| --- | --- | --- |
| Cluster | A large group spawns together; members then behave normally. | No inherent stat adjustments. |
| Horde | Large to massive groups rush across in a straight line at high speed. Players can sidestep the charge. | Usually low HP and low EXP. Defeats remain eligible for future On Defeat effects, such as Reisa healing. |
| Horde Rush | Rapid repeated Hordes can fill the screen. | Announced by an alert indicator. |
| Ring | Enemies surround the player in a circle, creeping inward to trap them or holding position as an escape-blocking wall. | Behavior depends on the event; no universal stat change specified. |
| Wall | A vertical or horizontal line of enemies, usually at both ends of the screen, advances toward the player. Both orientations may occur together. | Speeds may vary. |
| Stampede | A much faster Wall crosses the area in a linear formation. | A brief directional alert reveals its approach before spawning. |
| Wave | A Stampede variation follows a sine-wave path while crossing the screen, shifting safe gaps. | Inherits the Stampede warning; exact wave spacing/amplitude remain unspecified. |
| Airdrop | Enemies arrive at marked locations, in a coherent formation or randomly scattered around the player. | A red circle warns first; landing causes a damage burst and spawns the enemy. |
| Fastball | An enemy charges up, then launches itself as a projectile aimed at the player. | A red line spans the screen to telegraph the attack. |
| Ambush | Airdrop enemies at selected spots, then immediately begin the Fastball charge-up and ram sequence. | Combines the landing and charge telegraphs. |

### Pending implementation decisions

Before activating a pattern, define its schedule/manual trigger, eligible enemy types, count, spacing, spawn locations, speed, lifetime/exit behavior, HP/EXP overrides where applicable, and telegraph/charge/landing timings and damage. Ring behavior must specify inward motion versus a stationary wall; Wave needs amplitude/frequency. No numeric defaults are inferred from these descriptions.

Preserve existing event cleanup semantics: event-end removal uses the death fade without launch, loot, kill credit or defeat callbacks. Actual combat kills remain eligible for ordinary defeat behavior. Future On Defeat abilities and Reisa healing are not implemented by this specification.


## Enemy power scaling — pending equations

Enemy stats depend on stage-specific base stats and elapsed run time. Stage enemy pools/base stat tables will be provided later.

Time inputs supplied:

- minuteTimer: the minute component of the run timer (0–59).
- hourTimer: the full hour component of the run timer.
- minutesPast30: total complete minutes elapsed beyond30:00; zero before30:00.
- hourPast1: total complete hours elapsed beyond1:00:00; zero before1:00:00.

Equivalent input extraction from nonnegative elapsed seconds:

```text
fullMinutes = floor(elapsedSeconds / 60)
minuteTimer = fullMinutes % 60
hourTimer = floor(elapsedSeconds / 3600)
minutesPast30 = max(0, fullMinutes - 30)
hourPast1 = max(0, hourTimer - 1)
```

Required reference examples:

- At2h30m: minuteTimer30 and hourTimer2; the intended a value is81.
- At2h45m: minutesPast30=135 and hourPast1=1; the intended b value is195.
- At25m: minutesPast30=0 and hourPast1=0; b=0.

The equations defining a and b were missing from the supplied message. Do not infer them solely from these examples. Their equations and the way they modify HP/ATK/other enemy stats are pending. Existing run-time enemy scaling remains active until replacement formulas are supplied.


## Campaign pacing and enemy scaling phases

Desired pacing: each of the four campaign stages averages approximately5minutes, for roughly20minutes before endless. This is a balancing target, not a fixed timer forcing map changes. Preserve the established gameplay loop: defeating a stage's boss advances to the next stage; defeating the Stage4 boss wave enters endless.

The reference scaling model has three phases:

| Reference phase | Reference timing | Reference behavior |
| --- | --- | --- |
| Pre-Endgame | Before23:00 | a=0,b=0; enemy stats remain at stage base stats. |
| Endgame | 23:00–30:00 | a>0; stats rise gradually. |
| Kill screen | After30:00 | b>0; stats rise sharply each minute; reference game replaces the pool with YAGOOs. |

Project adaptation: campaign stages1–4 should occupy the pre-endgame portion; begin transitioning into endgame upon reaching endless, approximately20minutes into a typical run. The phase should follow actual campaign completion rather than assuming the player always finishes in exactly20minutes. Exact remapping of a/b time inputs and the later kill-screen threshold remain to be defined alongside the missing equations.

Enemy ATK, SPD and HP are intended to be calculated at full-minute intervals from stage base stats using a and b. The actual ATK/SPD/HP equations were absent from the message, as were the a/b equations in the earlier Time Scaling section. No replacement formula has been invented or activated. Existing HP/contact damage/speed behavior remains until these rules can be implemented together.

YAGOO is a reference-game enemy, not a defined enemy pool for this project. No YAGOO replacement or automatic pool swap is added without a project-specific definition. Existing endless events, boss progression and their timing remain unchanged by these notes.


## Special enemies

### Spawn-time stat profiles

specialEnemyStatsFormula(type, elapsedSeconds) in game-config.js provides opt-in profiles. Evaluate once at spawn and retain the snapshot, rather than recalculating every minute. These profiles are not automatically assigned to existing enemies or bosses.

Use minuteTimer=floor(elapsedSeconds/60)%60 and secondTimer=floor(elapsedSeconds)%60. The supplied minutesTimer spelling is treated as minuteTimer. Because these are components, values wrap at the hour; this is the supplied rule, not total elapsed minutes. SPD remains a factor; conversion into movement pixels/second and attack damage integration require an explicit assignment.

| Stat | Shooter | Bomber |
| --- | --- | --- |
| ATK | 2 + minuteTimer*0.8 | 2 + minuteTimer*0.15 |
| SPD | 0.35 + 0.015*minuteTimer | Same as Shooter |
| HP | round(4^(3.6 + minuteTimer/8.5) -127) | Same as Shooter |
| EXP | round(5^(1 + (minuteTimer + secondTimer/30)/25)) | Same as Shooter |

### Behaviors

- **Shooter:** moves slowly or remains stationary, firing ranged attacks. Iroha is a design example; her existing attacks/stats are not replaced by merely adding this profile.
- **Bomber:** when the player approaches, telegraphs its explosion range with a red circle, waits, then explodes for damage. No Bomber enemy is currently defined. Trigger range, delay and explosion settings remain pending.
- **Charger:** an !! indicator and audio cue precede a fast charge toward the player's last recorded position. Arisu boss is the intended example. No charge timings/stats are inferred here.
- **Mini-boss/Boss:** generally follows regular enemy behavior but differs in size and drops. Design rule: immune to all instant-KO effects. Their defeat counts will contribute to the future final score; scoring formula is pending. No instant-KO or scoring system is introduced by these notes.

### Bomber mini-boss/boss profile

```text
ATK = 2 + 0.225*minuteTimer
SPD = 0.42 + 0.018*minuteTimer
HP = round(1000 + 1000^(1 + minuteTimer/25))
expValue = round(750^(1 + minuteTimer/60))
```

The supplied HP expression lacked its final closing parenthesis; the expression above closes round around the full sum. The bomber-boss profile also exposes instantKOImmune=true for future integration. This is specifically the bomber boss profile, not a replacement for all bosses' existing HP/damage/reward rules. Existing Shiroko/Iroha stats and boss EXP drops stay unchanged pending assignments. Enemy attack behavior and instant-KO checks must be connected when these categories are implemented.


## Enemy time/stat equations — supplied

These equations resolve the previously missing a/b and stat formulas:

```text
a = max(0, minuteTimer - 23) + 37 * hourTimer
b = minutesPast30 + 60 * hourPast1
ATK = (baseATK + 2*a)^(1 + b/25)
SPD = min(300, (baseSPD + 0.12*a)^(1 + b/25))
HP = (baseHP + baseHP*0.05*a)^(1 + b/50)
```

Implemented as enemyTimeScalingFormula and enemyStatsScalingFormula in game-config.js. Full-minute inputs make these constant within each minute; no additional HP/ATK rounding was specified. SPD is capped at300 in the supplied stat's units. At2h30m,a=81;at2h45m,b=195. At exactly23:00,a=0;it first becomes positive at24:00. At exactly30:00,b=0;it first becomes positive at31:00.

Optional project adaptation: campaignScalingTimeFormula(endlessSeconds) returns0 before endless (null), then23:00 plus active endless elapsed time. Thus four approximately5minute campaign stages remain unscaled by this reference model, gradual endgame begins in endless, and the b phase begins after8full endless minutes. This explicit adapter is separate from the exact reference equations. It does not trigger YAGOO or other pool changes.

Integration status: formula helpers are available, but stage-specific baseATK/baseSPD/baseHP tables and final activation are pending. Existing live HP/contact-damage scaling remains active; do not accidentally stack the old and new scaling when migrating. Earlier 'equations missing' notes are superseded by this section. No decision has yet been supplied for a Blue Archive kill-screen replacement pool.


## Score and leaderboards

Score measures the player's performance and is calculated at these milestones:

- **Stage Mode (campaign stages1–4):** when the player completes a stage. Preserve boss-defeat-driven stage progression; score calculation is a completion milestone, not a new timer condition.
- **Endless Mode (after completing Stage4):** when the player is defeated. Development invincibility can prevent defeat even at0HP; testing score-on-defeat will need an explicit defeat path or invincibility disabled.

Leaderboards display the highest scores for each character. Leaderboard placement, presentation and storage will be specified later. No leaderboard UI, online writes or persistence schema is introduced now. Guest play remains unsaved under the established guest policy.

Pending: the actual score equation, stage-versus-run aggregation, inputs and weights, tie rules, and whether/how Development runs qualify. Earlier boss/mini-boss defeat counts are intended score inputs, but their weights are not yet specified. No score is fabricated from incomplete rules. These milestones are a design specification until the calculation and results flow are implemented.


## Score calculation — supplied formula

```text
baseScore = enemyDefeated*75 + miniBossDefeated*428 + bossDefeated*2251
          + max(0, finalMinuteValue-30)*20126
          + min(59, finalMinuteValue)*126
          + min(59, finalSecondValue)*10 + playerLevel*1219
hardcoreBonus = hardcore ? floor(baseScore*(finalMinuteValue*0.01 + finalHourValue*1.2)) : 0
finalScore = floor(baseScore + hardcoreBonus)
```

Implemented as scoreFormula in game-config.js; edit scoreSettings for coefficients. Inputs are enemyDefeated, miniBossDefeated, bossDefeated, playerLevel, elapsedSeconds and hardcore. Returns baseScore, hardcoreBonus and finalScore. Hardcore defaults false; the helper does not create a Hardcore mode.

The overall enemyDefeated count is the round's visible kill counter. Mini-boss and boss defeat totals are additional run counters; their bonuses supplement that overall count rather than replacing those kills. playerLevel is the level at the scoring milestone.

Timer values are hour/minute/second components: finalHourValue=floor(seconds/3600), finalMinuteValue=floor(seconds/60)%60, finalSecondValue=floor(seconds)%60. The minute-dependent base score therefore resets its minute contribution at an hour boundary, exactly as specified; it does not use total elapsed minutes. Hardcore also includes the supplied independent hour contribution.

Reference-game classifications: post30minute YAGOOs count as mini-bosses; Golden/Silver YAGOOs count as bosses. These are classification notes only; they do not add YAGOOs or assign replacement Blue Archive enemies.

This supplies the previously pending equation. Score snapshots still need results-flow integration, dedicated boss/mini-boss counters, stage-versus-run aggregation policy, leaderboard placement/storage and Development eligibility. No automatic scoring UI or online submission is introduced by the formula helper. Existing milestone rules remain stage completion for campaign and defeat for endless.


## Current EXP requirement (supersedes earlier curves)

Start at character level1 with79EXP required for level2. For subsequent levels:
reqNextLevel = roundEven((4*(currentLevel+1))^2.1) - roundEven((4*currentLevel)^2.1).
roundEven rounds to nearest integer, choosing the even integer on an exact tie. levelExpFormula/roundToEven implement this; the first requirement is explicitly79. Existing overflow/upgrade choices/fullheal remain.

## Supernova weapon and EX

Arisu's weapon is named Supernova; its existing internal ID remains aris-laser. Its automatic beam lasts0.3seconds, begins64px away from the character in a cone opening into a beam, and narrows to vanish instead of fading opacity. No gun graphic is rendered in the world. Cyan outer glow and white core create the energy-beam effect. Existing automatic interval/level bonuses remain.

EX pattern, clarified by user: a five-point crown at the bottom, an upside-down bullet above it, and two lines flanking the edges. Reference is displayed in the pause EX Skills accordion. Reference-based normalized matching accepts scale/position/order changes and asks QuickDraw about isolated strokes. No CLIP prompt is invented for the new symbol. Existing Plana CLIP/QuickDraw behavior remains intact.

The Supernova EX fires for3seconds and continuously follows current arrow targeting; the player can aim while firing. Damage uses Supernova's weapon base/upgrades through the same shared ATK/randomization/crit/DB/DR/Halo and drawing-accuracy pipeline as Plana's EX. Uses standard independent3minute skill cooldown. Admin Cast1-6 and numeric drawings can trigger it in its equipped slot. EX hit cooldown is0.2seconds pertarget (supernovaSkillSettings), with double automatic beam width; tune these until final EX balancing is specified. Pausing freezes its duration. Scene reset/character change clears it.

Umbrella visual: a continuous cyan arc now covers the entire travelled sweep rather than only the trailing blur. The configured190degree gameplay arc remains unchanged (previous request increased it from180); no reduction to the hit area is introduced.

## Harmless enemy redesign (pending)

Yuuka and Sensei are harmless, fast hopping credit enemies. Supplied shared stats:HP9,999,999,999;ATK0;SPD2.5;EXP0;lifetime25seconds. They vanish after enough hits rather than relying on the enormousHP being depleted.

Yuuka:30%spawn chance at designated timestamps3:00,9:00,17:00 on any map, credits perhit, and a future Mod on hit-count defeat. The supplied maximum-credit table has no numeric amounts. Sensei:20%chance at designated timestamps (not supplied), credits perhit; hit-count defeat yields a massive credit burst plus a future item box. Timeout despawns after25seconds. Exact hit thresholds/credit amounts, movement-unit interpretation and Sensei assets/timestamps remain pending.

These notes supersede Yuuka's earlier design intent but do not silently replace the currently implemented kill-based Yuuka spawning/HP/EXP/movement rules. ATK0 is already live. Mod/item box systems remain deferred; reference Silver YAGOO wording does not add a separate YAGOO enemy.



### Supernova EX knockback update

The continuous EX can damage each enemy once every0.2seconds, independently of the automatic beam's1second hit cooldown. Each successful EX hit pushes toward the nearest side of the beam, with a small forward component. Sideways travel accounts for beam width, the enemy's projected body radius and32px clearance; forward shove36px; travel/recovery0.2seconds. Centered targets consistently choose one side. Missed hits do not knock back.

Settings are in supernovaSkillSettings. Existing knockback resistance, absolute immunity and enemy/scenery collision stops still apply, so resistant or blocked enemies may remain in the beam. Automatic beam knockback remains unchanged.


### Harmless enemy hit-count defeat

Latest clarification: Yuuka/Sensei can be killed by the player after enough successful hits. They still run away on the25second timeout if not defeated first. Every accepted positive hit increments receivedHits once regardless of damage; rejected hits/misses do not count. At the threshold they use the normal death animation, credits-on-defeat and real kill/score notification path, while still giving zeroEXP. Future Mods/item boxes remain deferred.

Configure harmlessEnemySettings.yuukaHitsToDefeat and senseiHitsToDefeat; an enemy.hitsToDefeat override is supported for testing. Null settings use the computed spawn-time formula below; numeric values are optional test overrides. Existing HP depletion/admin1HP behavior remains available. Earlier statements that running offscreen is the only normal defeat route are superseded.


### Harmless-enemy minimum-hit formula (current)

hitsToDefeat = max(1, ceil((normalAttackDamage / 2) * ((elapsedSeconds / 60) / 2)))

Yuuka and Sensei share this rule. Total elapsed minutes include fractions and do not wrap at an hour. The normal damage input uses the current nominal main attack/ATK calculation, excluding random damage rolls, critical hits and EX accuracy. Snapshot at spawn; later stat upgrades/time do not move that enemy's target. At12normal damage and3minutes,9hits; at23damage and3minutes,18hits; at12damage and9minutes,27hits. Each accepted hit counts once regardless of its damage amount.

Edit harmlessHitsToDefeatFormula and harmlessEnemySettings hitDamageDivisor/hitMinutesDivisor/minimumHits in game-config.js. Optional yuukaHitsToDefeat/senseiHitsToDefeat numeric settings override the computed default for testing. NPC inspector displays received/required hits. Timeout escape remains25seconds; adminseed0 still permits normal1HP defeat.


### Current harmless hit requirement: player level

Yuuka and Sensei require hits equal to the player's character level at spawn, minimum1. This replaces the earlier attack-damage/time formula. Thresholds remain fixed for that enemy after spawning; leveling up does not extend its current target. Optional fixed test overrides still apply. The25second timeout escape, accepted-hit counting, credits and zeroEXP remain unchanged.


### Supernova beam presentation update

Automatic beam visuals now last0.36seconds (0.3active +20%visual tail); EX beam visuals last3.6seconds (3active +20%visual tail). The tail narrows to zero and adds no damage ticks. Existing EX hit interval0.2seconds and sideways knockback remain. Damage authorization is separate from presentation lifetime.

EX startup: weapon fades in over0.28seconds, holds0.08seconds, then the active beam begins. The weapon quickly fades away as firing starts; automatic attacks still omit it. Movement, aiming, enemies and attacks continue normally. Low-amplitude5.5%beam-width impact pulses at9Hz affect only presentation, with no hitstop, extra damage, screen flash or camera displacement.

Beam opening uses rounded Bezier shoulders, a broader16pxblur halo,5pxinnerblur and a softened white core. Origin moves from64px to108px from the character to leave clearance beyond the arrow and glow. Tune arisBeamVisualSettings and supernovaSkillSettings.originOffset in game-config.js.


Supernova bloom: automatic/EX beams include two additive blue/cyan bloom layers around the existing core. arisBeamVisualSettings bloomBlur30px,bloomSpread3.4,bloomOpacity0.32 tune the glow. Canvas compositing restores after each beam; hit area/damage/timing unchanged.


### Supernova weapon persistence update

Weapon length105.6px (+20%from88); opening fade0.336seconds (+20%duration from0.28) followed by existing0.08second hold. The gun slides/fades from the character center and renders behind the player, stays fully visible through the EX beam and its visual tail, then retracts toward the character while fading over0.28seconds. EX beam active damage remains3seconds with0.2second ticks. The presentation controller remains alive through the final weapon return; that return adds no damage or gameplay pause. Tune arisBeamVisualSettings.


## Enemy level base presets

| Level | HP | ATK | SPD | EXP | Other features |
| --- | ---: | ---: | ---: | ---: | --- |
| 1 | 40 | 4 | 0.4 | 7 | |
| 2 | 150 | 7 | 0.6 | 9 | |
| 3 | 380 | 5 | 0.65 | 8 | Immune to knockback |
| 4 | 80 | 7 | 1.0 | 8 | |
| 5 | 1500 | 20 | 0.1 | 4 | |

Editable in enemyLevelPresets in game-config.js; enemyLevelPreset(level) returns an independent copy. These are base stats, separate from player/weapon levels. No enemy/stage assignment or spawn distribution has yet been supplied, so this table does not automatically replace current enemy stats. The baseHP/baseATK/baseSPD names match enemyStatsScalingFormula inputs. SPD remains in supplied factor units pending movement conversion. Level3 uses the existing absolute knockbackImmune flag, which also rejects resistance-bypassing attacks. EXP is retained exactly as supplied, pending reward-policy assignment.


### Stage-based enemy values (active)

Clarification: table rows1?4 correspond to campaign stages1?4; row5 is used for endless regardless of the currently displayed map. Regular Mob and both Sweeper types now use these bases; bosses, Midori, Yuuka/Sensei and playable-character test NPCs retain their dedicated rules.

stageEnemyStats in stage-enemy-stats.js applies the supplied enemyStatsScalingFormula with campaignScalingTimeFormula. Campaign uses unscaled stage bases; endless starts at reference23:00 and increases on full-minute boundaries. Existing regular enemies update on stage changes and each endless minute, preserving their HP percentage. Old linear Mob HP scaling and player-level contact scaling are not additionally applied to stage-scaled enemies. Stage3 regular enemies are knockback immune.

SPD is treated as a multiplier of the240px/s base player speed: stages1?5 begin at96,144,156,240,24px/s respectively. Stage EXP bases are7,9,8,8,4; normal reports use these exact values while existing elite reward logic remains. Elite HP remains10x and damage2x. Adminseed0 preserves its1HP override, including scaling updates; stage tests can be reviewed using a non-admin seed.

This supersedes earlier statements that the stage table/live scaling integration is pending. Enemy pool composition and spawn-pattern schedules remain separately configurable work.


### Stage values BENCHED (latest)

The stage-wide table and stage-enemy-stats helper are inactive references. Live spawning no longer applies them or updates existing enemy stats from them. Each enemy type uses its own existing enemyVariant/template/contact rules. Stage3 no longer imposes blanket knockback immunity; stage HP/SPD/EXP/ATK overrides and stage-wide endless scaling are disconnected. Dedicated boss/special/harmless-enemy rules remain. This supersedes the previous Stage-based enemy values (active) section; future per-type tables can replace the individual defaults when supplied.


### Mob per-type base stats (active)

Mob:HP8,ATK2,SPD0.35,EXP6; automatic spawn window00:00 inclusive through03:00 exclusive, using total run time. Edit enemyTypeStats.mob in game-config.js. SPD0.35 of base player240 gives84px/s. Standard report reward uses6EXP. Existing elite rules retain10xHP/2xdamage and elite reward handling. Adminseed0 still overrides HP to1; manual Mob spawning bypasses the time window. Other enemy types retain current stats/windows until their rows are supplied.

Per-type profiles use the supplied time-scaling helper at spawn with the campaign/endless adapter and avoid also applying the old player-level contact scaling. Mob is naturally unscaled during its opening campaign window. Existing mobs are not despawned simply because03:00 is reached; only new automatic Mob arrivals stop.


### Sweeper per-type base stats (active)

Both existing White Sweeper and Heavy Sweeper variants use HP40,ATK4,SPD0.4 (96px/s),EXP7. Automatic spawn window00:30 inclusive through05:00 exclusive, using total run time. Editable independently in enemyTypeStats.whiteSweeper/heavySweeper. EliteHP400/contactdamage8; existing elite drop policy retained. Manual spawning bypasses the time window and adminseed0 still uses1HP. Existing enemies remain after their spawn window closes. Other spawn schedules are unchanged; until more entries are supplied, no regular type is eligible after05:00, and the spawner does not invent a fallback enemy.


### Mega Mob mini-boss (active)

Mega Mob:HP600,ATK6,SPD0.5 (120px/s),EXP150. Spawns once at02:00 of total run time while automatic spawning is enabled. If placement/population is blocked, retries until successfully spawned; then never repeats in that run. Uses Mob artwork/animation/body at2xsize (megaMobSettings.sizeMultiplier). Available separately in the NPC admin selector. Its own profile is enemyTypeStats.megaMob.

Mega Mob is a mini-boss, not an elite or full stage boss: it cannot randomly become elite, is protected from instant-KO, and counts toward the mini-boss scoring bonus. It does not consume a full-boss wave slot or trigger a stage transition on defeat. Normal damage/reward/death behavior applies, including150EXP, and adminseed0 retains the1HP test override. Other enemies' schedules and stats remain unchanged.


### Mega enemies are the previous elite variants (latest)

Mega is the player-facing name for the existing elite category, not a second enlarged enemy category. Elite Mob rolls/admin spawning now produce Mega Mob using its dedicated600HP/6ATK/0.5SPD/150EXP mini-boss profile. Scheduled Mega Mob shares the former elite size multiplier1.98, rather than a separate2xsize. Dedicated stats are not multiplied again by the old10xHP/2xdamage rules. Mega Mob drops its specified150EXP rather than the generic elite EXP cap.

The internal elite flag remains for population cost3slots, existing spawn odds/events and bonus loot. Mega variants count as mini-bosses for score/instantKO immunity. Sweepers retain their previous enlarged-variant stat bonuses until dedicated Mega rows are supplied. Midori retains her special event behavior. Existing random variant routes and the02:00scheduled Mega Mob remain; this clarification does not remove either spawn mechanism. Admin labels now say Mega. This supersedes earlier notes describing Mega Mob as unrelated to elites.


### Heavy Sweeper override (current)

Heavy Sweeper has its own baseHP80,ATK4,SPD0.4 (96px/s),EXP8 and automatic spawn window03:00 inclusive through05:00 exclusive. White Sweeper remains40HP/4ATK/0.4SPD/7EXP,00:30?05:00. This supersedes earlier shared Sweeper values. Manual testing bypasses the window; the existing Mega variant uses10xHP/2xdamage until its own row is defined.


### First boss Shiroko (current)

Shiroko:8000HP,15ATK,0.8SPD (192px/s),2000EXP. Automatic Stage1 boss appears once at05:00 total run time, replacing the first stage's kill-charge trigger. Blocked placement/full population retries; automatic spawning toggle must be enabled. Manual boss testing can still bypass the timestamp. Later stages/endless retain their existing boss rules pending new rows.

Per-type profile is enemyTypeStats.shiroko. Fixed2000EXP is distributed across the existing outward boss-report burst (at least50reports), replacing level-scaled EXP for this boss. First-stage regular enemies finish their specified windows at05:00; existing actors remain until normal cleanup/defeat. Boss defeat retains campaign advancement and score behavior; adminseed0 still forces1HP.


Supernova EX now pauses its own autoattack from startup through weapon return. Casting cancels any existing automatic beam and freezes the remaining automatic cooldown; normal firing resumes from that remaining interval when the EX presentation finishes. Other weapons continue independently. Supernova iconRotation=45degrees in its weapon definition, used by HUD and upgrade icons.


### Supernova simplified EX pattern (current)

Draw only a crown with3?5spikes at the bottom and an upside-down bullet above it. No side lines are required. Recognition compares against3,4and5spike references and uses the best accuracy, so accepted crown variants have equal damage potential. Scale/position/stroke order/direction remain flexible. Narrow upper bullet and wider lower crown validation prevents accidental Umbrella-pattern matches. Pause reference/copy updated. This supersedes every earlier side-line requirement.


### Supernova pattern and skill routing correction (current)

Supernova now uses exactly the reference three-spike crown with an open underside (no horizontal bottom stroke), plus the inverted bullet above it. No side lines. Pause diagram/copy updated.

Loadout recognition evaluates all ready weapons and selects the valid result with the closest reference accuracy instead of accepting the first match. This prevents Umbrella's earlier slot position or an erroneous CLIP prediction from stealing a closer Supernova drawing. An unsuccessful attempt is associated with its closest ready weapon, so an incomplete Supernova does not automatically put first-slot Umbrella on cooldown. Existing cooldown length remains unchanged. Tests cover both slot orders, misleading Umbrella AI predictions, normal Umbrella casting and failed-attempt cooldown ownership.


Sweeper size update:White/Heavy Sweepers are75%of Mob size (25%smaller), replacing80%. Base display size67.2px versus Mob89.6px. Shared centered circular hitboxes scale with the sprites; Mega variants retain the same relative size ratio. Tune sweeperSettings.sizeRatio.


### Supernova pattern: crown and diamond (latest)

The EX drawing is now an open-bottom three-point crown with a diamond above it. The diamond replaces the inverted bullet; no side lines or crown bottom stroke. Recognition reference, failure hints and pause diagram/text updated. Closest-ready-skill routing and scale/stroke-order tolerance remain.


### Beam clearance and Sweeper size (current)

Supernova automatic/EX beams now start10px beyond the real controlled player's hitbox boundary along the aiming direction. Beam anchor uses the collider center, including Plana's6px vertical offset; rounded visuals, collision segment and EX weapon muzzle use the same origin. Replaces the old fixed108px sprite-center offset. Bloom can spill softly into the gap without changing beam geometry. Edit supernovaSkillSettings.hitboxGap.

White/Heavy Sweepers shrink another20%fromtheir75%Mobratio:now60%ofMob (53.76px versus89.6px). Hitboxes and Mega variants scale proportionally. Stats/spawn times unchanged.


Umbrella blue sweep correction: full travelled annular sector and rounded cyan core now render independently after the blurred afterimages. Both retain identical start/end angles through the linger fade, avoiding a shortened-looking trail. Afterimage accents are blue instead of pink. Existing190degree configured swing/hit area preserved, covering the requested full180degree appearance without reducing reach/damage. drawUmbrellaSweep owns this presentation pass.


### Umbrella blur uses original artwork (latest)

Removed the artificial cyan sector/core and colored arc strokes. The sweep blur now consists solely of dense, blurred afterimages of the supplied umbrella crop, preserving its dark and magenta graphics. Afterimages cover the entire travelled angular range and fade together after the swing; no blue tint or separately drawn sector. This supersedes earlier blue-ribbon presentation notes. Combat arc/damage/timing unchanged.


### Cancellation without ink is free (current)

Cancelling the drawing screen with no drawn ink applies no cooldown, including right-click, pause and empty timeout. With ink, local reference matching chooses the closest ready equipped skill for the existing cancellation penalty (right-click30s/pause60s), rather than whichever slot opened the drawing screen. Empty/unrelated ink with no supported match cannot select a random skill. Cancellation stays immediate and invalidates any pending AI recognition. Normal submitted failed-cast cooldown behavior is unchanged.


### Undecided recognition is free (latest)

Unrecognized/ambiguous drawings, insufficient ink and recognition errors apply no cooldown to any skill. Successful recognized casts retain their normal cooldown. Matching compares reference accuracy and rejects competing accepted results closer than0.06 (skillCastSettings.matchMinimumMargin), instead of guessing. Cancellation with ink also avoids choosing a target when its closest references are ambiguous; clear identified cancellations retain their configured penalties. Failure cooldown is now0; earlier failed-cast penalties are superseded. Feedback explicitly says no cooldown applied.


### Close-range invisible weapon hitboxes

Umbrella damageInnerRadius=0 extends the swept damage sector from the player center through the handle to its existing outer reach. The rendered umbrella still uses baseRadius64; no additional visual arc or tint. Supernova automatic/EX collision segments now begin at the player collider center, bridging the invisible gap to the visible beam. Visual muzzle remains10px outside the hitbox. Both preserve directional coverage, outer range and per-target hit cooldowns; enemies close enough to overlap the handle/muzzle gap can now be struck.


### Mega Sweeper mini-boss (current)

Mega Sweeper:1800HP,10ATK,SPD0.75 (180px/s),600EXP; scheduled once at04:00 total run time while automatic spawning is enabled. Uses existing White Sweeper sprite at the former elite enlargement, preserving its60%size relationship to Mega Mob. NPC admin selector includes Mega Sweeper. Failed placement retries without consuming the scheduled spawn.

Former elite/Mega Sweeper routes now use this dedicated profile instead of multiplying normal Sweeper stats again. Mega Sweeper remains miniBoss/elite for score, instantKO immunity, population slots and bonus loot; exact600EXP bypasses the generic elite cap. Normal White/Heavy Sweeper profiles/windows remain unchanged. This supersedes earlier provisional Mega Sweeper bonuses.


### Scheduled formation: opening Mob cluster

At00:05 total run time, spawn one compact cluster of15normal Mobs with default per-type stats (currently8HP/2ATK/0.35SPD/6EXP). No lifetime timeout. They then chase normally. This supplements periodic spawning and respects the development automatic-spawning toggle.

Edit timedEnemyEvents in game-config.js. The formation chooses a legal offscreen side, validates its grid placements against the current play area and retries if blocked. Partial capacity placement remembers progress so retries do not duplicate enemies. No elite roll/stat override/event cleanup is attached to this cluster. Existing enemies can be removed by normal combat or distant-population cleanup.


### Scheduled01:05 Sweeper horde

At01:05 total run time, spawn30normal White Sweepers once, in a compact offscreen formation. Each locks the same straight heading toward the player's position at formation creation; movement does not home after the player dodges. All supplied default stats are preserved (40HP/4ATK/0.4SPD=96px/s/7EXP); no extra high-speed, lowHP or lowEXP override was supplied. No lifetime timeout. Automatic-spawning toggle applies; regular spawning continues alongside it.

Edit timedEnemyEvents. Formation placement/capacity retries without duplicates. Timed formations are protected from distance cleanup until entering view or for up to10active seconds, so rear members are not deleted while approaching; normal cleanup applies after entry. Hordes may cross stage boundaries while charging, and are removed by ordinary play-area/distance cleanup after crossing. Existing00:05Mobcluster remains a separate event.


### Scheduled01:30 Heavy Sweeper wall

At01:30 total run time, spawn140normal Heavy Sweepers as two opposing straight walls (70per side). Prefer vertical left/right walls on playable sides; fall back to horizontal top/bottom walls if the map has no legal side entry. Wall members use normal chase behavior,120HP,default4ATK/default0.4SPD (96px/s),and4EXP. This event bypasses Heavy Sweeper's ordinary03:00spawn-window start, without changing that ordinary window.

Lifetime8seconds: at01:38, remaining event members fade in place with no knockback, rewards, kills, score or defeat callbacks. Combat kills before expiry retain their normal rewards/credit. No new members spawn once the event window ends, including previously blocked/capacity-limited placements. Default adminseed0 still uses1HP. Configurable in timedEnemyEvents; formation/override helpers in timed-enemy-events.js. Automatic spawning toggle and global pause rules remain.


### Scheduled02:35 Sweeper ring

At02:35 total run time,50normal White Sweepers form an evenly spaced ring around the player's current position, then close in using normal chase/default stats (40HP/4ATK/0.4SPD/7EXP). Ring radius240px, reduced when necessary to fit playable borders; illegal placements retry within the event window. Lifetime8seconds: at02:43survivors fade in place without knockback/rewards/kill credit. No stat overrides or elite rolls. Automatic toggle/global pause rules apply; configuration in timedEnemyEvents.


### Scheduled02:45 Mob stampede

At02:45 total run time,10normal Mobs spawn in a single linear formation perpendicular to their fixed charge direction. A directional arrow at the entry edge warns0.8seconds beforehand. They charge straight toward the player's position captured when the formation is prepared, without homing afterward.

Event stats:HP500,ATK2xdefault=4,SPD2xdefault=0.7 (168px/s),EXP8. No elite roll or inherited Mega multipliers. Lifetime20seconds: at03:05survivors fade in place without knockback/rewards/kill credit. Existing ordinary Mob stats/window remain unchanged. Edit mob-stampede-0245 in timedEnemyEvents; geometry/override/warning helpers are shared with other timed formations. Automatic toggle/global pause and placement/capacity retry rules apply.


## Automatic event triggers temporarily benched (latest)

All previous automatic event triggers are disabled through eventTriggerSettings.enabled=false in game-config.js, pending the user's replacement full chart. This includes timed cluster/horde/wall/ring/stampede formations, timed Mega mini-bosses, timed harmless enemies, automatic first/later boss waves, and automatic endless buildup events. Definitions and per-enemy stats remain for reference; no new chart entries have been activated.

Ordinary random spawning and its existing per-enemy availability windows remain. Explicit admin NPC/boss/event tests and underlying event behavior remain usable. Manually triggered event completion can still request its test boss outcome. Reload an already-running session to clear existing actors/events and use the disabled defaults. This supersedes earlier notes saying the old chart is active.


## Updated stage enemy assets and pools

| Stage | Regular variants |
| --- | --- |
| 1 | Mob, Mob2(mob-2.png), Mob3(mob-3.png) |
| 2 | White Sweeper, Heavy Sweeper, OPS Sweeper |
| 3 | Arius1, Arius2, Arius3 |
| 4 | Highlander1, Highlander2, Highlander3 |

Corrected user count:Stage4has3Highlander variants, not4. Pedrozilla asset is not assigned to this roster. HeavySweeper.png moved from the deleted elite directory into enemies/normal; Mega templates still derive from regular sprites and need no duplicate sheets.

createAdditionalEnemyRoster in enemy-roster.js registers nine new templates with five-column/eight-row layouts; crop edges remain editable. New humanoids share Mob's normal display/reference size and centered circular hitbox. OPS uses the existing Sweeper display/layout rules. All variants are available in the NPC admin selector and Mega testing controls.

Live regular spawning now selects equally among eligible members of the current stage pool (enemyStagePools). Known per-type spawn windows use time since entering the current map/stage; total survival time still drives existing health/special rules. Existing Mob/White/Heavy stats remain. Newly introduced types use the existing generic standard-enemy defaults until their own stat rows/windows are supplied; no final values were invented. Special enemies/bosses remain separate. All automatic event triggers remain disabled pending the full chart.


Admin/Skills now includes Disable autoattacks. Checking stops active automatic Umbrella swings/Supernova volleys and prevents new autoattacks, while movement and manual EX casting continue. Unchecking restores automatic firing. Applies to both implemented weapons; defaults unchecked on reload, persists through character/map resets within the session. It does not reset skill cooldowns.

## Full replacement campaign chart (active)

Authoritative data: [campaign-config.js](campaign-config.js). Runtime clock/selection: [campaign-schedule.js](campaign-schedule.js). Old per-type tables remain fallback values for noncampaign tests.

| Stage | Enemy IDs | HP | ATK | SPD | EXP | Internal time | Role |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| first | mob | 8 | 2 | 0.35 | 6 | 00:00 - 03:00 | regular |
| first | mob2 | 40 | 4 | 0.4 | 7 | 00:30 - 05:00 | regular |
| first | megaMob | 600 | 6 | 0.5 | 150 | 02:00 | mini |
| first | mob3 | 80 | 4 | 0.4 | 8 | 03:00 - 05:00 | regular |
| first | pedrozilla | 20 | 2 | 1 | 3 | 04:00 - 06:00 | regular |
| first | megaMob3 | 1800 | 10 | 0.75 | 600 | 04:00 | mini |
| first | highlander1 | 125 | 5 | 0.6 | 12 | 05:00 - 08:30 | regular |
| first | highlander3 | 30 | 6 | 0.7 | 12 | 05:00 - 11:00 | regular |
| first | highlander2 | 150 | 7 | 0.6 | 9 | 05:55 - 08:30 | regular |
| first | shiroko | 8000 | 15 | 0.8 | 2000 | 06:00 | boss / stage checkpoint / freeze |
| second | whiteSweeper | 180 | 7 | 0.85 | 9 | 06:30 - 11:00 | regular |
| second | heavySweeper | 220 | 8 | 0.65 | 9 | 07:35 - 11:00 | regular |
| second | megaSweeper | 3500 | 11 | 1 | 1500 | 08:00 | mini |
| second | opsSweeper | 50 | 4 | 1.15 | 7 | 09:30 - 11:00 | regular |
| second | megaHeavySweeper | 2500 | 10 | 0.9 | 1000 | 10:00 | mini |
| second | mob | 100 | 5 | 1.1 | 8 | 11:00 - 14:00 | regular |
| second | mob2 | 450 | 11 | 0.8 | 10 | 12:00 - 14:00 | regular |
| second | arisu | 15000 | 15 | 0.8 | 2000 | 12:00 | boss |
| second | megaOpsSweeper | 5500 | 18 | 1 | 2000 | 13:00 | mini / stage checkpoint / freeze |
| third | arius1 | 650 | 14 | 0.7 | 12 | 14:00 - 16:00 | regular |
| third | arius2 | 650 | 12 | 0.9 | 12 | 14:00 - 16:00 | regular |
| third | megaArius2 | 7500 | 20 | 1.1 | 1200 | 15:00 | mini |
| third | megaArius3 | 7500 | 20 | 1.1 | 1200 | 15:00 | mini |
| third | arius3 | 900 | 14 | 0.7 | 11 | 15:45 - 19:00 | regular |
| third | pedrozilla | 750 | 12 | 1 | 11 | 15:45 - 19:00 | regular |
| third | iroha | 23000 | 20 | 1.1 | 2000 | 17:30 | mini / stage checkpoint / freeze |
| fourth | mob, mob2, mob3 | 2000 | 18 | 0.6 | 14 | 18:00 - 19:00 | regular |
| fourth | highlander1, highlander2, highlander3 | 3000 | 17 | 0.4 | 15 | 19:00 - 20:00 | regular |
| fourth | arius1, arius2, arius3 | 3000 | 16 | 0.4 | 15 | 19:00 - 20:00 | regular |
| fourth | megaPedrozilla | 1000 | 12 | 0.85 | 20 | 20:00 - 23:00 | regular |
| fourth | neru | 30000 | 20 | 1.2 | 5000 | 20:00 | boss / stage checkpoint |
| fourth | whiteSweeper, heavySweeper, opsSweeper | 1000 | 14 | 0.65 | 23 | 23:00 - 25:00 | regular |


### Campaign clock and transitions

- The internal clock starts00:00 on Stage1. It freezes at06:00 while Shiroko's checkpoint is pending/alive. Gameplay and the survival timer keep running. Defeat advances to Stage2 at internal06:30.
- Stage2:Arisu spawns at12:00 without freezing. The OPS mini-boss spawns13:00 and freezes the clock. Both must be defeated before Stage3 starts14:00; killing either first works. This reflects the user's clarification and supersedes the earlier ambiguous freeze-at-Arisu wording.
- Stage3:Iroha at17:30 is scored/classified as a mini-boss but also acts as the stage guardian. Its checkpoint freezes the internal clock. Defeat advances to Stage4 at18:00.
- Stage4:Neru spawns20:00; the clock keeps moving, allowing the23:00Sweeper phase and25:00all-enemy fallback. Neru defeat completes campaign progression into the existing endless system.

Random regular arrivals continue during each fight, using currently eligible chart rows. While a chart boss/checkpoint is alive, each regular arrival has exactly0.5%chance of becoming Mega. Where the current stage defines a matching mini-boss profile, that dedicated form/stats is used. Other random Megas retain existing10xHP/2xATK/1.98size bonuses. Explicit chart Megas do not receive those multipliers twice. After25:00,Stage4 samples all defined regular types using their latest chart profile; full bosses are not added to that regular pool.

Spawn times and numeric stats are exact chart values. SPD factors use240px/s as1.0. No additional legacy HP/contact stat scaling is stacked onto them. Default adminseed0 still sets all enemies to1HP; reroll to test chart HP. Scheduled encounters retry blocked placement/capacity and persist outside the regular cleanup radius until defeated. Only the listed checkpoint requirements advance stages; unrelated mini-boss kills do not.

New templates/assets:Pedrozilla, Mega Mob3, Mega Heavy Sweeper, Mega OPS, Mega Arius2/3, Mega Pedrozilla, Arisu Boss and Neru Boss. Arisu normal GIF and Neru A1 GIF were decoded to display-sized frames, preserving timing; their other supplied attack GIFs remain available for future specific attack definitions. These bosses currently use existing chase/contact behavior. Dedicated attack patterns were not inferred from a stat table. All new identities are available in the NPC admin selector; manual chart-aware spawning uses the current stage's profile without marking the scripted encounter complete.

campaignSettings.enabled=true activates this replacement enemy/boss chart. eventTriggerSettings.enabled=false still benches the older formation/harmless/endless-event triggers. Normal Development random spawning defaults off; start it for automatic chart arrivals/encounters. The chart clock advances during active play and respects game/level-up pause, with its value shown in the Playtesting sidebar. Survival time remains independent for HUD/scoring. Switching maps in admin testing resets the chart to that map's stage-start anchor.

## Replacement event chart (active)

Editable data: [event-config.js](event-config.js). Controller and seed generation: [seeded-events.js](seeded-events.js). This supersedes the old timedEnemyEvents reference table.

| Internal time | Enemy | Pattern | Amount | Lifetime | HP | ATK | SPD | EXP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 00:05 | mob | cluster | 15 | - | Default | Default | Default | Default |
| 01:05 | pedrozilla | horde | 30 | - | Default | Default | Default | Default |
| 01:30 | mob2 | wall | 140 | 8.3 | 120 | Default | Default | 4 |
| 02:35 | mob2 | ring | 50 | - | Default | Default | Default | Default |
| 02:45 | mob3 | stampede | 10 | 20 | 500 | Default | Default | 8 |
| 03:15 | mob | wall | 140 | 8.3 | 200 | Default | 0.55 | 5 |
| 03:18 | pedrozilla | horde | 30 | - | Default | Default | Default | Default |
| 03:40 | mob | stampede | 20 | 20 | 500 | Default | 1.6 | 8 |
| 04:15 | mob | ring | 50 | 26 | 200 | Default | Default | 5 |
| 05:00 - 05:10 | pedrozilla | horde | 100 every 5s | - | Default | Default | Default | Default |
| 05:30 | mob2 | stampede | 40 | 20 | 800 | Default | 2 | 8 |
| 07:00 | whiteSweeper | ring | 120 | 25 | 500 | 5 | 0.05 | 10 |
| 08:30 | heavySweeper | ring | 27 every 1.66s for 22s | 22 | Default | Default | Default | Default |
| 09:00 - 09:30 | opsSweeper | horde | 120 every 5s | - | Default | Default | Default | Default |
| 10:15 | opsSweeper | stampede | 40 | 20 | 1000 | Default | 1.6 | 10 |
| 11:30 | heavySweeper | ring | 120 | - | Default | Default | Default | Default |
| 12:20 | whiteSweeper | stampede | 20 | 20 | 2000 | 7 | 2 | 10 |
| 12:25 | opsSweeper | stampede | 20 | 20 | 2000 | 7 | 3 | 10 |
| 12:45 - 12:50 | heavySweeper | stampede | 188 over 5s | 20 | 2000 | 7 | 2 | 10 |
| 13:30 - 13:40 | whiteSweeper | horde | 40 every 2s | - | 70 | 2 | 1.7 | 5 |
| 14:20 | highlander1 | stampede | 10 | 20 | 2000 | Default | 2 | 10 |
| 14:25 | highlander2 | stampede | 10 | 20 | 2000 | Default | 2 | 10 |
| 14:30 | highlander3 | stampede | 20 | 20 | 2000 | Default | 2 | 10 |
| 14:35 - 14:40 | highlander1, highlander2, highlander3 | stampede | 24 every 1s | 20 | 2000 | Default | 2 | 10 |
| 14:45 | arius3 | wall | 16 | 20 | 2000 | Default | 1.6 | 10 |
| 16:15 | arius1 | wall | 100 | 15 | 1500 | Default | 0.26 | 10 |
| 17:00 | arius2 | stampede | 40 | 20 | 5000 | Default | 2 | 10 |


### Event clock, repeats and cleanup

Event starts/range gates use internal campaign time. Repeated bursts continue on their configured active-time cadence while the internal clock remains inside the event window, including clock freezes. They stop once the internal clock passes the end. Range endpoints are inclusive for scheduled repeat waves. The12:45?12:50 row emits188HeavySweepers total over5seconds, not188perframe.

08:30 Heavy Sweeper rings:27members per ring every1.66active seconds, repeating for22seconds. All rings share one event group and expire together at the end; no per-ring22second extension. Other finite lifetimes also use a shared active-gameplay group deadline, independent of internal clock freezes. Expiry invokes existing in-place death fade without knockback, drops, kill credit, score or defeat callbacks. Combat kills before expiry retain their rewards. Global/level-up pause freezes event time; AI pause and the spawning toggle prevent new waves while existing group lifetimes still advance.

Default stats come from the relevant/latest known campaign row even if the type's ordinary spawn window is inactive. Explicit event stats replace just their supplied fields. SPD values are absolute factors of240px/s, not additional multipliers. Mixed Highlander waves cycle1/2/3within each wave. Event enemies never acquire a story checkpoint ID or trigger stage advancement. Normal population limits and cleanup remain; partial placements retry without duplicates. Clusters/stampedes compress spacing for large counts, and rings use legal arcs near playable borders rather than spawning into forbidden map space.

### Stage2 timing clarification (latest)

After Arisu and the13:00OPS checkpoint are both defeated, the internal clock resumes from13:00 rather than immediately jumping14:00. Stage2 continues through the13:30?13:40horde and transitions at14:00. This supersedes earlier instant-jump descriptions. Clock freeze while either checkpoint enemy lives remains.

### Seed-generated events after17:00

Once internal time reaches17:00, a separate active-time generation clock starts. It continues during internal boss-clock freezes. Event choices, counts and intervals derive from runSeed and event index, without consuming unrelated gameplay RNG. First generated slot is25seconds later; intervals35?55seconds; counts12?60;lifetime14?24seconds. Patterns include cluster/horde/wall/ring/stampede, with stampede direction warnings. Regular and Mega enemy types cycle through all21registered variants; full campaign bosses and harmless credit enemies retain their dedicated schedules and are not mass-spawned as formations. Defaults resolve from known campaign profiles; editable ranges/roster are seededEventSettings in event-config.js. Same seed produces the same sequence of enemy/pattern/count choices; player position still determines valid placement. Adminseed0 remains deterministic and forces1HP as before.

The replacement event chart is enabled through campaignEventSettings.enabled=true. Old eventTriggerSettings.enabled=false continues to bench obsolete formations, automatic harmless schedules and old endless buildup. The ordinary spawning toggle enables new event arrivals; disabled intervals do not accumulate a backlog of missed one-time events. An admin event-group/seed-slot readout appears below the internal clock. No old table rows were re-enabled alongside this chart.


## Endless enemy pool (current)
Editable in `campaign-config.js`: `endlessEnemySettings`.
From internal 23:00, Mob1/2/3, Pedrozilla, Arius1/2/3, Highlander1/2/3 and all three Sweepers share HP 5000, ATK 15, SPD 1, EXP 25. All are Mega variants; listed HP/ATK are used directly, without another Mega stat multiplier. Mega size, hitboxes and population weighting remain active.
At internal 30:00, non-Mega Midori joins: HP 9000, ATK 5, SPD 1.5, EXP 25. Its listed SPD overrides its former player-relative speed.
The internal chart clock continues from its Stage 4 value during endless mode. The pool can begin at 23:00 while the final Stage 4 boss is alive. Arrivals mix types evenly; generated events also use these defaults unless their chart explicitly overrides stats. Existing enemies retain their spawn stats. Previous generic stage scaling remains benched.

Pedrozilla size: normal matches the Sweeper sprite size. Mega Pedrozilla is 1.2 times Sweeper size across manual, campaign and endless spawning. Its template-specific megaSizeMultiplier overrides the general Mega scale; collision geometry scales with the sprite.


## Enemy SPD reference
Enemy table SPD values are ratios of the player's unmodified base travel speed (`playerSettings.speed`, currently 240 pixels/second), not raw pixels/second or the player's upgraded current speed.
`enemySpeedPxPerSecond = enemySPD * playerSettings.speed`
Examples: SPD 0.35 = 35% = 84 px/s; SPD 1 = 100% = 240 px/s; SPD 1.5 = 150% = 360 px/s.
`movementBase` (180) is an internal movement normalization value; it does not change this reference. Player SPD upgrades do not automatically increase enemies' table-based speed.

Event entry rule: all event enemies spawn fully outside the visible viewport, including sprite extent plus a 24px safety gap. Rings surround the viewport perimeter rather than a small circle around the player. Map boundaries restrict formations to legal offscreen entry arcs. Actual insertion rechecks the current camera position after warnings/capacity delays; no shrinking rings into the visible area.

Cluster formation update: scheduled 00:05 Mob cluster now contains20 enemies. Generated cluster events also contain20 (`seededEventSettings.clusterCount`). Cluster geometry uses a filled circular disk with golden-angle spacing rather than a square grid. All event placement still begins fully offscreen.

## Seeded event generation (current)
After internal17:00, generated events support Cluster, Horde, Horde Rush, Ring, Wall, Stampede, Wave, Airdrop, Fastball and Ambush. Seed controls pattern, enemy, entry side, count, lifetime and interval. Enemy eligibility comes from the current campaign regular-enemy time windows; from23:00 it uses the endless Mega pool, with Midori joining at30:00. Profiles use the corresponding HP/ATK/SPD/EXP values without extra stat rolls. Fixed chart overrides remain explicit.
Cluster uses20 enemies. Other generated groups use12-60; lifetime14-24 active seconds; intervals35-55 active seconds. Horde Rush repeats every2 seconds until its shared lifetime expires. Wave oscillates along its locked crossing heading. Fastball/Ambush wait0.65 seconds before charging. Warning cues precede special entries. Airdrop/Ambush descent is visual; all actual spawns remain offscreen, with no additional unconfigured landing damage. Existing event expiry remains no-loot/no-kill-count/no-knockback.

Pedrozilla movement presentation: normal and Mega variants inherit movementBounce height4px/period0.38s. Sprite rendering uses a smooth upward hop while moving; idle/death disables it. World coordinates, collision, speed and loot anchors stay grounded. Tune movementBounce in movement.js.

Supernova EX size is fixed at64px beam width (`supernovaSkillSettings.beamWidth`), independent of automatic weapon level size upgrades. Its visible muzzle and weapon pose start10px farther out:20px beyond the player hitbox boundary. Automatic beam keeps its10px gap and level-based size scaling. Invisible close-range collision bridge remains intact.

Supernova EX now deals damage at most once per second per enemy; active duration remains3seconds. Supersedes the earlier0.2s tick rule.

Supernova EX visible beam/weapon muzzle now starts30px beyond the player collider (10px shared gap +20px EX extra gap), moved forward another10px. Invisible close-range damage bridge remains.

Supernova EX muzzle clearance is now40px from the player collider (10px shared +30px EX extra), another10px forward. Weapon pose follows the same gap.

Supernova EX fixed beam width reduced20%:64px to51.2px. Rendering, collision width and beam-ejection calculations share this value. Muzzle gap remains40px.

Supernova default widths reduced another20%:normal32->25.6px,EX51.2->40.96px. Automatic level-size upgrades still apply; EX stays fixed. Muzzle spacing unchanged.

Supernova EX light cone starts10px closer to the gun via beamStartAdjustment=-10; gun pose stays in place. Visible cone clearance is now30px beyond player collider. Automatic beam and invisible collision bridge unchanged.

Pedrozilla skipping now uses independent per-spawn phase and90-110% period variation to prevent groups bouncing in unison. Mega Pedrozilla now matches Elite/Mega Mob sprite size (normalSpriteSize*eliteSizeMultiplier), superseding the previous1.2xSweeper rule; normal Pedrozilla stays Sweeper-sized. Dedicated and random/endless Mega routes share the template size ratio.

Pedrozilla crop fix: per-frame bottom boundaries for all40 cells exclude adjacent row artwork. Original foot anchors are preserved so trimming does not change movement/bounce alignment. Mega templates inherit this layout.

Animation inspection: Admin/NPC and enemy testing > Spawn animation lineup (AI off). Opens a scrollable inspection gallery with each regular/Mega type in its own row, all8direction animations side by side. Stationary preview copies use loaded sheets/custom frame crops; no combat AI or world population. Close/Escape/right-click exits.

Arius2 crop/alignment correction: measured all40frames, removed adjacent row fragments with custom rectangles, and set per-frame anchorX to each sprite's horizontal center to cancel leftward drift. Original foot anchors retained. Mega Arius2 inherits corrected layout. Animation lineup now uses normalSpriteSize fallback for Mob, matching gameplay instead of NaN scaling.

Frame drift corrections: Arius1, Highlander2 and White/Heavy/OPS Sweepers now use measured per-frame horizontal anchors across all8directions/5frames. Mega variants inherit layouts. Gameplay and animation lineup both honor anchors; source crops and foot positions remain unchanged.

## Boss actions and animation lineup
The AI-free animation lineup includes Shiroko, Arisu, Iroha and Neru, with left/right previews. Extra rows show Arisu charge-up, Iroha cannon/flag-wave, Neru A2 shooting and A1 compress/leap. Action GIFs are decoded in boss-action-frames.js; normal GIFs keep their existing sources.
Gameplay boss behaviors are in boss-behaviors.js; editable timings are in game-config.js/bossBehaviorSettings:
- Shiroko: ordinary chase only.
- Arisu:8s action interval,2s stationary charge-up using the second GIF,1100px/s locked straight charge across the viewport,0.6s recovery. Aim locks after charge-up.
- Iroha:6s interval,alternates cannon and flag-wave artillery. Cannon fires an aimed projectile; artillery marks3fixed locations around the player's position before striking after1.3s. Existing sheet action rows and facing-specific crops are preserved.
- Neru:7s interval,alternates2s A2 bullet hell and A1 compression/leap. Bullet hell emits12rotating projectiles every0.25s at240px/s. Leap compresses0.55s,locks the player's position,flies1s at210px visual height,lands in75px radius,then recovers0.5s.
Unspecified timings are initial editable testing defaults. Projectiles/zones use the owner's configured contact ATK, shield/HP damage pipeline and shared0.2s player I-frames. Projectile collisions are swept, count capped256,lifetime8s; attacks are removed when their owner dies. Admin AI pause freezes boss behavior/effects. No action hitstop. Boss AI is disabled in lineup; previews do not spawn combat actors.

Animation lineup scale fix:Iroha right cannon frame8 has a163px-wide edge crop while preceding frames are181px. Preview now computes a fixed sheet-wide fit scale once instead of resizing each frame to its crop. Prevents the narrowed crop from appearing larger; source crop and gameplay scale unchanged. Applies consistently to other sheet previews too.

Boss sprite minimum:bossMinimumSpriteSize=bossSpriteSize*1.1. Shiroko is10%larger; all boss templates including Iroha/Arisu/Neru use at least that sprite size, retaining any larger custom size. Ordinary/Mega mobs and special enemies retain their existing sizes. Applies to gameplay and lineup through shared templates.

Plana Umbrella LV7 guaranteed3x critical hits now classify as supercritical: red numbers with!!!. Yellow critical and red supercritical damage popups render at1.1x normal size; ordinary/player damage popup sizes unchanged. Damage formulas unchanged.

## Crafters, enhancement and awakening (current)
Editable rules: `crafterSettings` and the Crafter formula helpers in `game-config.js`. Ground/menu behavior lives in `crafter-system.js`; equipment transactions live in `crafter-rules.js`.

Obtaining: each actual enemy defeat rolls1/1301. Maximum20unconsumed Crafters on the ground; no roll past the cap. Future Credit Card effects can set `player.crafterDropMultiplier` (default1). Safe-ground placement uses the existing loot landing resolver. Crafters use the blue crafting-tablet/gear icon at source rect913,1207,103,134 on `sprites/icons/Game Icon 2.png`. Large white arrows sit above visible Crafters or at the screen edge pointing toward offscreen ones. Crafters are not magnet pickups and clear on map change like other ground items.

Activation: walking within32px opens a paused equipment-selection dialog. Cancel/Escape/right-click preserves the Crafter; leave its radius before reopening. A valid action consumes exactly one Crafter. Cancel, invalid selection or insufficient funds consumes nothing. Admin/Drops and contact damage testing has a Spawn Crafter button.

Upgrading: select any equipped implemented weapon belowMAX for one free level. Equipped items with a definedmaxLevel can gain one free level; they cannot enhance beyondMAX. This does not spend pending level-up choices. Ordinary level-up menus no longer offer awakening.

Awakening: currently only Plana's starting umbrella may awaken, fromLV7, through a separate Crafter choice costing1SecretTechNote. It consumes the Crafter and note, and retains existing golden outline/sparkles. Supernova/other weapon awakening is unavailable. The LV7umbrella guaranteed3xsupercritical upgrade remains distinct from its separate awakening step.

Enhancing: MAX weapons may enhance without a rank cap. Next rank r costs50*rCredits. SuccessChance=min(1,max(0.1,1-0.1*(r-1))+storeBonusPercent/100). Future Enhancement Rate Up uses `player.enhancementRateBonusPercent` (default0). Paid failure loses the Credits and Crafter without increasing rank. Each successful rank adds2base damage divided by primary projectile count. Enhancement damage is added after weapon-level/enchantment/Mod bonuses, does not receive those base bonuses or Growth, and still receives ATK/crit/other final damage multipliers. Automatic Supernova LV7splits over2primary beams; secondary EX/on-hit attacks do not add split count. HUD captions show enhancement ranks.

Future, inactive systems: Crafters Gear extra uses; Credit Card item; Enhancement Rate Up shop purchase; enchantment shop unlock and specific enchantment lists; pre-enchanted offers; synergy weapons and Golden Crafters. No invented enchantment pool or synergy recipe is active. Enchanting, once unlocked, costs250Credits, excludes the starting weapon and replaces previous rolls. Default1enchantment; a GoldenCrafter synergy combining two enchanted MAXweapons may inherit2, including duplicate rolls; reroll replaces both. Compatible enchantment list still to be supplied.

GoldenCrafter design retained: only when at least2MAXweapons have an available synergy combination; at most1on ground. DropChance=(1+minuteTimer/20)/100 (helper `goldenCrafterChance`). Since no synergy recipes exist, GoldenCrafters do not currently spawn.

Crafter drop presentation:steady white ground glow plus a narrow soft cyan-white pillar through and above the icon. Drawn behind the icon with additive light; no flashing. Editable crafterSettings.glow:height120px,width24px,baseRadius32px,opacity0.75. Visible white arrow sits above the pillar;offscreen directional arrows preserved.

Crafter menu layout updated to reference:full simulated-screen overlay with holographic character stats atleft,UPGRADEheading,6weapon slots ontop/6equipment slots below,cyanselectedslot andbottomdetailcard withactualicon/name/level/category/upgradeeffect. Selection only previews;Confirm appliesoneuse. Keyboardarrows/Enter/Space supported;Shift/Escape/rightclickcancel. MAXweapon Enhance/Awaken choices sharefooter. Gamefont/transparenticons usecorrectcanvasstyles,andmenu/fontscalealignstoactualcanvasbounds.

Crafter activation now uses the real player ellipse touching the rendered scaled icon rectangle, not distance from the ground anchor. Shared crafterSpriteBounds keeps drawing/contact aligned. Swept contact catches fast crossings;rounded corners avoid false activation near misses. AfterCancel,reopening requires leaving the icon with8pxclearance. Supersedes old32pxground-radius activation.

Umbrella automatic swing base size is now85%viaumbrellaSettings.sizeScale,sharedbyvisibleumbrella/trail/hitreach. Area upgrades still use sqrt(1+0.2*upgradeCount);withboth upgrades0.85*sqrt(1.4)=1.0057,approximatelythepriorbase size. EX projectile/icon/damage/timing unchanged.

Pause and Crafter now share character-stats-panel.js for the same holographic portrait,cyan filtering/scanlines,stat icons,bitmap font andvalue formatting. Both panels refreshcurrentHP/statvalues when opened. Crafter preserves its game-viewport scaling andinventory layout.

## Golden Crafters (implemented foundation)
Golden drop/UI/fusion framework now uses the shared Crafter system with golden=true. Gold-tinted crafting icon, glow/pillar and triangle;gold-accentedmenu showseligibleMAXweaponfusions andhighlightsbothingredients. Automaticdrop requires a realrecipe fromsynergy-recipes.js andtwoequippedMAXweapons;chance=(1+fullRunMinutes/20)/100 perdefeat,atmost1GoldenCrafterground. AdminSpawnGoldenCrafterbypasseseligibility,butnotcap. No inventedcombinations areactive;registryemptyuntilnewweapons/recipesarrive.
Confirmationatomically replaces2ingredientswith1synergy,freesoneslot,andconsumesGoldenCrafter. Cancel/invalidpair preservesdrop/inventory. NoCredits/pendinglevelups spent. Inheritsoneenchantmentperingredient,upto2includingduplicates. Genericupgrades/enhancementsareunavailablethroughGoldenCrafter. BothCraftingmenussharepause,hitboxcontact,mapcleanup,andcancel/reentryrules. RecipeinterfaceisdocumentedinSYNERGIES.md.

GoldenCraftermenu nowusesSYNNERGIZE!heading/action,oneweaponrowandtwoselectedingredientpreviewsseparatedby+. SelectedcompatibleMAXpair receiveswhite rotatingwindarcswithsoftbriefpulses. Weaponsoutsideallvalidrecipesareunselectableanddimmed;equipment/stats/currencyrowhiddeninthisfusionlayout. NormalCrafterlayoutunchanged. Reducedmotionusesstaticwindarcs. No validpairmeansdisabledfusionandnoringsuntilactualweaponrecipesexist.

## Luminous Nova (Kei)
Weapon controller:luminous-nova.js;editablevalues:luminousNovaSettings in game-config.js. Uses provided Weapon_Icon_Kei.png. Available through normallevel-up acquisition/levels1-7,Crafterupgrades/enhancements,andAdmin/Skills > Equip Luminous Nova. Automaticweaponrunsindependentlyofotherweapons/EX;globalDisableautoattackscoversit. NoEXorsynergyrecipeinvented.
Base140%weaponfactor=14nominaldamage,12-16randomizedat100ATK;2.5sbasecycle,1primarybullet,unlimitedpiercing,per-shot/per-enemyhitcooldown10/60s,0.75slifetime,1200px/s(20pixelsper60Hzframe),900pxtravel. Sphere diameter matchesSweeperdisplay size53.76px;shortteardroptail andlayeredpinkadditivebloom arevisualonly.
LV2damage*1.2;LV3firerate2x;LV4damage*1.3(multiplicativewithLV2=1.56);LV5firerate3x;LV6adds0.25s knockbackat420px/s(105pxbefore resistance);LV7firerate4x. Cadence=attackTimeFormula(2.5/fireRate,Haste),shotsstaggeredevenly,notburstedorcompounded. WithoutHaste,intervals2.5/1.25/0.833333/0.625s. Hastechangesonlyattackinterval. Flat enhancement/Growth bonuses split byprimaryshotcount1/2/3/4,not bysecondaryeffects. Eachbulletlocksitsinitialrandomtargetdirectionandusesasweptheadhitcheck;normaldamage/crit/miss/knockbackresistancerulesapply.

## Luminous Nova EX (current)
Pattern:circle with a centered diamond. New local geometry/whole-pattern accuracy matching and isolatedQuickDraw assistance accept flexible size,aspect,strokeorder/direction,while routing independently fromUmbrella/Supernova. Registered withnormalcasting,independent180scooldown,adminslot-numbertesting,andpauseEXSkillsreference.
For25simulationseconds,the player gains a pink flamingaura,+51%damagebonus(DBmultiplier1.51,additivewithotherDBsourcesperexistingrules)and+22.3percentagepointsCRT. Temporarybuff lives underplayer.combatBuffs anddoesnotmutate permanentstats;CRTpanelincludesit. Menusfreeze it;mapchangespreserve it;weaponremoval/characterswitch/reset removesit. Recastingreplaces,ratherthanstacks,thebuff. Otherweaponscontinueautomaticattacks.
AcceptedactualenemyHPdamagebythisplayerfromallweaponsisbankedonlyduringtheaura;misses,overkill,eventcleanup,incomingdamageandforcedharmlessremainingHPremovalareexcluded viaworld-state.onEnemyDamage. At25s,buffendsanddamagebanklocks. Kei'sgunemergesfrombehindplayerover0.336s,charges0.9s whilefollowingaim,thenlaunchesalargepinkplasmabulletwithlockedangle. Gunretracts0.28s. Luminousautoattackbrieflypausesthroughopening/charge/retraction;otherautoattackscontinue.
Finisherdamage=min(round(0.1*bankedActualHPDamage),floor(50*10*totalCharacterATK/100)). Userconfirmedcapis50xplayerbaseattackafterATK%,notLuminousshotdamage. At100totalATKcap500;at200cap1000. Noextracrit/ATKrollisappliedtothisalreadybanked/cappeddamage. Onehitperenemy,unlimitedpiercing;diameter134.4px,speed1200px/s,lifetime1s. Buffmagnitudeandfinisherformulaarefixed,notmultipliedbydrawingaccuracy. ValueseditableinluminousNovaSkillSettings.

LuminousNova finisher update:afterAmplifier ends,gunautomaticallyaimsathighestremainingHPenemywhose sprite overlapsvisibleviewport. Atlaunchitlocksoneenemy;largebullet homesonto thatenemyandignoresallbystanders. Dead/losttargetendsprojectilewithoutcollateralretarget. Initial281%ATKhitusesnormaldamage/criticalrules;then100%storedskillchargeappliesasaseparatenoncriticalhitiftargetsurvives. NoextraATKorcriticalrollonstoredcomponent. Keptpreviouschargeformula(10%actualauradamage,capped5000%playerbaseattackafterATK)becauseuserrequestedaddition' aswell';questionaskedwhetherreplacewith100%rawauradamage,answerednotyetatimplementationtime. Flighttimeout3s toallowfull-screenhoming;gunreturnanglelocksindependentlyofbulletsteering.

LuminousNovaEXclarification:storedfinisherchargeisnowaplayer-centeredAoEwhenAmplifierends,notbonussingle-targetbulletdamage. Keeps10%actualauradamage/5000%baseattackcap,andcannotcrit. InitialAoEradius240pxandsoftpinkring0.45sareeditable. AfterwardKeigunopens/chargesandfiresamanuallyaimed281%ATKlargepinkbulletwithunlimitedpiercing,onehitperenemy. Followsaimduringpreparation,locksangleatlaunch,nohoming/highestHPselection. Bulletusesnormalcriticalrules. Supersedesprevioussingle-targethomingbehavior.

LuminousNova icon now rotates45degrees inHUD/levelup/Craftericons. Automaticweaponcontinuesfiringwhennoenemiesremain,usingcurrentaim/arrowdirectionasfallback;whenenemiesexistitstillchoosesrandomtargets. ThisalsofixesstarvedshotswhenotherweaponsclearthepopulationbeforeLuminousupdates. Addedno-targetvisualpreviewfixtureandregressions.

- Luminous Nova automatic shots follow the current arrow/crosshair aim, like Supernova. Each projectile keeps its launch direction; enemies do not override aiming.

- Enhanced MAX weapons (LV 7, enhancement +1 or higher) display a colored icon glow: Luminous Nova pink, Supernova blue. This is separate from Plana's golden awakening visuals. HUD, Crafter and upgrade previews share the same rule.

- Updated glow rule: Luminous Nova and Supernova gain their pink/blue icon glow immediately at LV 7. No enhancement rank is required (supersedes the previous enhancement-only rule).

- Synergy rules: owning a synergy excludes its consumed ingredient weapons from level-up acquisition and upgrades. Fusion stores consumedWeaponIds on the result; The Princess and the Key blocks Supernova and Luminous Nova. Stale upgrade selections must also be rejected.
- Synergy icons must visually match the other HUD weapon icons; trim transparent padding in source art before composing crossed weapons.
- Golden Crafter ingredient boxes start empty and must remain clearly separated around the plus sign, with non-overlapping names.

- Synergy weapons have no level-up upgrades and must not appear in the level-up menu. They remain LV 1; only Crafter enhancements improve them (LV 1 +1, +2, etc.).

- Crossed synergy icons preserve each ingredient's glow (Supernova blue, Luminous Nova pink). The ingredient that reached MAX first is drawn on top, using recorded maxedOrder from level-up or Crafter upgrades. For older/debug weapons without history, inventory order is the fallback.

- Enemy hurtboxes (receiving player attacks) use the rendered sprite pose rectangle, separate from contact-damage hitboxes. All weapons use getEnemyHurtbox; NPC/player contact continues using getCombatHitbox unchanged.

- Enemy hurtboxes use one cached oval fitted to an equal-weight overlay of all aligned animation frames (directions and attack clips included), rather than per-frame geometry. The hurtbox remains stable during animation and cosmetic bounce. Contact hitboxes are separate.

- Gacha Files are boss delivery drops. Admin controls spawn normal/triple/super Files. Super Files fall back to normal until eligible super items are defined; no placeholder super item effects were invented.

- Princess/Key EX is now implemented: linked-frame drawing,Kei amplifier plus half-second Supernova ticks,damage-bank amplification,and4second delayed stationary residue blasts. Default beam3seconds,buff25seconds; pending user timing preference may revise this.

- Confirmed timing for The Princess and the Key EX: 3-second beam and 25-second amplifier buff. This resolves the earlier pending timing question.

- Updated Princess/Key EX pattern: exactly three interlocking squares. Left square sits slightly higher than right; third square is between them and overlaps both. Removed the former small fourth upper-right frame. Recognition and pause reference use this pattern.

- Corrected synergy EX firing: never clear in-flight bullets or stop the stream at EX transitions. EX start changes only newly spawned bullets to blue/wider/slower60/s,then returns to pink/narrow80/s after beam presentation. Existing rounds keep their original appearance and travel until offscreen/hit limit.

- Blue Princess/Key EX bullets have unlimited pierce,stored per projectile so this persists afterEXends;normalpinkrounds retain4hitlimit. File rewards use the same createCharacterStatsPanel renderer and row sizing as Crafter,with Pause panel positioning (left5%,top13%,width26%,height72%).
