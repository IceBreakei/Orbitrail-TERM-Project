# Combat and weapon design notes


## Current implementation status

This section supersedes older pending-status paragraphs below.

- Combat formulas, EXP curve, Umbrella sweep, Supernova autoattack/EX, cooldowns and pause reference are implemented. Supernova recognition requires both side lines.
- Score counters/snapshots now connect to real defeats, campaign boss-wave clears and endless defeat. The Score testing dropdown shows the latest result. Counts/time are cumulative for the run. Leaderboard placement/persistence remains deferred; cleanup removals do not count.
- Yuuka and Sensei use HP9,999,999,999,ATK0,2.5x base-player speed,zeroEXP and25second lifetime. Sensei is available in the NPC selector. At expiry they run toward the nearest edge and despawn only once offscreen. The timeout escape remains; player hit-count defeat is also supported as described below. Adminseed0 intentionally retains1HP for all enemies.
- Yuuka now rolls30% at3:00,9:00,17:00, replacing kill/arrival-based odds. Automatic timed spawning respects the development spawning toggle. Manual spawning bypasses automatic restrictions.
- Sensei timestamps are still unspecified: automatic list is empty, manual testing works. Both retain the existing1credit perhit until credit caps/rewards are defined. Escaping gives no loot/kill credit. Tuning Parts/item boxes remain future work.
- Instant-KO requests reject bosses/mini-bosses/explicit immune enemies. No instant-KO attack was invented.
- Enemy scaling equations and optional endless clock exist as helpers; live activation awaits stage base-stat tables. Existing live scaling remains; do not stack both models.
- Spawn patterns/telegraphs are specifications awaiting event timings, counts and assignments; no automatic pattern schedule was invented.
- Growth, enhancements/Tuning Parts/enchantments, secret stage, undefined bosses, item boxes and leaderboard placement/submission remain deferred.



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

| Plana's Umbrella | 12 | 10â€“14 |

| Aris's laser | 30 | 27â€“33 |



At +100% ATK, the starting Umbrella has 24 nominal damage. Its random range is 21.6â€“26.4 before final rounding.



## Weapon bonuses



Independent damage bonuses multiply with each other and the base weapon damage. Two +30% upgrades give `1.3 * 1.3 = 1.69`, rather than 1.6. Umbrella therefore reaches a 1.69 weapon damage multiplier at level 5.



Future applicable Tuning Parts, enchantments, and weapon-specific character abilities belong in this same product. They must only affect eligible weapons. Growth is added separately and must not be multiplied by these base-weapon bonuses.



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



Enhancements beyond maximum weapon level, Blacksmith's Gear, Tuning Parts, enchantments, projectile enchantments, and the Growth purchase shop are **not implemented yet**. Reserved costs do not spend currency automatically.



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
- **CRT:** critical chance in percentage points. Normal critical damage is1.5x; explicit weapon rules override it (Umbrella LV7 guarantees3x). Applicable target debuffs add to character CRT before clamping chance to0â€“100%. The shared roller accepts targetCritBonus; no debuff system is introduced here.
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

Unlike additive Damage Bonus or damage-taken debuffs, independent reductions multiply. Two20% reductions give0.8*0.8=0.64 received damage (36% total reduction). No reductions gives1x. Each configured reduction is limited to0â€“100%;100% gives zero damage.

Set target.damageReductionPercent to an array of reduction percentages. Shared weapon/EX damage applies enemy DR before final rounding, independently from attacker DB and target vulnerability. Player damage applies player DR before shield absorption and HP loss, rounding once at this reception step. A hit reduced to zero causes no damage flash or damage popup. The existing admin Reduce HP action uses this same damage path. No items or timed reduction effects are introduced yet.


## Halo proximity multiplier

Halo is a separate item multiplier, applied independently of ATK, DB, critical damage, target vulnerability and DR before final rounding.

| Target distance from character | Halo LV1 | Halo LV2 | Halo LV3 |
| --- | ---: | ---: | ---: |
| Less than130px | 0.9x | 0.9x | 0.9x |
| 130px or farther | 1.2x | 1.4x | 1.6x |

Set character.haloLevel to1â€“3 for testing; missing/0 means unequipped and1x damage. Settings and haloDamageFormula are in game-config.js. Shared weapon/EX damage uses character-to-target world-coordinate distance at impact, not distance from the projectile. Missing target coordinates apply no Halo modifier. Equipment acquisition/UI is not added yet.


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


## Enemy power scaling â€” pending equations

Enemy stats depend on stage-specific base stats and elapsed run time. Stage enemy pools/base stat tables will be provided later.

Time inputs supplied:

- minuteTimer: the minute component of the run timer (0â€“59).
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
| Endgame | 23:00â€“30:00 | a>0; stats rise gradually. |
| Kill screen | After30:00 | b>0; stats rise sharply each minute; reference game replaces the pool with YAGOOs. |

Project adaptation: campaign stages1â€“4 should occupy the pre-endgame portion; begin transitioning into endgame upon reaching endless, approximately20minutes into a typical run. The phase should follow actual campaign completion rather than assuming the player always finishes in exactly20minutes. Exact remapping of a/b time inputs and the later kill-screen threshold remain to be defined alongside the missing equations.

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


## Enemy time/stat equations â€” supplied

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

- **Stage Mode (campaign stages1â€“4):** when the player completes a stage. Preserve boss-defeat-driven stage progression; score calculation is a completion milestone, not a new timer condition.
- **Endless Mode (after completing Stage4):** when the player is defeated. Development invincibility can prevent defeat even at0HP; testing score-on-defeat will need an explicit defeat path or invincibility disabled.

Leaderboards display the highest scores for each character. Leaderboard placement, presentation and storage will be specified later. No leaderboard UI, online writes or persistence schema is introduced now. Guest play remains unsaved under the established guest policy.

Pending: the actual score equation, stage-versus-run aggregation, inputs and weights, tie rules, and whether/how Development runs qualify. Earlier boss/mini-boss defeat counts are intended score inputs, but their weights are not yet specified. No score is fabricated from incomplete rules. These milestones are a design specification until the calculation and results flow are implemented.


## Score calculation â€” supplied formula

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

Yuuka:30%spawn chance at designated timestamps3:00,9:00,17:00 on any map, credits perhit, and a guaranteed Tuning Part on hit-count defeat. The supplied maximum-credit table has no numeric amounts. Sensei:20%chance at designated timestamps (not supplied), credits perhit; hit-count defeat yields a massive credit burst plus a future item box. Timeout despawns after25seconds. Exact hit thresholds/credit amounts, movement-unit interpretation and Sensei assets/timestamps remain pending.

These notes supersede Yuuka's earlier design intent but do not silently replace the currently implemented kill-based Yuuka spawning/HP/EXP/movement rules. ATK0 is already live. Tuning Part/item box systems remain deferred; reference Silver YAGOO wording does not add a separate YAGOO enemy.



### Supernova EX knockback update

The continuous EX can damage each enemy once every0.2seconds, independently of the automatic beam's1second hit cooldown. Each successful EX hit pushes toward the nearest side of the beam, with a small forward component. Sideways travel accounts for beam width, the enemy's projected body radius and32px clearance; forward shove36px; travel/recovery0.2seconds. Centered targets consistently choose one side. Missed hits do not knock back.

Settings are in supernovaSkillSettings. Existing knockback resistance, absolute immunity and enemy/scenery collision stops still apply, so resistant or blocked enemies may remain in the beam. Automatic beam knockback remains unchanged.


### Harmless enemy hit-count defeat

Latest clarification: Yuuka/Sensei can be killed by the player after enough successful hits. They still run away on the25second timeout if not defeated first. Every accepted positive hit increments receivedHits once regardless of damage; rejected hits/misses do not count. At the threshold they use the normal death animation, credits-on-defeat and real kill/score notification path, while still giving zeroEXP. Future Tuning Parts/item boxes remain deferred.

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
| second | arisu | 45000 | 20 | 1 | 6000 | 12:00 | boss |
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

Enhancing: MAX weapons may enhance without a rank cap. Next rank r costs50*rCredits. SuccessChance=min(1,max(0.1,1-0.1*(r-1))+storeBonusPercent/100). Future Enhancement Rate Up uses `player.enhancementRateBonusPercent` (default0). Paid failure loses the Credits and Crafter without increasing rank. Each successful rank adds2base damage divided by primary projectile count. Enhancement damage is added after weapon-level/enchantment/Tuning Part bonuses, does not receive those base bonuses or Growth, and still receives ATK/crit/other final damage multipliers. Automatic Supernova LV7splits over2primary beams; secondary EX/on-hit attacks do not add split count. HUD captions show enhancement ranks.

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

## Arisu boss dash
Arisu chases normally between attacks. Every 8 seconds she enters the charge animation and stands still for a 4-second windup. A translucent red lane tracks the player during windup; twin inner lines close toward its center. At launch the angle locks, then Arisu launches at 1375 px/s, then decelerates after passing the player's locked X/Y coordinates in the dash direction (minimum 220 px/s until offscreen). Dash contact deals a fixed 20 damage, respecting player I-frames. Ordinary dash contact processing is suppressed to avoid substituting normal contact damage. Settings: bossBehaviorSettings.arisu in game-config.js.

Arisu sprite size is 120% of the previous boss size. Warning lane width is 140px, centered on the rendered sprite bounds rather than the movement anchor.

Arisu warning is lowered 20px. Tracking freezes after 3 seconds; she launches at 4 seconds. For diagonal movement both relevant locked coordinates must be passed before braking; cardinal movement compares only its moving axis. The target is captured when tracking locks, so dodging during the final second does not retarget her.

### Arisu dash braking update
Arisu begins braking 80px before the locked target threshold. Braking covers 160px and reaches zero speed, ending roughly 80px beyond a stationary target instead of coasting offscreen. On stopping (or reaching the offscreen safety bound), her action clears and normal chase resumes; a fresh 8-second attack cooldown starts then. Windup remains 4 seconds, tracking locks at 3 seconds, damage remains 20. This supersedes the prior minimum-speed/offscreen-coasting rule.

### Arisu timed deceleration
Braking now lasts exactly 1.5 seconds with a continuous linear speed reduction to zero. Maximum dash speed remains1375px/s; short dashes cap their launch speed to fit the full braking interval while stopping near the locked target. Braking begins early enough to end80px beyond the locked target; no offscreen early-exit truncates the braking animation. Chase resumes with a fresh8s cooldown. This supersedes the160px fixed braking distance.

Arisu (second boss) updated base stats:45000 HP,20 ATK,1.0 SPD (100% unmodified player base speed),6000 EXP. Campaign and manual/default type profiles both use these values. Admin seed0 still overrides health to1 for testing. Dash damage remains20.

### Arisu visible body size
arisuBossSizeMultiplier=1.66 in game-config.js supersedes1.2. Reference body heights excluding the floating halo are approximately112 source pixels for Arisu (200px referenceSize) and321 for Shiroko (374px referenceSize). At current display sizes, body heights match within2world pixels. A single scale is retained for all Arisu animation frames/actions.

### Arisu body/chase and full-speed dash
Arisu chase now offsets the movement anchor so her visible body center (excluding halo) aligns with the player. Warning lane shares that body center and is194px wide to reflect the enlarged sprite. Dash always launches at1375px/s, removing the nearby-target speed cap. Timed1.5s braking remains and begins80px before the locked target threshold. Full-speed braking covers more distance than the former short-range capped launch; it may carry her offscreen before normal chasing resumes. This supersedes the earlier nearby-target stopping-distance guarantee.

### Arisu overshoot correction
Windup3seconds, tracking locks2seconds (final1second fixed aim). Full1375px/s launch retained. Braking begins at the locked directional player threshold and uses a continuous front-loaded power ease over1.5seconds. Integrated braking distance is220px, replacing the prior1031.25px linear-braking overshoot. Normal chase and8second cooldown resume after braking finishes.

### Arisu runaway dash fix
Dash range now uses projection along the warned direction from the same visible body center used to aim. This replaces separate X/Y component division, which could generate extreme distances when one direction component was nearly zero. Tracking remains locked for final1s. Braking travel remains220px over1.5s. Completion resets normal GIF phase, clears stale contact reaction, and returns control to chase in the same NPC update with a fresh8s cooldown.

### Arisu fleeing-player braking
Dash direction still locks after2s of3s windup. The braking threshold now follows the player's current projected position along that fixed direction until braking begins, rather than the old locked warning position. This allows Arisu to pass a player fleeing left before slowing. Braking itself remains bounded220px over1.5s and does not retarget or extend once started.

### Boss map collision exemption
All boss entities bypass props, island boundaries and finite strip-map edges during chase movement. This permits body-centered Arisu to reach a player near the upper wall without the oversized sprite margin clamping her anchor. Player map collisions and boss-player contact damage remain active.

### Iroha cannon warning
Cannon now has1second stationary windup with left/right locked red lane and closing inner lines, followed by firing animation and900px/s radius18 glowing shell. Origin uses barrel offset30px downward and35percent sprite width to the facing side. Damage uses current Iroha contactDamage (campaign20). Total cannon action1.88seconds; artillery alternation unchanged. Settings in bossBehaviorSettings.iroha.

Shiroko latest base stats:25000HP,20ATK,1.2SPD (288px/s),5000EXP. Stage1 boss spawn remains06:00 per explicit clarification; image20:00 timing was not applied.

### Boss progression and Iroha stats (latest)
Arisu defeat alone clears Stage2 and queues Stage3 after1.5s. Removed the OPS mini-boss/14:00 wait requirement; Stage2 clock freezes at Arisu12:00. Later Stage2 event rows remain configured but are not reached during normal progression. Iroha is a full Stage3 boss at17:30,55000HP25ATK.75SPD(180px/s)6000EXP; defeat queues Stage4 after1.5s. Default/manual type profile matches. Unopened Gacha Files carry through automatic stage transitions rather than blocking them. Active reward dialogs pause gameplay normally.

Neru latest boss stats:57000HP20ATK.9SPD(216px/s)2000EXP. Stage4spawn remains20:00; behavior and boss-clear progression unchanged.

Iroha cannon latest visual/speed:2400px/s (previous900). Blue shared player plasma renderer with gradient bloom and continuous tapered tail, diameter10 and18px collision radius. Warning1s, fixed horizontal aim and existing25campaigndamage retained.

### Iroha attack selection and delayed shell
Cannon release is now1.5s after action start (1s windup+.5s extra delay), warning remains until release. Attack selection replaces alternation: overlap/predicted entry into barrelY horizontal lane favors cannon when horizontal displacement dominates; vertical/X-aligned players favor artillery. Prediction uses current player movement over.6s. Cannon direction locks when attack starts. Iroha remains stationary for preparation/firing.

### Iroha weighted casts and piercing
Cannon projectile pierces the player and continues until lifetime/owner cleanup. A shell deals damage to the player at most once. Attack pool is recalculated once per action start. Equal playerY/IrohaY guarantees cannon; equalX with vertical separation guarantees artillery. Intermediate offsets weight cannon by horizontal dominance and barrel-lane proximity; approaching lane prediction can increase cannon weight. Roll is sampled once and does not change an ongoing attack.

### Iroha timed interception
Cannon cast now solves impact time from current player velocity, horizontal muzzle position,2400px/s speed and minimum1.75s preparation. Release can wait up to4extra seconds for a future lane crossing; warning remains visible and firing animation is synchronized to release. Cast angle/time lock at preparation start. A trajectory change can dodge; unchanged reachable horizontal/diagonal paths are intercepted. If no possible intercept exists within preparation/wait/lifetime constraints, cannon is removed from that cast's chance pool and artillery is used. Shared player I-frames still apply.

### Iroha random cannon baseline (latest)
Cannon chance is now60percent minimum, blended upward by positional preference to100percent at matchingY. Prediction does not gate attack selection. A cannon roll uses a valid intercept plan when available; otherwise it uses normal1.75s release toward the player's current side. This supersedes prior no-intercept-forces-artillery behavior. cannonBaseChance in game-config.js is editable.

### Iroha angular chances (supersedes60percent baseline)
Cannon probability=1-atan2(abs(playerY-irohaY),abs(playerX-irohaX))/(PI/2). Horizontal100percent cannon,vertical100percent artillery,45degrees50/50. Same rule mirrored across all quadrants; exact overlap50/50. Sample once at cast start; cannon prediction is applied afterward without changing pool probabilities.

Iroha angular odds now use cubic easing: t=(angle-45)/45; cannon=.5-.5*sign(t)*abs(t)^attackAngleExponent, exponent3. Axis endpoints and45degree50/50 preserved; changes accelerate near axes, especially beyond70degrees. Approx cannon chances from horizontal:45deg50%,70deg41.4%,80deg26.5%,90deg0%. Symmetric across quadrants.

### Iroha reference hyperbola (latest)
User supplied steep-drop curve screenshot. Replaces cubic/45degree50percent rule. Let u=atan2(absdy,absdx)/(PI/2). Cannon=(1-u)/(1+attackAngleSteepness*u),steepness100. Artillery=1-cannon. Desmos normalized axes equation y=(100-x)/(x+1). Horizontal100percent,vertical0percent cannon;45degrees~.9804percent cannon.

### Iroha corrected quadrant sigmoid (latest)
Example hyperbola was illustrative only. Actual desired pool uses u=angle/90, Cannon=(1-u)^3/((1-u)^3+u^3), Artillery=1-Cannon. Each quadrant mirrors this:0deg100cannon,10deg99.805%,30deg88.889%,45deg50%,60deg11.111%,80deg.195%,90deg0. Config attackAngleExponent3. Supersedes hyperbola and older cubic curves.

Iroha curve softened: attackAngleExponent=ln(9)/ln(8), approximately1.05664, replaces exponent3. Exact10degree cannon90percent,45degree50percent,80degree10percent; axis endpoints unchanged.

Iroha now chases throughout cannon preparation/firing and artillery actions. Movement uses ordinary chase speed/target while attack poses and cannon facing are preserved; warning/projectile origins update after movement. This supersedes previous stationary-windup rule.

### Iroha artillery formations
Artillery uses5targets: center plus4arms. Cardinal/stationary movement gives+, diagonal movement (minor/major axis ratio>.4) givesX. Arm spacing145px,radius64. Circles warn1.5s and disappear, shells fall.35s diagonally from the side Iroha occupied when targets were marked. Damage occurs once on landing (currentbossATK25), sharing normalplayerIframes. Supplied arty explosion.gif plays once with13frames/1.4s original timing. Iroha continues chasing while effects run.

### Artillery expanded warning formation
Radius96px(50percent larger). Inner warning ring shrinks smoothly to center across1.5s, outer damage circle remains. Formation bounding width/height is70percent of visible viewport, including circle edges, centered on targeted player location. Arms populated with intermediate circles at up to145px spacing. This supersedes5target145px arm formation. Cropping near viewport edges is possible when player is near an edge; targets remain fixed worldpositions.

Artillery now staggers target warnings and landings by0.25s in formation order. Each target independently gets1.5s closing-ring warning then.35s falling plasma shell; pending warnings remain hidden. This supersedes simultaneous warning/impact timing.

Artillery latest correction: exactly5circles(center+4arms) appear simultaneously for1.5s. Allwarningcircles disappear together. Only falling-shell launches/impacts stagger at.25s intervals.70percent viewport footprint and96px radius retained; intermediatearmtargets removed.

### Artillery reference cluster arrangement
Latest pattern uses5equalroundcircles:center and4neighbors at1.8rspacing for slightoverlap. X is exact45degrotationof+. Scale+footprint to70percent of shorter viewportdimension (504x504 at1280x720,radius90). Supersedes independent70percentwidth/heightspreading. Allwarningsstilltogether; impacts.25sapart.

Artillery coverage factor now1.4(twice previous.7). Radius180,armspacing324,+footprint1008squareat1280x720. Circles/damage/explosiongraphics scale together;5circles overlapratio/timing preserved. This doubles linear dimensions, yielding4times the previous area.

Artillery explosion playback now uses sourceframes0–7only(.9s). Sourceframes8–12 restartanotherburstafterfade,soareexcludedfromplayback. Rendererexplicitlystopsatduration. Onevisualburstperimpact; originalGIFunchanged.

Artillery warning latest:circles now appear staggered.25sapartmatchingtheirimpactorder. Eachcirclepersistsuntilitsownimpact,includingthe.35sshelldescentafter1.5swindup. Innerclosingringfinishesatimpact. Supersedes simultaneouswarningappearanceanddisappearbeforedrop.

### Predictive artillery after sustained movement
Track player direction once peractive tick. After5seconds without stopping/turning (small5.7degree tolerance),artillery may lead at50percent chance. Formationcenter shifts1secondofcurrentvelocity,maximum300px. Otherwisecenteredonplayer. Warnings/targetslockatcall;stopping/turningresetsqualification. Config artilleryLeadAfter/Chance/Seconds/MaxLead.

Iroha cannon combos: independent30percentchanceforartillerybeforecannon and30percentaftercannon. Chainedactionsstartwithoutregularcooldowngap; eachretainsitswarning. Precannonartilleryqueuescannon;postcannonartillerydoesnotloopanothercannon. Normalpositionalbasepoolunchanged. Sequenceendsetsfull6scooldown. ConfigartilleryBeforeCannonChance/artilleryAfterCannonChance.

### Neru stomp (latest)
Compression.55s,rise.3s,airborneshadowtracks3s,lockedshadow1s,descent.2s. Sprite offset places her aboveviewportduringhang. Shadow follows until lock then remainsfixed; onlanding20damage/currentATK within75pxradius,sharedIframes. Shootingattackunchanged. Airbornecontactchecksremainexcludedusingleapaction. Landingmarkersremovedwhenactionendsorownerdisappears.

### Neru stomp refinements
Shadoworigin=takeoffposition; moves480px/sminimum,or1.5xplayercurrentvelocityifhigher,duringtrackingwindow.40percentlarger(radius105),nooutline. Impactshake.3s/7pxmax isrender-only,HUDstable. Landingsquash.55recoversover.5s,thenchase. Nerushotsusesharedorangeplasmavisuals,nominaldiameter3px;contactradius5/damageunchanged.

Neru latesttiming:squash1s,smoothrise1s,track3s,lock1s,fall1s,landingsquashrecovery1s. Squashpivotatfootbaselinekeepsbottomfixed. Shadowopacityconstant.35(noimpendingimpactdarkening). Supersedespreviousshortphasevalues.

### Game-only pause scope
Pause and LevelUp menus only make gamecanvasinert; surroundingadmincontrols remaininteractive. Keyboardnavigationcapturesonlygame/menufocusandignoresbrowsermodifier shortcuts. Menusaria-modalfalse. Pausedgamecanvasrenderiscacheduntilresize/resume; browserRAF/audio/menuUIcontinuesnormally. This supersedes pagewideinertblocking.

Nerushadowlatest:groundcoordinatesatfeet,hiddenuntiloffscreenafterrise,120msfadein. Trackstartsafterriseandmovesfromtakeofffeet towardplayerfeet. Landingspriteanchorcompensatesfootbaseline;nooutline/constantfullopacityretainedafterfade.

Neru shadow now fades/grows at a fixed takeoff foot point for120ms, then tracks forfull3seconds before1slock. Shadowdoesnottranslateuntilfadeends. Normal/shootGIFsusefixedvisiblebodyanchors(centerX101.5/105.5,footY182/170)forrenderandstablehurtbox. Neruchasecompensatesvisiblebodycenter. This supersedesGIFcanvas-centeredalignmentandmovementduringfade.

Neru shooting variations alternate radial and aimed stream, with stomp attacks between shootings. Stream lasts 2 seconds, fires one pink plasma bullet every 0.08 seconds toward the player's current combat center; launched shots remain straight. Uses the same speed, size and damage as radial bullets. Editable cadence: bossBehaviorSettings.neru.streamBulletInterval.

Neru bullet update: both shooting variations now use orange/yellow plasma and pierce the player (one successful hit per projectile). All Neru bullet visuals and collision radii increased another 20%: diameter 4.32, collision radius 7.2. Radial speed stays 288px/s; stream speed is 345.6px/s (+20%). Stream alternates single shots between two parallel muzzle lanes, +/-12px from the aim axis, every 80ms. Each new shot aims toward player combat center; launched bullets stay straight. This supersedes the prior pink/single-line stream note.

Tuning Parts foundation: catalog intentionally empty until parts are supplied.
Definitions live in Development/tuning-parts.js: id, name, icon path, three level descriptions/perks and three sellCredits values. Perk consumers will be connected once effects are specified; global character stats and other weapons are not modified.
Enemies roll 1/780; Yuuka always requests an eligible part. No placeholder parts drop with an empty catalog. Equipped/ground types are excluded from duplicate rolls.
Three slots, max level3. Swapping preserves levels and moves the replaced part to Found. Any consumed part grants exactly one level, regardless of consumed level. Consumed/sold types are excluded for the rest of the run.
Finish drops Found on safe ground at its current level; leave its pickup area to reopen. Pause > Tuning Parts manages equipped parts, including consuming another equipped part.
Sale = floor(level sell value * stageCoinMultiplier * (1 + moneyUpBonus/100)). Prices await definitions.
Menus pause only the game. Equipped inventory persists across maps; ground parts clear on map change. Reload resets the run.

Power Tuning is the first defined Tuning Part (temporary descriptive name, user supplied no name). Icon: sprites/icons/Event 06 - Buff 1.png. Relative pool weight4. Levels1/2/3: base weapon damage +15/+20/+25%, critical damage +5/+10/+15 percentage points. Sell prices50/100/150 Credits before stage/shop multipliers. Damage is an independent multiplicative base-weapon factor applied before flat enhancements/Growth; critical damage adds to the weapon critical modifier. Only the starting weapon receives these effects (currently Plana umbrella, including its shared damage calculation). No global ATK/CRT changes. The catalogue is no longer empty; drops and Yuuka guaranteed part rolls are enabled when this type is eligible.

Terminology clarification: every earlier gameplay reference to "Mod" or "Mods" (the temporary system name) refers to Tuning Parts. This is one system, not a separate future mechanic. Any historical statement that Mods are deferred is superseded by the implemented Tuning Parts system. Earlier weapon-damage and projectile-count references to Mod bonuses mean eligible Tuning Part bonuses; these apply only to the character's starting weapon. Yuuka's previously promised Mod reward means her guaranteed Tuning Part drop, using the current eligible pool and run exclusions. Undefined part effects still await individual definitions. Sensei's separately mentioned future item-box reward is not renamed to Tuning Parts.

Explosive Tuning: weight3, icon Event 06 - Buff 12.png; proc chance10/20/30% at levels1/2/3. On an accepted starting-weapon hit, roll for an explosion; each swing/projectile can successfully proc only once. Splash deals30% of the weapon damage calculation, including enhancement/base modifiers and the same critical modifier, but Growth is explicitly disabled. It uses normal accepted-damage/on-hit notifications and cannot recursively trigger Explosive Tuning. Plana EX splash inherits its knockback; normal umbrella currently has no weapon knockback to inherit. Greed's specific credit effect awaits its definition and is not invented here. Nearby radius48px with the existing one-shot artillery explosion animation. Base sell values50/100/150 Credits. Configuration: explosiveTuningSettings and tuningPartCatalog in tuning-parts.js. Effects tick only during gameplay and clear on map changes.

Cold Tuning finalized: weight3, icon Wooden Doll - Nagusa.png, base sell50/100/150 Credits. Each accepted starting-weapon hit has40% chance to freeze an eligible target for3seconds and deal one cold hit at50/60/70% of the weapon damage calculation (levels1/2/3). Requires4gameplay seconds since that specific enemy last successfully damaged the player; initially counts from its spawn. Contact and all boss damage sources reset their owner's timer on accepted damage, not on I-frame-rejected attempts. Already frozen/dead targets cannot trigger again. Uses existing Frozen overlay/animation/facing rules. Primary umbrella,EX and inherited explosion on-hit paths supported; cold damage does not recursively invoke itself. Definition in tuning-parts.js, behavior in cold-tuning.js.

Critical Tuning:weight2,Unidentified Data Chip.png,levels1/2/3 add10/20/30 percentage points of starting-weapon critical chance. Adds to base,buff and target crit bonuses before0-100%clamping;does not change global CRT or other weapons. Sell50/100/150 Credits. Available in admin spawn buttons and natural weighted drops.

Luxery Tuning (user spelling): weight3, Mansion Invitation.png, sell50/100/150 Credits. Starting-weapon accepted hits have base3/4/5% proc chance. bonus=floor(min(100,hitDamage)/10); procChance=(base+bonus)/100. Successful proc drops one ground Credits pickup worth1+irandom(bonus), inclusive0..bonus:1-11Credits maximum. Uses requested per-hit weapon damage, including crit and overkill. Main umbrella,EX,Explosive splash andCold on-hit paths participate; misses and rejected hits do not. Credit pickups use existing scatter,safe landing,magnet and collection rules; rewards are not added immediately. Admin spawn button generated from catalog.

Hasty Tuning:weight2,Millennium Flag.png,base sell50/100/150 Credits. Starting-weapon attack time multiplies by0.85/0.80/0.75 at levels1/2/3. Combines multiplicatively with weapon-level interval reductions and character Haste,before existing frame rounding/minimum. Does not modify Haste stat,hit cooldown,swing duration or EX cooldown. Available via weighted drops/admin spawn.

Knockback Tuning: weight3, Event 32 - Lost Item 17.png, base sell50/100/150 Credits. If the starting-weapon hit has no existing knockback, add speed5/8/12 pixels per frame over5/8/12 frames (duration frames/60, distance25/64/144px before resistance). If it already has knockback, multiply its displacement/speed by1.3/1.5/2 and keep its duration. Normal umbrella and its inherited explosive splash gain new knockback; umbrella EX and its splash retain their existing direction/duration with strength multiplier. No extra stun from the part. Existing knockback resistance, immunity and collision stopping rules remain in use. Available through weighted drops/admin spawn.

Repair Tuning: weight1, Pipe Wrench.png, sell50/100/150 Credits. Accepted starting-weapon hits can attempt healing at most once per gameplay second, with15% success chance. Successful healing is a random integer from1 through floor(maxHP*0.05/0.10/0.15), capped by missing HP. Both success and failed rolls spend the one-second gate; full-HP hits do not roll. Shared gate prevents secondary/explosion hits from bypassing it. This is independent healing, not life-steal and not scaled by hit damage. The cooldown ticks only during gameplay and follows run Tuning Part state. Main umbrella,EX and inherited on-hit paths supported. Configuration in repair-tuning.js and tuning-parts.js; admin spawn generated automatically.

Speed Tuning: weight3, Event 41 - Slippers.png, sell50/100/150 Credits. All levels apply an independent0.8 starting-weapon base-damage factor; other weapons are unaffected. SPD gains20/30/40 percentage points additively to the character's other SPD bonuses. These perks are derived from equipped parts, not stored into base stats, so removing/swapping/selling immediately removes both effects without drift. Shared Pause/LevelUp/Crafter/Tuning stat display includes the SPD bonus. Weapon damage penalty stacks multiplicatively with Power/weapon-level base modifiers; flat enhancements/Growth stay separate, following existing base-damage part rules. Available in weighted drops and admin spawn.

Target Tuning clarified implementation: Marker Buoy.png, weight9 (=3+current6weaponlimit), sell50/100/150 Credits. First enemy hit by each primary starting-weapon swing/projectile joins a run-scoped set of marked enemies. Hits on marked enemies share rounded20/25/30% of actual inflicted damage to every other living marked enemy; unmarked targets do not feed the mark network. Shared damage does not recursively transfer or invoke on-hit part effects. Normal umbrella and EX create marks; inherited explosion/Cold hits on already-marked enemies share damage too. Dead marks are pruned; removing the part disables sharing/indicators. A small buoy icon indicates marked enemies. There is no separate unconditional20/25/30%damage boost. User clarified the mark-to-mark behavior; interpretation of first target is per new primary swing/projectile, stated during implementation.

Neutralization Tuning: weight2, Warakuhime's Fan.png, sell50/100/150 Credits. Accepted starting-weapon hits roll10/20/30% chance for1second stun. No stun graphic until supplied. Chance to erase an overlapping eligible enemy projectile is20/30/40%, with one-second gameplay cooldown per attacking swing/projectile after either success or failure. Nonintersecting/immune projectiles do not consume an attempt. Normal umbrella swept attack and EX path provide geometry to NPC projectile pool. Owner metadata explicitly makes all Neru bullets and Iroha rounds/projectiles immune. Ground pounds,smash/ram,self-destruct and area explosion attacks are not erasable. Current boss projectile roster is entirely covered by the exclusions; the eraser API supports future eligible projectiles. Main/EX and inherited splash/Cold on-hit paths apply stun. Existing control system handles stun movement/contact suppression. Configuration and behavior:neutralization-tuning.js;catalog:tuning-parts.js.

Reverse Tuning:weight3,Event 32 - Lost Item 10.png,sell50/100/150Credits. Level1/3 addPI to starting-weapon aim;level2 restores normal direction. No other stat changes. Current umbrella auto-swing and EX launch use startingWeaponAim;EX follows reversed arrow angle during its normal fade-in tracking and locks as usual. Arrow input itself is unchanged. Other weapons are unaffected. Future starting weapons should use the shared startingWeaponAim helper. Available in weighted drops/adminspawn.

RGB Tuning:weight2,Peroro Mochi.png,sell50/100/150Credits. All3levels enable identical rainbow trail with no stat changes. Umbrella swing's original afterimage alpha is tinted using a seven-color source-atop gradient on its isolated trail canvas;solid weapon/world remain unchanged. Umbrella EX continuous streak uses the same rainbow palette,retaining normalblur/fade timing. Only the starting weapon qualifies. Helpermodule:rgb-tuning.js. Future starting weapons can reuse rgbTuningActive/rainbowTrailGradient. Weighted drop/adminspawn enabled.

Size Up Tuning:weight4,Cherino Matryoshka.png,sell50/100/150Credits. Starting-weapon dimensional size factor1.15/1.20/1.25 multiplies existing weapon size bonuses. Normal umbrella visuals,swept hit area and swing/orbit distances share the same areaScale. Umbrella EX snapshots the part factor and applies it to rendered projectile length/trailwidth,hit capsule and launch offset. StartingWeaponSizeScale helper supports future projectile visuals/hit areas/orbit radii. Other equipped weapons are unaffected;Reverse/RGB remain the explicit all-weapon exceptions. No damage/speed/attack-time changes. Catalog/adminspawn enabled.

Slowdown Tuning:weight4,Capybara Bath Salt.png,sell50/100/150Credits. Levels1/2/3:20/25/30% accepted-hit chance to apply15/20/25% movement reduction for5gameplayseconds and deal one immediate30/40/50%weapon-damage hit. User clarified damage is once on application,notdamage-over-time. Reapplication refreshes duration;no movement base stat is overwritten. Slow multiplier applies to normal character chase/movement aftercatchupspeed selection;forced knockback and scripted boss attack timing remain separate. Main umbrella,EX and inherited explosive splash apply the effect. Catalog/adminspawn enabled. Helpers/config:slowdown-tuning.js andtuning-parts.js.

Solo Tuning:weight9(3+6weaponlimit),Rokuwakaku Model.png,sell50/100/150Credits. Starting-weapon base bonus equals5/10/15% times empty slots in the six-slot weapon inventory,computed on each damage calculation so obtaining/merging/removing weapons updates it automatically. Applies as its own multiplicative base factor and excludes flat enhancement/Growth damage. A single starting weapon leaves5empty slots,for25/50/75%base bonus. Future excluded sword attack passes options.soloTuningEligible=false,or weapon metadata soloTuningEligible:false;no undefined sword weapon is added now. Other weapons are unaffected. Catalog/adminspawn enabled.

Trumpet Tuning:weight2,Event 06 - Buff 17.png,Audio/SFX/why.mp3,sell50/100/150Credits. Starting weapon attack sounds have cooldown8/6/4frames at60fps and volumes25/40/55% atlevels1/2/3. Every accepted sound uses a fresh nonlooping Audio voice;newattacks,unequipping andpause do not cut existing voices short. End/error cleanup releases voice references. Cooldown advances only duringgameplay. Normalumbrella swingstart andEXlaunch trigger it;no damage/stat effects. Future starting weapons can call playTrumpetTuning on firing. Browser autoplay restrictions are handled without unhandledrejections. Musicvolume remains a separate control. Catalog/adminspawn enabled.

Trumpet Tuning? now follows the existing volume slider. Effectivevoicevolume=levelgain*slidervalue/100. Activeoverlappingvoicesadjustlive,includingmute,withoutpause/restart. PauseSettings delegates tosameinput so it also controlsdoots. This supersedes the earlier note that musicvolume is separate fromTrumpetSFX.

Trumpet Tuning? gain now derives from trumpetBaseGain in tuning-parts.js (currently3.125). Level1=base,Level2=base*2,Level3=base*3. Changing base updates every level. WebAudio boosts,slider multiplication andindependentvoices remain.

Weapon Tuning:weight1,Souvenir Doll.png,sell50/100/150Credits. Level1/2/3 adds an independent starting-weapon base factor0.70/0.60/0.50 and other-weapon base factor1.04/1.06/1.08 in the shared weapon damage formula. Dynamic mainWeaponId identifies the penalty target;Plana defaults to her umbrella. This part explicitly benefits nonstarting weapons,unlike most parts. No permanent character stats are mutated;removal immediately restores both sides. Factors multiply with other base modifiers such as Speed Tuning;flat enhancement/Growth additions remain separate under existing formula ordering. Catalog/adminspawn enabled.

Weak Tuning:weight4,Souvenir Doll.png,sell50/100/150Credits. On accepted starting-weapon hits:20/25/30% chance to apply3s ATK reduction20/25/30% and DEF reduction5/7/10%. Successful reapplication refreshes duration. ATK multiplies outgoing contact and boss attack damage without permanently modifying base ATK;existing attack multipliers remain multiplicative. DEF is a separate additive entry alongside existing bonusDamageTakenPercent debuffs,benefiting all incoming attacks against that enemy. No independent hard-defense stat is added. Main/EX/inherited explosive andCold on-hit paths supported. Weapon Tuning icon changed to Expo Souvenirs.png per user;its tradeoff effect remains unchanged. Catalog/adminspawn enabled.

Reserved Ability Upgrades (user explicitly requested data only; no implementation until further directives): definitions in ability-upgrades.js, enabled:false, not imported by gameplay or UI. Prices by rank / total:
Special Attack:500 /500. Future secondary button defaultX;no binding added.
Growth:500,10000,50000 /60500. Supplied description1% main weapon/Special damage per game level;existing Growth formula notes remain available,shop purchase/unlock not implemented here.
Reroll:2500,5000,7500,10000,12500,15000,17500,20000,22500,25000 /137500.
Eliminate:same costs /137500.
Tuning:500 /500. Reserved future unlock;existing Development Tuning is not gated or disabled.
Hold:5000,10000,15000,20000,25000 /75000.
Customize:50000 /50000.
Supports:1000 /1000.
Momo Chats:50000 /50000.
Enchantments:1000 /1000.
Student Council:2000 /2000.
Descriptions and individual prices retained in the editable catalog. No purchasing,currency spending,persistence,menus,stat changes,notifications,achievements or unlock enforcement added. Await user directives.

Reserved Stats Upgrades (data only, following the Ability Upgrades instruction): stat-upgrades.js,enabled:false,not imported into gameplay/UI. All14supplied descriptions,per-rank bonuses,caps,rank prices andtotals saved. Regeneration records1HP perrank every5seconds,max5HP/5seconds. Other entries use percentage bonus metadata. No purchases,persistence,menus,unlockgates,timers,character stats or combat effects added. All supplied rank-cost totals andbonus caps validated. Await further implementation directives.

Reserved Other Upgrades: other-upgrades.js,enabled:false,metadata only. Customer Service:+1mob spawn perrank,5ranks,cost2000/4000/6000/8000/10000,total30000;spawn-rate timing/unit awaits implementation directives. Weapon Limit:5free ranks,additional weapons5down to0(starter separate),no active inventory restriction added. Item Limit:6free ranks,items/equipment6down to0. Synnergy Ban,Supers Ban,Hardcore andRefund All all cost0. Hardcore's future1HP mode andexisting reserved score formula are not enabled. Refund All is recorded as an action,not a rank. No spawning changes,limits,bans,purchases,refunds,modes orpersistence added. All7costtotals validated. Await directives,matchingAbility/Stats metadata tables.

Rate-Up Tuning:weight2,user-selected replacement icon Event 41 - Character Cushion.png (Capybara Bath Salt already belongs to Slowdown). Sell50/100/150Credits. Starter hits tag the enemy for2gameplayseconds with1/2/3%extra TuningPart drop chance. The tag is recorded inside damageEnemy after miss rejection and before defeat listeners,so an immediately lethal hit qualifies. Any later killing weapon can finish the tagged target within the window. Explosive Tuning inherits this on-hit tag. Natural and conditional bonus odds combine as1-(1-baseChance)*(1-bonusChance),one part maximum per kill;Yuuka remains guaranteed. Existing eligibility/exclusions and ground placement apply. Mushroom alternative replaced by random healing food for future implementation;rateUpFoodSettings.enabled=false,substitutionChance=null until food definitions/odds arrive. No placeholder food or invented healing values added. Catalog/adminspawn enabled.

Stationary Tuning:weight2,Mini Event - Toy Box.png,sell50/100/150Credits. While actual player displacement is zero,starting-weapon base damage increases20/25/30%,andall equipped weapon automatic attack intervals multiply by0.70/0.60/0.50. Facing changes/animation alone do not count as movement. Uses independent interval factor,not Haste;even the Haste-immune synergy receives this explicit all-weapon effect. Remaining cooldowns rescale on movement-state changes;synergy stagger gaps share the factor. No extra projectile speed,hit-cooldown,EXduration orEXcooldown changes. Damage bonus remains starting-weapon-only. Both gameplay previews andsynergy implementationsupdated. Catalog/adminspawn enabled.

Super Synnergy framework: recipes live in super-synergy-recipes.js,currently empty,user will supply five. Do not invent weapons/items. GoldenHammerPieces.gif contains three22x32stages,decoded unchanged to generated/golden-hammer/piece-0/1/2.png for progress-dependent display (half-shaft,fullshaft,hammer).
A valid recipe's Synnergy weapon enables the upper-right HUD progress. One equippedSynnergy=halfshaft,two=fullshaft. Three equippedSynnergies instantly grants the unique hammer;alternatively level50 with a qualifyingSynnergy creates one ground pickup. Detailed mechanics gate hammer progress on the weapon;the matching item is required to craft. Groundhammer uses safe placement andcontactpickup,andrelocates acrossmaps ratherthanbeinglost. One shared run state spansavatars/maps;no secondhammer orSupercraft afteruse.
GoldenCrafter choices include aSuperrecipe onlywhenhammerheld,matchingSynnergyequipped,andmatchingitemMAXorSuper. SuperitemmayprovidebaseItemId. Goldenmenu thenallows equipment selection alongsideweapons,withnamedingredientboxes andconfirm. Success replacesSynnergyinplace,consumestheitem(freeingslot)andhammer atomically. Failedrecipefactory/cancellation leavesingredientsandhammerunchanged. ExistingregularGoldenCrafters/fusionscontinueunchanged. WithnoSuperecipesyet,noprogress/hammer/newcraftoptionappears inliveplay. Testsusesyntheticrecipesonly.

Malkuth's Hat (first equipment item)
- Unlock: defeat the Arisu boss. Unlocks persist locally per signed-in account; guest/no-account unlocks do not persist. No cloud save is implemented here.
- Icon: sprites/icons/items/malkuth.png. Normal levels 1/2/3 multiply damage by 1.2/1.3/1.4 and subtract 20 percentage points of crit chance before clamping.
- Damage multiplier joins the additive Damage Bonus family (1.4 plus another 1.3 effect gives 1.7).
- At MAX, a normal Crafter can spend 1 Secret Tech Note to awaken the hat. A Super File can also grant its awakened form, replacing an owned normal hat without using another slot.
- Awakened: level 1/MAX, damage multiplier 1.5, no crit penalty. Never offered as a normal level-up awakening.
- Future MAX penalty-negation equipment can declare negatesItemPenalties; no such item is activated yet.
- Verification: 84 test files passed; Development module graph linked. Browser visuals/playthrough not verified.

Item unlock clarification
- Locked items are unavailable on a fresh profile. Meeting an unlock condition permanently adds them to subsequent runs' reward pools; the condition need not be repeated.
- Unlocking grants eligibility, not an automatic equipped item or guaranteed drop.
- Future Customize/armory exclusions are separate from unlocks. disabledItemIds filters normal and Super File rewards without erasing unlock progress; re-enabling restores eligibility.
- Customize remains an inactive upgrade definition until its UI/mechanics are requested.

Decagrammaton - Super Synnergy 1
- Recipe: The Princess and the Key + MAX Malkuth's Hat (or awakened/Super Hat), using the existing Golden Hammer and Golden Crafter requirements. Consumes the hat, frees its equipment slot, and retains the ingredients' reward exclusions. One Super Synnergy per run.
- Icon: sprites/attacks/Decagrammaton_Icon.png. Description: Spits plasma which contain the strength of god(?). All attack damage is also multiplied 1.3 times.
- Three primary blue shots per 7 frames, each accompanied by a secondary pink shot. Each hit rolls its own crit. Pink shots follow the aimed cone; blue shots select visible enemies, home and wrap around their target until duration, hit limit or target death ends them.
- Blue: 60% damage, 7-hit limit, 15-frame hit cooldown, 200% area, 20-frame lifetime. Pink: 90% damage, 3-hit limit, 60-frame hit cooldown, 125% area, 40-frame lifetime. Both speed 15 px/frame; knockback duration 5 frames, speed 3 px/frame. Times convert at 60 FPS. Interval is fixed at its 7-frame minimum.
- Enhancements split across the three primary blue projectiles; secondary pink projectiles do not increase that split count.
- Passive 1.3 Damage Bonus affects all attack rolls. Consumed Malkuth's Hat no longer applies its crit penalty.
- The Princess and the Key EX pattern/effect remains usable on Decagrammaton with an independent 3-minute cooldown; enhancements resolve from the current Super weapon.
- Ultimate: Band of Atsilut. Square overlaid with a diamond (eight-pointed star). Independent 5-minute cooldown. Brief flash then an orange wave expands from the player; visible non-boss enemies turn white and are defeated simultaneously at 1.5 seconds, as the wave clears the viewport. Effect finishes at 1.95 seconds. Bosses, including Shiroko/Arisu/Iroha/Neru, are excluded; mini-bosses are affected. Offscreen enemies are excluded. Normal defeat rewards apply.
- Admin equip and ultimate-test buttons added. Shared EX compendium and independent ultimate HUD added to both Development previews.
- Validation: 85 test files passed; both preview module graphs linked. Browser playthrough/visual acceptance remains unverified.

Item asset location clarification: items now live under sprites/items/. The current Malkuth's Hat icon path is sprites/items/malkuth.png; this supersedes the earlier sprites/icons/items/ note. Runtime references and the asset regression check already use the new location.

Decagrammaton projectile visual tuning
- Each 7-frame cycle now staggers its six individual shots (alternating blue/pink) using slightly randomized positive gaps whose sum preserves the original cycle duration and total fire rate.
- Blue projectile diameter and matching collision radius are reduced by 20%; pink size is unchanged.
- Blue plasma fades smoothly over the last 0.12 seconds of its original lifetime, including bloom/tail. Other plasma weapons retain their existing fade.
- Focused Decagrammaton, Luminous Nova and Princess/Key tests passed; browser visuals not verified.

Decagrammaton plasma consistency
- Uses Kei's shared plasma renderer, gradients and bloom. Trail onset now waits through the same 0.08-second startup; visual tail growth uses Kei's reference speed independently of Decagrammaton's gameplay speed.
- Muzzle placement accounts for the full bullet bloom plus the shared 3px gap, preventing glow/trail overlap behind the player at launch.
- Blue remains 20% smaller than its previous Decagrammaton size and retains its smooth lifetime-end fade. Damage, cadence, homing and travel speed are unchanged.

Pickup menu re-entry protection
- Finishing with a found Tuning Part returns it to the ground but blocks that individual drop until the player fully leaves its pickup area and remains off it for 1.5 seconds.
- Cancelling normal or Golden Crafters applies the same protection without consuming them. Consumed Crafters need no block.
- Touching a protected pickup again before the wait expires restarts the leave-and-wait requirement. Different pickups track independent protection.
- Uses simulation delta; paused gameplay/menu time never advances this delay. Map/drop clearing removes stale protections.

Decagrammaton retained EX clarification
- The Princess and the Key EX keeps its original laser, buff, residue, wide blue cone, stagger, fire rate, damage and unlimited piercing when Decagrammaton is equipped.
- The only spray behavior change is its aim: the cone points toward a visible enemy nearest the player's aimed direction (nearest distance breaks ties). Each fired round remains straight; this is emitter tracking, not a new volley or individual homing pattern.
- During the EX blue-spray window the normal Decagrammaton stream is replaced by that EX spray. Existing projectiles remain in flight; the ordinary pink/blue stream resumes afterward. Windup behavior follows the original EX timing.
- Outside EX, Decagrammaton's ordinary blue bullets retain their homing/wrapping behavior.

Decagrammaton homing muzzle correction
- Blue shots resolve their target-facing launch direction before computing the player's hitbox-edge muzzle position. Targets behind or diagonally behind the player now launch from that side, rather than starting at the manual-aim muzzle and turning across the player.
- Pink rounds keep the player's manual aim; no-target blue rounds fall back to it. Bloom clearance, stagger, size, lifetime and damage are unchanged.

Decagrammaton rendering correction (supersedes the smaller-graphic experiment)
- Restored blue visual diameter to its previous value: shared bullet diameter x 2 x 0.8. Combat diameter remains unchanged.
- Iroha's large tank shell confirms size itself is supported by the shared plasma renderer. The mismatch came from timing: the blue bullet's tail reached full length only after its end fade had begun.
- Blue visuals now start their wake immediately, like Iroha's shell, and scale visual trail growth with diameter. Its complete tapered plasma trail forms before end fade. Pink rendering inputs remain unchanged.
- Retains blue end fade, gameplay speed/lifetime, homing, collision area and target-facing muzzle placement. Browser visual verification was not repeated after Computer Use was stopped.

Projectile rendering audit and verified orbit-tail correction
- Kei/Luminous Nova, Princess and Key (normal/EX), Neru radial/stream bullets, Iroha cannon/artillery shells and Decagrammaton all call drawLuminousPlasma in luminous-nova.js. They reuse the same head gradients, additive bloom, tapered tail layers and color mapping; Arisu's laser is a separate beam renderer.
- Creation differs: Kei fades/accelerates into straight motion; Princess/Key is a staggered straight cone; Neru uses straight radial or alternating-lane orange rounds; Iroha uses fast straight orange shells. Decagrammaton alone turns sharply and orbits targets.
- Rendered diagnostics confirmed isolated Decagrammaton plasma matches the shared style. The actual moving projectiles differed because a long straight extrapolated tail rotated behind every orbit turn, producing large white tangent spikes around the target.
- Blue bullets now record a bounded actual-motion history (maximum48 points). The shared renderer applies its existing gradient/bloom passes to a tapered path ribbon following those positions. Ordinary straight bullets keep their original rendering path.
- Blue diameter, fade, targeting, projectile speed/lifetime, damage, hitboxes and attack timing are unchanged. This supersedes speculative size/timing explanations as the fix for the remaining visual mismatch.
- Headless Chromium rendered outputs/plasma-created-before.png and outputs/plasma-created-after.png using actual Decagrammaton creation/update/draw. Reference rows are pixel-identical before/after; the orbital tangent spikes are removed in the actual-motion row. This is a controlled rendering check, not a full gameplay playthrough.
- Added plasma-trail.test.cjs for traveled-path bounds, original straight trails, shared plasma colors, zero-length safety and bounded history. Full regression suite:87files passed.
Decagrammaton lifetime update: blue bullets now last40frames/60 =0.667seconds, matching pink bullets. Existing end fade, hit limit and target-destruction cleanup remain in place.
Admin Golden Hammer control: Add Golden Hammer Piece, beside Spawn Golden Crafter, advances half-shaft -> shaft -> complete held hammer. It bypasses normal progression thresholds for testing, updates the HUD immediately, preserves recipe requirements, and cannot grant a duplicate/second hammer after use.
Golden Hammer HUD placement: right8px/top60px, directly below the LV display (top36px plus20px height and4px gap). Replaces the old3%/14% offsets, preserving icon size.

Admin Weapons & Items panel / Malkuth visibility
- Malkuth's Hat was implemented as an equipment item with an Arisu-defeat reward unlock, but had no direct admin equip control.
- Equip Supernova, Luminous Nova, all Synnergies/Super Synnergies and items now live in a dedicated Admin / Weapons & Items panel, with collapsible Weapons/Synnergies/Items sections.
- Added manual Malkuth's Hat LV1, MAX (LV3) and awakened equip buttons. These bypass reward unlocks for testing without permanently unlocking the item, replace an existing Hat instead of duplicating it, and respect six equipment slots.
- Autoattack toggle, cooldown resets, direct EX casts and ultimate tests remain in the separate Skills panel. The two panels share a scrollable left column so the game does not lose width; fullscreen positioning follows the wrapper.
- Added loadout-admin.js and loadout-admin.test.cjs. Controlled headless layout screenshot: outputs/admin-loadout-preview.png. Full regression suite:88files passed; Development module graph links.

Plana base stats: HP70, ATK1.3x (130%), SPD1.3x (130% of shared player base speed), CRT10%, SIZE1/5 flat. SIZE is future weapon metadata only, not sprite/hitbox scaling. Future character skills can appear as level-up upgrades but must stay separate from weapon/equipment slots; bottom-left skill/buff icons deferred until directives/assets are supplied.

CORRECTION: Plana's previous 240 px/s already included base SPD1.3x. Normalize her pre-stat movement base to 240/1.3, then apply (130 + SPD bonuses)/100. Unmodified travel remains240 px/s, not312. Arona and enemy speed reference remain unchanged.

Level-up footer actions: Reroll, Eliminate, Hold with bitmap-font use counts. Developer reward bypass grants10/10/5 uses per character run; non-admin uses abilityUpgradeRanks.reroll/eliminate/hold (caps10/10/5), spent counts in levelActionSpent. Purchases/shop UI remain deferred. Eliminate targets a selected weapon/item ID for the remainder of the run's level-up pool, does not consume pending level. Hold skips that pending choice and reserves selected option at next level. Escape cancels selection mode. Reroll shuffles eligible options; with current small implemented pool the same rewards may remain available.

BAD COOKING - default-unlocked basic weapon; icon sprites/attacks/Bad Cooking.png. Base weapon damage0.9,10s attack/minimum interval,1area,unlimited target hits,0.75s per-enemy cooldown,110%area,601/60s duration,0speed. One continuously renewed player-centered miasma; Haste does not change renewal or hit timing. Levels2area+15%,3damage+30%,4area+25%,5hit frequency+20%(cooldown0.625s),6damage+60%,7/MAX small outward knockback. Damage level multipliers1.3*1.6. Initial visual radius110px; area upgrades multiply radius1.15/1.25; future weaponAreaMultiplier hook. MAX provisional small knockback5frames at60px/s, editable settings. No EX or Synnergy recipes supplied; three Synnergies pending. Normal level-up/File eligible, Crafter levels/enhancements, admin Equip Bad Cooking; non-starter cappedLV7/MAX. Player SIZE1/5 does not affect this weapon. Shared reward menu now shuffles full eligible pool before selecting4 so additional weapons do not permanently hide later items. File generation also reads full pool.

Bad Cooking level1 reference correction: initial radius approximately140worldpx (280px diameter) matching supplied screenshot's miasma footprint. Dark translucent grey-purple circular haze with subtle purple pixel flecks replaces overlapping pale cloud blobs. Same radius drives damage and visuals. Level1 has no knockback; MAX-only knockback remains per original level table.

Bad Cooking weapon classification: Melee (attackType Melee, ranged false). Persistent aura behavior unchanged.

Bad Cooking selection/drop weight:4. Stored on weapon definition for weighted weapon reward selection.

MOLOTOV COCKTAIL: default-unlocked Basic Multishot weapon,weight3. Icon now sprites/attacks/Event 41 - Dakimakura.png per user, replacing temporary napalm frame; Knockback Tuning icon untouched. Base0.8weapon damage,5s interval with Haste affecting throws only,1shot,unlimited fire targets,0.75s per-fire/enemyhitCD,90%area,3s ground duration,360px/s throw travel. Level2area20%,3count2,4damage30%+duration1s,5damage30% multiplicative,6count3,MAXcount4+area20%. Configurable base radius80*0.9=72px. Throws land around enemies and fire remains at impact. Supplied40frame2400ms512x512 GIF decoded with original timing/transparency/canvas; rendered above playarea but below entities/loot. Generic weaponAreaMultiplier supports future area modifiers. Crafter/Files/levelups/enhancements/admin equip integrated in both previews. No EX or Synnergy invented.

Molotov throw coverage correction: most throws choose enemies within viewport plus15%of larger screen dimension; remaining ground throws cover that whole padded screen region. Allows throws around player, toward screen edges and slightly offscreen, without unlimited distant-enemy targeting. Flight is not screen-culled and fire lifetime begins at impact. Both previews pass actual camera/viewport.

Molotov range distribution correction: distance now always rolls a triangular distribution between5%-100%of directional padded-screen reach,peak45%. Enemies bias direction only; they cannot override range odds. Approx16.45%close(<30%reach),75.89%middle(30-80%),7.66%far(>80%). Full360degree coverage and occasional offscreen landings retained.

Molotov targeting correction: first find nearest enemy within mid-range band(30%-80%of directional padded-screen reach),land directly at its current position. If no eligible enemy,weighted random direction/distance fallback. Enemy position locked at throw time; fire remains at impact. Supersedes previous angle-only enemy bias.

Molotov footprint reference correction: baseRadius125(before90%area),level1radius112.5,level4radius135(270px diameter),MAXradius162(324pxdiameter). Approximately56.25%larger than previous size, preserving20%MAXincrease. Shared zone.radius drives texture and damage together. Reference level4 image informed size, not an exact pixel registration.

Admin weapon equip buttons: first click equips,subsequent clicks add1weapon level up toMAX,including owned weapons in full inventory. Does not spend pending upgrades or modify enhancements/awakening. Records firstMAXorder for crossed-icon ordering. Applies Supernova,LuminousNova,BadCooking,Molotov in both previews. Synnergies remainLV1/enhancement-only per existing rules. Item explicitLV1/MAX/awakened buttons unchanged.

Molotov napalm reduced20%from previous reference correction:baseRadius125=>100;level4radius108(diameter216),MAXradius129.6(diameter259.2). Visual and damage radius shrink together.

RACER PASS: default-unlocked Stat item,weight1,max3,icon sprites/items/Racer Pass.png. LV1size/knockback10%,pickup30%;LV2 15%/40%;MAX20%/50%. Super LV1/MAX30%size/knockback,100%pickup,+20flatMaxHP. Normal level-up/File acquisition and Crafter levels; Super File can acquire or replace normal in same slot; adminLV1/MAX/Super controls. No separate SecretTechNote awakening invented for this item. HP reconciliation tracks applied bonus once, removes/clamps on removal; gain increases currentHP by20too. Pickup shared stat panel includes bonus. RacerPass size and future weaponSizeBonusPercent add in one family; separate weaponAreaMultiplier multiplies. Basic weapon sizes/collision and existing knockback integrated: umbrella swing/EX,Supernova normalbeam,Luminous normal bullets,PrincessKey bullets including retainedEXspray,Dec bullets/orbit,BadCooking area/MAXknockback,Molotov fire. Supernova EX/other unenumerated skill AoEs unchanged until specifically declared affected. Does not add knockback to attacks that have none. Weapon area mods never change throw range/duration or fire hit rate. Defined reward weights now influence level-up weighted ordering and normal File candidate selection; Super items remain uniformly selected.

Molotov no-enemy fallback revised after user reports consistently distant throws: explicit30%close(5-30%reach),60%middle(30-70%),10%far(70-100%)instead of triangular sampler. Each bottle rolls independent direction/distance. Nearest eligible midrange enemy still overrides random landing. This changes fallback distribution; no proven live-browser root cause was identified from code alone. Real no-enemy multishot regression verifies distinct landing points and varied/closer distances.

Admin item buttons now equipLV1 then level ownednormalitems +1perclick untilMAX. Removed direct EquipMAXitembuttons. SeparateSuper/Awakened form buttons retained; normalclicks do not downgrade alreadySuper/Awakened items. Feedback reads actualequippedlevel,notnewcandidate.

Admin normal item progression now LV1=>LV2=>MAX=>definedSuper/Awakened on nextclick(MalkuthHat,RacerPass),same equipment slot. AlreadySuper remains stable. This is adminonly anddoesnotgrantfreeSuperinnormalgameplay. Superitemicons nowgoldenouterglow inHUD,levelupgrade/CrafterandFile reveal via sharedglowhelper.

Weapon naming correction(2026-11-18): Decagrammaton is now Protocol SUPERNOVA;icon sprites/attacks/protocolsupernova.png. Activation skill formerly Band of Atsilut is now Activate Protocol SUPERNOVA. User cites Blue Archive Protocol Supernova MV betweenArisu/Kei as namingreference. Existing mechanics/patterns/cooldowns/retainedPrincessKeyEXunchanged;no revisedmechanicsspecified. InternaldecagrammatonIDs/moduleAPIretainedforrecipe/combatcompatibility. Bothpreviewskillmenus,recognitionlabel,HUD/recipeconstructorandadminactivationbuttonupdated.

SAINT PREDATOR: Basic weapon,weight2,Multishot,ranged,icon sprites/attacks/Misaki_UE.png. Default-unlocked pending any later objective directive. NoEXdefined(exSkillfalse). Base1.0weapon damage,0.5sattackinterval,1missile,hitlimit1,0.5shitCDmetadata,90%area,1.5slifetime,240px/s. LV2damage20%,LV3count2,LV4intervalx0.67,LV5speedx1.25+damage20%,LV6intervalx0.5,MAXcount4. Damage levels multiply1.2*1.2;interval0.5=>0.335=>0.1675beforeHaste/60Hzrounding. Missiles choose random visibleenemy onlaunch andflystraight atitscurrentposition;nohomingorsplashspecified. Noenemy=randomdirection. Expireonfirstswepthit/lifetime;targetdeathdoesnotdeleteinflightmissile. Proceduralmissilebody/fins/exhaust untilcustomprojectileassetprovided. RacerPass scalesrender/collisionandmuzzleclearance. Enhancementsplitusesvolleycount;permissilecriticalroll. Levelup/File/Crafter/adminEquip(+1uptoMAX)integratedbothpreviews;noEXorrecipesinvented.

SaintPredator icon: removed large transparentmargins via sharediconCrop220,10,520,225;45degreeclockwiserotationplacesoriginalleft-facingbarrelup-left. Sharedmetadataenlarges/fitsiconacrossHUD,levelup,Crafter,Files. Gameplayunchanged.

MAXweapon glow correction:sharediconhelper nowgoldforLV7normalweaponsincludingBadCooking,Molotov,SaintPredator withoutneedingenhancements. SupernovaMAXblue,LuminousMAXpinkunchanged;PlanaawakenedCSSoutline/sparklespreserved. NormalMAXitemsdonotgainSuperglow.

SaintPredatorunlockcorrection:lockedbynormaldefault. Objective Defeat the boss inStage1(Shiroko). Actualbossdefeatinfirstmap/nonendlesscallsunlockStageBossRewards;rewardacquisitionrequiresaccountcontentunlock. Onceearned,persistsacrossrunsunderexistingper-UIDbrowserstore,withouttime/looprestrictions. Developerbypassandadminmanualequipunchanged;nonadminsimulationtracksobjectiveinisolatedmemory.

Supernovaunlock:normalaccountsdefeatStage2bossArisu. Stage-specificactualbossdefeatgrantsaris-lasercontentunlock;persistsperaccountacrossruns. Defaultlocked,newrewardacquisitiongated,alreadyownedadminweaponupgradesallowed. Developerbypass/simulationandCustomize/consumedweaponrestrictionsretained.

SAFETY HELMET: default-unlocked Utility item,weight4,5normallevels,icon sprites/items/Safety Helmet.png. Procchances15/20/25/30/35%;Super40%plusheal10%MaxHP(floored,capped). Eachincomingpositivepost-DRhitrollsbeforeHP/shieldabsorption;successfulprocnegatesentirehit,nodamageflash/number,noitemcooldown. ExistingplayerI-frameeligibilitystillappliesbeforeincominghit. RegisteredplayerdamageguardcoversNPCcontactandbossattackswithoutcouplingstatmoduletoenemyworld. Shockwaveknocksallbackregisteredtargetsfromplayercenter:10framesduration(1/6s),speed10*60px/s=>100pxdistancebeforeexistingresistance/collision/immunity. Noadditionalstunordamage. Visualgoldexpandingring0.5s,updatestopsonpause;visualcap32doesnotlimitprocs. Supergoldiconsharedstyle. Level-up/File/Crafterintegration,SuperFilecanreplaceownednormalwithoutnewslot,adminsingleEquipbuttonLV1=>2=>3=>4=>MAX=>Super. GenericitempoolrefactoredforRacer/HelmetwhileMalkuthlocksretained. SuperFileproductdescriptionsnowshowactualitemeffects.

Itemiconfit: HUD equipmentart70%=>92%ofslot; shareditemiconFitmetadatauses124/128canvasextent(Crafter/HUD/levelup),156/160File;level-upitempaddingremoved. Transparentmarginsspecifiedviaalpha-boundsiconCrop:Malkuth0,19,1254,1235;Racer43,12,214,220;Helmet31,42,231,166.Normal/Superformsbothfit.Preserveaspectratios,nospriterasterchanges. Weaponiconlayoutunchanged.

Itemiconboundarycorrection:fitinsidefourcyanHUDcornerbrackets,notouterboxborder. Inspected255x237frame,cyanbounds29-226x35-206;aspect-containedframein squarehasnarrowerverticalinterior. Equipmentcanvas70%slotwithitemdrawfit124x108within128canvas=>max67.8%width59.1%height,retainingalpha-crops/aspectratioandpaddinginsidecorners. Othermenufitunchanged. Supersedesprevious92%HUDslotsetting.

LIFE JACKET: defaultunlocked Utilityitem,5levels,weight3,icon sprites/items/Life Jacket.png withalpha-croppedfit. Capacities15/20/25/30/35,refresh15gameplayseconds;normalDR10%. Supercapacity40/DR15%,heal10flatHPper3continuousfullshieldseconds,cappedMaxHP. IndependentlifeJacketState storesremaining/timers,doesnotconsumeoroverwriteadminshield. Acquisition/levelchangeinitializesfullshield;periodicrefreshreplacesremaining(notadditive). Removalclearsownpool. NoMaxHPcapontheitemshield(workswithfutureHardcore1HP). Damageorder:multiplicativeDR=>SafetyHelmetnegation=>LifeJacketshield=>othershield=>HP. ShieldhitsstillreturnOnHittrue,butonlyactualHPlossstartsHPflash;lastDamageResultseparateshealthDamage/shieldDamage/negatedforfutureeffects. FuturegradualdamageusingdamagePlayeralsofirstconsumesshield. HUDshowscombinedshield,fillclampedvisuallytoHPbarbutaccessibleamountreal;passivessyncimmediatelywhilerewardsmenuspaused. Bothpreviewsadvance15s/3stimersingameplayonly. Normallevelup/File/Crafter,SuperFilereplacementandadminLV1=>5=>Superroutes;Supergoldicons.

CHISE PLUSHIE - PARTIAL SETUP, DAMAGE EFFECT NOT IMPLEMENTED YET: Utility,max3,weight3,icon sprites/items/Chise-nyan Doll.png,alpha-croppedfit. Initialdamagefractions30/20/10%defined. NormalunlockSurvive10activegameplayminutesasAronainonesinglerun,countsArona-onlytime acrossstages,pauseswithgameandendsatdeath;noPlana-timecredit. Existingperaccountunlockstorage/developerbypass/simulationused. Normalitemreward/Crafter/adminroutesdefined,adminMAXdoesnotSuper(noSuperformspecified). CRITICALPENDING: userhasnotprovideddrainrate/timing/formulaformissing70/80/90%damage. Asyncclarificationrequested;noanswerasofthisturn. DoNOTclaimdelayed-damagegameplayworks:damagePlayerisunchangedandChisecurrentlydoesnotreduce/deferhits. MustimplementdelayconservingdamageanddrainingLifeJacket/othershieldbeforeHPonceformulaarrives. Noarbitraryratewasinvented.

Chise followup: user suppliedtickinterval EVERY1.5SECONDS,butnotdamageamountpertick.Requiredasyncclarificationasks1damage/10%remainingroundedup/allremaining. Stillpending. Implementedgenericdeferredpooland1.5supdateenginebutPRODUCTIONEFFECTINACTIVE: chisePlushieSettings.damagePerTick=null. Userhasnotauthorizedanamount. damagePlayeronlydeferswhenruleconfigured;avoidspermanentdiscount. Engineunit-test-onlyrule1checks30/20/10initialpostDRintegerdamage,restconserved,poolednewhits,1.5sstep,zero-initialhitsreturnOnHittrue,removaldoesnotforgivedebt,LifeJacket/adminshieldfirst,HPthenredpopup,shieldblue. Debt bypassesHelmetnegation/DR/re-deferral becauseoriginalattackalreadyresolvedthosesystems. Adminstatresetclearsdebt. Gameplaypausehaltsupdater. DoNOTclaimcompleteoractivateuntiltickamountprovided.

CHISE PLUSHIE COMPLETE/ACTIVE - userconfirmed1damagepertick,every1.5seconds. chisePlushieSettings.damagePerTick=1. SupersedesallpriorPENDING/INACTIVEwarnings. LV1/2/MAXtake30/20/10%initialpost-DRdamage(rounded),remainingdamagepooledanddrained1pointper1.5gameplayseconds. Shieldfirst,thenHP. NoDR/Helmetre-rollondebtticks. Existing10minAronasingle-runaccountunlock/rewards/Crafter/adminnormal3levelsactive.NoSuperprovided.

2026-11-20 - Overheated Overclocking
Implemented Stat item (weight 2), three normal levels (+40/+60/+80% additive ATK), Super (+100% ATK and +200% Skill Damage, no drain). Normal drains 5% Max HP each active second down to 1 HP, bypassing damage/hit effects. Confirmed user rule: Life Jacket absorbs this drain only when Luminous Nova is also equipped. Unlock: complete a stage with Luminous Nova (It's Safe I Swear), persisted through the existing account-local unlock system. Added normal level-up/Crafter/File/admin progression and Super File replacement. Future penalty-negation item is supported by flags but not invented. Validation: 101 test files passed; Development/movement.js module graph linked. No authenticated gameplay test performed.

2026-11-20 - Special Pharmaceuticals
User requested Utility item, weight 1, max level 3, icon Special Pharmaceuticals.png; unlock by surviving 10 minutes as Plana in one run; reductions 33%, 66%, then negate item penalties.
Implemented catalog, reward eligibility, level-up/Crafter progression and admin equip/level button. Shared itemPenaltyMultiplier reduces Malkuth's Hat CRT penalty and Overheated Overclocking HP drain, retaining positive effects. No Super form invented. Paused time excluded from Plana survival objective; unlock uses existing account-local persistence. Chise deferred damage remains its timing mechanic, not erased as an item penalty.
Assistant: I’ll add Special Pharmaceuticals with its three levels and Plana survival unlock, and connect it to the existing item penalties.
Assistant: The item now reduces Malkuth’s Hat’s critical-chance penalty and Overheated Overclocking’s HP drain by 33%, 66%, then 100%, while preserving their benefits. I’m treating Chise Plushie’s deferred damage as its damage-timing mechanic, so Pharmaceuticals won’t erase damage already owed.
Validation: 102 test files passed; movement module graph linked. No browser gameplay validation.

2026-11-21 - Support Items and Supports ability purchase
User: Support item is unlockable via shop in ability. The support item includes No support (the red slash). Projectile Shield: Protects from projectile attacks for 30 seconds. Cooldown 90 seconds. Heal Potion: Instantly heals 33% of Max HP. Cooldown30 seconds. Quick Dash: Dashes forward in moving direction, and gains invincibility for1 second. Cooldown10 seconds. Cast Net: Cast a net in front, pulling targets together and collect all EXP and Credits. Cooldown15 seconds.
User: please continue
Implemented Development/support-items.js shared definitions/icons, activation/update and Support HUD control. Preparation cycles five choices via arrows or left/right while Support slot focused; details highlight supplied durations/cooldowns. No Support uses red slash. Selection carried by GO into character.supportItemId, runtime support state reset on run selection; Student Halo remains separate and empty. Supports gate checks existing Ability rank/content unlock; developer default access retained. Enabled only Supports purchase in Ability shop for existing catalog1000 Credits using spendCredits and unlockContent (existing account-local/simulated profile persistence). Shows purchased pip/SOLD, prevents repeat or unfunded purchase, refreshes shared credit header. Other shop purchases and refunds remain unconnected.
In-game support button bottom-left and C shortcut; respects pause, text inputs and cooldowns. Projectile Shield30s blocks incoming boss projectile/tank-round/artillery projectile damage, not contact/slam/charge. Shield cooldown90s starts at activation. Heal Potion floors33% MaxHP via existing healPlayer, clamps max, cooldown30s. Quick Dash uses held movement or facing, .18s at1000 worldpx/s through existing player obstacle/bounds resolution, invulnerability1s, cooldown10s. Cast Net forward cone320px,120-degree aperture pulls toward point150px ahead using existing resistance-aware knockback (.3s, no added damage/stun) and immediately collects all ground EXP/Credits only, preserving notes and all other pickup systems; cooldown15s. Distances/speeds are implementation defaults since not specified. Support timers update only while gameplay runs. Light procedural shield/ring/net visuals; no asset files invented. Hostile damage uses optional projectile flag; ordinary damage/deferred damage rules preserved.
Assistant: I’ll add all five Support choices to Preparation and keep them gated by Shop, Ability, Supports. I’ll also wire up their effects and cooldowns, with a support button and keyboard shortcut during gameplay.
Assistant: I’ll use C as the support shortcut. Quick Dash will use movement direction, falling back to facing direction when idle. Cast Net will pull enemies in front and collect dropped EXP and Credits, leaving other pickups in place.
Assistant: The effects are wired up: Projectile Shield blocks projectile damage, Quick Dash grants one second of invincibility, and Heal Potion restores HP. Cast Net pulls enemies in a forward cone and collects EXP and Credits. Cooldowns advance only while gameplay is running.
Assistant: I’m also connecting the Supports purchase in Ability upgrades so it unlocks Support selection, using the listed1,000-Credit cost. Developer accounts retain access; the other shop upgrades will remain unchanged.
Assistant: All five choices are available in Preparation, and the layout check looks correct. The tests pass for effects, cooldowns, shop unlocking, pause behavior, and collecting EXP/Credits without collecting other pickups. All113 test files pass.
Validation:113 test files passed; main module graph linked. Added support effect/input/real loot tests and extended kit selection/purchase tests. Actual preparation bitmap/icon preview outputs/preparation-preview.png inspected. Temporary Chrome profile removed after resolved-path check. No authenticated gameplay playtest. During implementation a guard was initially inserted into addPlayerExp; inspection caught it, it was moved to damagePlayer, and EXP regression coverage passes. Initial isolated loot fixture needed game-config globals and was corrected.

2026-11-21 - Session-persistent admin preferences and Instant Start
User: add a admin toggle to just instantly start a game that is remembered by session storage, same with all settings on the admin panel as to make testing easier
Added Admin tools / Instant start game (skip menus) checkbox in both Development builds. Enabling starts current restored testing avatar/loadout immediately; on reload it waits until assets/admin initialization complete then bypasses home, kit, mode, stage and preparation with titleMenu.startTesting(). Existing pause resumes before start. Keeps selected test loadout and current support instead of running normal kit/reset callbacks. Existing Simulate Game still opens home when desired. Authentication/admin gate unchanged.
Reworked dev-session.js from prior live-server-only/manual-reset policy to persistent per-path sessionStorage across both ordinary refresh and Live Server/Vite reloads. Latest user request overrides older manual-refresh reset behavior. Capture now includes toolbar, admin panels, both sidebars, clock inputs, sprite test form; checkbox/radio/select/text/number values, distinct data-based keys for unnamed combat controls, selected avatar, persistent aria-pressed toggles (including simulated account), nested detail panels and admin open state. Excludes file/password fields, NPC ephemeral selections, fullscreen/pause toggles and one-shot spawn/cast/action buttons. Event snapshots run in a microtask after handlers, plus synchronous pagehide/live-reload snapshot. Toggle restore retries boundedly for music's first-click unlock behavior. Old ambiguous unnamed-field snapshots ignored to avoid applying one value to every combat stat.
Runtime preference hooks save selected map, per-avatar equipped weapon/item definitions with levels/enhancements, support selection, max-order sequence and equipped Tuning Parts. Restores through existing map selection and existing controls; no enemies, HP/EXP, active cooldowns, action casts, elapsed gameplay or spawned pickups restored. Current map and arrays validated against known runtime objects/slot capacities. Session settings isolated by standard/optimized page pathname. Browser sessionStorage lifecycle applies; no account/server preference writes.
Assistant: I’ll add an Instant Start Game admin toggle to skip the menu flow during testing, and extend session storage to restore admin-panel settings after reloads.
Assistant: The current storage only survives live-server reloads and misses the Skills sidebar controls. I’ll cover those controls and make settings survive manual refreshes within the same tab, without replaying actions such as spawning enemies or casting skills.
Assistant: Instant Start now skips directly into the game after assets load, using the restored test setup. I’m also saving the selected map, loadouts, equipped Tuning Parts, toggles, and panel states. Simulate Game will still let you open the normal menu flow.
Assistant: The reload checks pass for manual refreshes and live-server reloads, including Instant Start, sidebar controls, loadouts, and panel states. The full regression suite is still running.
Validation:113 test files passed; targeted dev-session/title tests passed after final small restore refinements; main module graph linked. Tests cover manual/live restore, Skills sidebar and Instant Start value, distinct unnamed controls, settled toggle capture, detail/runtime state, path isolation, fresh-session defaults, and title menu bypass. No authenticated browser reload/playtest performed.

Sports Drink: default-unlocked Stat item, weight 4, three ranks (10/15/20% stacking CRT at 1 percentage point per gameplay second). Enemy-hit HP loss halves only the accumulated buff; shields, misses, deferred ticks and Overclocking drain do not. Food hook consumeSportsDrinkFood grants +5% CRT for 10 seconds (refresh, no stacking); food pickups remain future work. Super grants 30% CRT and slight smooth aim instability, mitigated by Special Pharmaceuticals. Available in upgrades, Crafters, Files, armory and repeated admin equips.

Water Dousing: Basic/Melee, weight 3, icon Event 46 - Swimming Tube.png. Wamy unlock currently uses campaign stage clear with Sports Drink equipped during the available Endless run flow. Persistent account eligibility uses the existing unlock store. Base damage 110%, interval 120 frames, unlimited targets, per-target cooldown 30 frames, area 120%, knockback 10 frames at speed 5. LV2 damage x1.2; LV3 area x1.3; LV4 knockback speed x1.6; LV5 interval x0.8; LV6 damage x1.3; MAX area x1.3 and a movement-only hold after knockback (contact damage stays active). Initial unspecified visual tuning: 90-degree sector, base radius 120 pixels before area, 0.35-second splash, 0.25-second MAX hold. Racer Pass size/knockback, Haste, enhancements and shared damage formulas apply. No EX skill defined. Admin Equip Water Dousing repeats level-ups; normal MAX golden glow is shared.

Correction: Water Dousing's unlock achievement is Victory (achievement:victory), replacing the earlier Wamy name. The condition remains clearing any stage in Endless with Sports Drink equipped.

Latest correction: Water Dousing's unlock achievement is now Soaking! (achievement:soaking), replacing Victory. The Sports Drink stage-clear requirement is unchanged.

Bean Bag Bomb: default-unlocked Basic Multishot weapon, weight 3, Bean Bag.png icon. Damage 170%, attack interval 120 frames (2s), unlimited explosion targets, hit cooldown metadata 20 frames, area 144%, duration 630 frames (10.5s) treated as fuse from launch, projectile speed 7 (420px/s). Bombs arc to a nearby enemy or a randomized nearby landing point, settle and detonate once using the existing explosion animation. No bomb contact damage or repeating explosion damage. LV2 explosion size x1.15, LV3 damage x1.2, LV4 two bombs, LV5 interval x0.8, LV6 explosion size x1.2, MAX three bombs. Racer Pass scales explosion radius; shared ATK/crit/damage/enhancement/Haste apply. Base radius is initially 80 pixels before area/upgrade multipliers. Admin repeated equips level it to MAX, which uses the shared golden icon glow. Both Development previews integrated.

Water Dousing visual correction: replaced the filled cone with a narrow curved stream of tapered water droplets released sequentially across a 0.18-second swing. Each droplet travels outward for 0.35 seconds after release; older droplets lead farther out while late droplets remain near the source, forming the swung-bottle curve. Damage, upgrades, range, knockback and cooldown rules remain unchanged.

Water Dousing sweep now follows the player's current hitbox position throughout its animation. Droplet emission ages, curved sweep shape, launch angle, damage and cooldown behavior are preserved.

Phrenapates: Plana's first level-up character skill, separate characterSkills progression (LV1-3/MAX), yellow Skill choices, icon sprites/skills/Phrenapates_Icon.png. Each credited defeat adds 2/3/4 percentage points of crit, up to 20/30/40 bonus points (10 stacks). Every defeat refreshes the entire buff to 4 gameplay seconds; expiry removes all stacks. Card-related weapons AND Plana's Umbrella (including EX) have a 10% chance per credited kill to heal 3 HP, clamped to Max HP. Latest user correction replaces axe-related with card-related plus umbrella. Future card weapons opt in via usesCards:true or weaponTags:['card'] and pass weaponId to damageEnemy. Real defeat notifications now expose source and weaponId; cleanup/despawn cannot trigger the skill. Shared combatBuffs handles damage rolls and CRT display. Skill cannot occupy weapon/item slots, come from Files, or appear in Crafters. Admin / Skills / Character skills learns and levels it; admin session storage retains learned character skills, not active buff timers. Bottom-left passive/buff HUD remains deferred per prior direction.

Buff HUD: active effects now share a bottom-left icon row inside the game viewport (both previews). Any stacking effect displays its numeric stack amount at the top-right of its icon, using transparent bitmap text. Phrenapates displays actual defeat stacks (1-10), not its crit percentage. Sports Drink shows accumulated crit and its separate temporary food bonus; Luminous Nova and Princess/Key EX buffs use their equipped weapon artwork. Active support shield/invincibility also appear. Future combatBuffs can supply name/icon/stacks metadata. Effects disappear on expiry or character change/death; passive gear remains in the existing equipment row. Artwork and DOM are cached so cooldown/stack updates do not reload sprites.

Celestia: Plana's second separate three-level character skill, icon sprites/skills/Plana_Halo.png. Real critical hits independently have a 25% chance to add 4/6/8 ATK percentage points, capped at five stacks (20/30/40%). Active buff duration is 4 gameplay seconds and ANY further real crit refreshes it, including failed proc rolls. Successful procs repeat the triggering requested damage once on living sprite hurtboxes within 75px of the struck target (including that target if still alive). No second ATK/critical/defense roll. Splash events explicitly set isCritical:false and triggersSkills:false, so yellow/orange visual numbers cannot recurse or contribute to Luminous/Princess EX damage banks. Player-only critical damage >=2x gives orange critical numbers; weapon-specific modifiers/red umbrella supercrit display do not transfer their color to Celestia. Standard real criticals now also display orange at that player crit-damage threshold. Damage notifications resolve after the primary defeat to prevent duplicate loot/kill credit from secondary effects. ATK rows and damage formula include additive combatBuff ATK. Buff HUD automatically displays Celestia and its 1-5 stacks. Admin Character skills learns/levels it and session settings retain its level. Separate character skills remain excluded from Files, Crafters and equipment bars.

Swipe!: Plana's third separate character skill, icon Item_Icon_Consumable_AdultCard.png; projectile art pyroxene.png. Real critical hits roll 15/20/25% to summon a falling projectile at the struck target, with 150/200/250% ATK-based skill damage through the shared damage/crit pipeline. Pyroxenes have randomized orientations, a 2-gameplay-second lifetime, per-target 0.5s cooldown, and 7 initial accepted hits followed by two random upward/downward gravity arcs with 3 hits each (maximum13). Critical pyroxene hits may independently summon more Swipe projectiles; children advance on the next simulation substep, avoiding synchronous recursion. LV1 always1 block; LV2 equal1/2; LV3 equal1/2/3; block count affects size/hitbox only. Racer Pass does not scale Swipe. Plana's current sizeStat1/5 is recorded as the smallest FLAT baseline; future unprovided grade bonuses are not invented. Explicit flatSizeBonusPercent/flatDamageBonusPercent hooks are reserved for those future effects. Swipe uses card-related kill attribution for Phrenapates.
Flattened: accepted Swipe hits independently have a30% chance to apply/refresh5seconds. NPCs stop AI and displacement but retain ordinary contact damage; this is not stun/freeze. Sprite is compressed from its feet, with matching received-damage hurtbox and unchanged contact-damage ellipse. Swipe icon appears bottom-left while projectiles are active, without a stack number. Learned Swipe is available via yellow character-skill choices/admin Character skills, separate from inventory and retained in admin session settings. Umbrella EX hold duration was aligned from3to5seconds per the latest specification. Spatial broadphase is shared across Swipe's simulation substeps each frame.

Bottom-left skill/buff icons enlarged from38px to46px (about20%). Removed tile fill/border/glow and explicitly made icon canvases transparent to override the global white canvas background. Original image alpha is preserved; source sprites were not edited.

Level-up cards now use four equal grid rows within the available game height, with space reserved for progress/actions/help and no vertical menu scrolling. Descriptions keep their preferred bitmap size when possible and shrink only as needed to fit their fixed width/height; ResizeObserver refits when the game area changes and restores larger text when space returns. Added reusable bitmap setScale API. Browser layout fixture checked at reported984x555 and784x425 viewports: overlay scrollHeight equals clientHeight, all4 card heights equal within pixel rounding, and every complete description fits. Smaller layout screenshot visually inspected.

Latest leveling rule: gaining a level no longer restores HP. Current health is preserved through the EXP/level-up loop, including multiple levels from one EXP award. Explicit healing mechanics and admin HP/reset controls remain separate.

Throwing Cards: default-unlocked Basic/Ranged weapon, weight3, Card Set.png icon. Damage120%, attack interval240frames (4s), one projectile, initial10 accepted hits, per-target hit cooldown50frames, area100%, duration180frames (3s), speed10 (600px/s along the spiral). Card rotates and spirals outward around the player; trajectory arc-length inversion keeps its base path speed consistent. Single card projectile is clipped from the supplied fan artwork in canvas; source image unchanged. LV2 size x1.2/damage x1.2, LV3 interval x0.8, LV4 damage x1.33/size x1.2, LV5 unlimited hits/+1s duration, LV6 size x1.5, MAX damage x1.5. Racer Pass scales card size and orbit; card-related metadata and explicit weaponId allow Phrenapates healing on actual kills. Shared damage/ATK/crit/enhancement/Haste apply. Normal weapon upgrades/Files/Crafter enhancement/armory/admin repeated equips and golden MAX glow are integrated in both previews. References to axe in the supplied wording were interpreted as card.

Throwing Cards correction: Projectile speed10 means10 times the player's unmodified travel speed (playerSettings.speed240px/s), so card path speed is now2400px/s rather than600. Rotation increased from10to24rad/s. Spiral arc timing compensates for Racer Pass orbit scaling, preserving projectile travel speed while its geometry grows. Other weapons are unchanged.

Latest Throwing Cards correction: restored travel speed to600px/s. Faster24rad/s spin remains.

Throwing Cards now steers each spiral's center smoothly toward nearby living enemies, reacquiring as targets move or die. It no longer locks the orbit center to Plana; with no target, drift settles at its current world position. Orbit radius is multiplied by0.9 (10% smaller). Angular motion compensates for the tighter spiral, retaining600px/s travel relative to its moving center; center drift adds directional variation. Card spin remains24rad/s.

Throwing Cards now leaves5 short cyan holographic afterimages, sampled every0.025s from actual past positions and rotations. Older ghosts fade quadratically over0.15s, with the live card fully opaque. A single cached tinted sprite avoids repeated recoloring. Final ghosts finish fading after a card expires or reaches its hit limit; reset clears them. This trail does not deal damage.

Throwing Cards trail correction: afterimages now preserve the card's original artwork/colors; cyan hologram tint removed. Five trailing copies, fading and timing remain unchanged.

Throwing Cards afterimage trail spacing increased to0.25s between its5 copies, spanning about1second of historical movement. Ghosts now fade linearly over1.3s and remain briefly after the projectile ends. Original card colors retained.

Throwing Cards trail fade halved from1.3s to0.65s. Eight afterimages sampled0.08s apart fill the shorter trail; original-color rendering and linear fading retained.

Throwing Cards trail now uses10 afterimages sampled0.05s apart, fading over0.5s.

Student Handbook: default-unlocked Basic/Multishot weight3, Arius Student Handbook.png. Base140% damage,6s interval with hard5s floor after Haste/interval modifiers,3 books,7 accepted hits per book,20-frame per-target cooldown,100% area,2s duration, projectile speed3 (180px/s around the orbit), knockback5frames at speed2 (10px base displacement). Books are equally spaced around the current player hitbox, initial radius90px; Racer Pass scales both book size/orbit and knockback. LV2 +1book; LV3 damage x1.3 and duration+1s; LV4 +1book; LV5 damage x1.4; LV6 +1book; MAX damage x1.4 (6books). Source note claiming the5s minimum equalsLV3 duration conflicts with2s base/+1s table; implementation follows the explicit table (3s atLV3+) and retains5s minimum. Knockback temporarily holds movement AI without adding stun/contact immunity. Shared ATK/crit/enhancement splitting, default acquisition/Files/Crafters/armory/admin and golden MAX icon glow are integrated in both previews.

Student Handbook visual/collision revision: base sprite now uses its native visible cropped dimensions200x228px. Books grow/fade out from behind Plana over0.35s, then orbit, and shrink/fade back into her over0.35s at the end. Books that exhaust their hit limit also retract instead of vanishing; this return is visual-only. Six sampled afterimages shrink/fade over0.3s and finish independently. The received weapon circle encloses the full scaled sprite (half its diagonal), including emergence/retraction scale. Source artwork unchanged.
Weapon collision clarification: user confirmed circular collision applies to sprite projectiles only; beams/swings/ground areas keep visible attack shapes. Handbook/card/missile radii now enclose their sprite bounds; Swipe radius encloses every rotated pyroxene in the block cluster. Existing plasma heads/bloom and Umbrella EX already use circular swept collision. Decorative trails do not add damaging hitboxes.

Student Handbook size correction: reduced base rendered size from200x228px to40x45.6px (80% smaller). Circular collision radius reduced proportionally; orbit, emergence/return animation and shrinking trails preserved. Source icon crop stays200x228 and is scaled for gameplay.

Character selection preview correction: removed the3-second still/idle portion. Plana and Arona now continuously loop their right-facing running-sheet frames at7fps throughout kit/mode/stage/preparation previews; RAF still stops when the menu closes.

Student Handbook trail lengthened to12 shrinking afterimages with a0.6s fade, doubling the previous count and fade duration.

Moustache Medal: Basic/Ranged weight2, Moustache Medal.png; unlock survives600 active seconds as Plana in one run (account persistent; developer bypass/simulation follows existing rules). Flat is now an explicit character flag, with Plana.flat=true based on her defined1/5 SIZE baseline; other characters are not inferred. Flat grants multiplicative x1.3 base damage and size for this weapon only; shared helper is ready for future compatible synergies. Base130%damage,3s interval, unlimited hits,20-frame per-target cooldown,2s lifetime, speed7=420px/s,20-frame knockback at speed7. Walls use medal art and an alpha-measured circular hitbox (~37.16px at64px base width), avoiding transparent corner padding.
Moustache Medal behavior: fire opposite actual movement/last movement-facing, independent of aim cursor. Walls move outward to120px then linger until their2s life ends; LV4 travel doubled to240px per user clarification. MAX adds two perpendicular side walls, never a forward wall. LV2 size x1.3, LV3damage x1.3, LV5damage x1.5, LV6interval2.5s. Racer Pass scales sprite/circle and knockback. Basic acquisition/Files/Crafters/armory/admin repeated equips/MAX golden glow integrated in both previews. Future Flat-grade/synergy formulas not invented.

Moustache Medal attack now renders a procedural96x26px armored rectangular shield in top-down view, perpendicular to its outward travel, with gold rim and steel panels. Inventory keeps the original medal icon. Attack no longer loads/draws that sprite. Circular collision updated to enclose the rendered shield; Flat/Racer scaling and existing gameplay unchanged.

Orbital Compass: added default-unlocked weight-4 Multishot weapon with supplied compass inventory icon and procedural spinning magnetic needles. Nearest-target launches return toward the player after 1.5 seconds, expire after 3 seconds, or explode once upon exhausting 3 hits (13 from LV3). Seven upgrades, Racer Pass size scaling, admin equip/level testing, armory, normal and optimized runtimes, and golden MAX glow integrated.

Orbital Compass follow-up: spin increased from 14 to 38 rad/s, with 12 fading rotational needle afterimages over 0.12s forming a circular sweep. Outbound speed eases to zero at 1.1s; return accelerates over 0.5s to 720px/s, tracks player until crossing, then preserves heading and flies past. Never caught by player; expires at original 3s or explodes at hit limit.

Orbital Compass correction: return heading locks once at turnaround toward the player's position then. It never homes or adjusts to subsequent player movement, retaining acceleration and fly-through. Focused regression passes, including sideways player movement during return.

Orbital Compass return correction: reverses original launch heading by PI, never aims at player even at initial turnaround. Focused regression verifies player movement both before and after turnaround cannot redirect it.

Live Server persistence fix: dev-session.js no longer writes snapshots before restoreDevSession finishes initializing. Startup toggle events, pagehide and reload messages during asset loading cannot overwrite the last good settings with default/partial state. Restore is idempotent and applies runtime loadouts after control handlers, preventing form initialization from resetting restored equipment. Added repeated-reload-during-startup regression.

Serve! added: Basic Multishot weight 2, Beach Ball.png icon/projectile. Unlock persists immediately upon 600 active Plana seconds in one run, regardless of subsequent victory/defeat. Beach balls launch randomly at speed 5*60, reflect inside visible viewport using artwork circle radius, expire after 3s or hit budget and produce a single diagonal X blast at 2x projectile base damage. LV2 follows explicit 80%-to-100% explosion area note; LV3 two balls, LV4 damage/speed +30%, LV5 interval -15% and unlimited hits, LV6 ball/blast +30% size, MAX four. Racer Pass scales ball and blast, golden MAX glow and Crafter enhancements supported. Added normal/optimized runtime, admin equip/level testing, armory and reward-pool integration.

Serve! explosion now uses sprites/attacks/ExplosionSheet.png. Seven 48px-wide columns animate over existing 0.35s lifetime, assembling four diagonal beam strips and end caps under one central tile. Source bands y0/48px center, y48/44px arms, y92/42px caps. Native transparent sheet is drawn directly, no asset modification, one cycle/no loop. Damage/collision/upgrade/Racer scaling unchanged. Seven-frame browser render inspected: clean X burst without crop seams. Focused Serve! tests pass, including all seven source columns, four arms/caps, center and no draw after expiry. Preview outputs/serve-explosion-preview.png.

Time to Surf added: Basic Ranged weight3, surfboard icon. Two translucent blue/foam seaside waves launch from player and drift vertically up/down with opposite sinusoidal sideways sway, world-anchored after launch. Damage130%, interval200/60s, unlimited hits with20/60s cooldown per wave, lifetime2.5s, speed60px/s. Ten-minute active Plana unlock persists immediately regardless of later victory/defeat. All seven upgrades, Racer Pass size/sway scaling, MAX gold glow/Crafter enhancement, armory/reward pools, admin equip/level button and both runtimes integrated. LV3 provisional speed+30% and travel width+30% because source gives no quantities. Focused tests pass.

Admin Weapons & Items sidebar: added Remove all weapons & items button in both previews. Clears selected character full weapon/item loadout including starter/synergies, cancels active weapon cast and resets weapon projectiles/effects. Synchronizes Racer Pass HP, Life Jacket shield and Sports Drink state immediately; HUD/stats refresh. Character skills, tuning and support selection preserved. Session snapshots retain empty loadouts. Focused loadout/session tests and both runtime module graphs pass.

Maid Force added: Basic Multishot weight2, Pretty Headband.png inventory icon, aimed mint-green scent projectiles. Persistent account unlock on actual Iroha boss defeat in Stage3, including Endless; developer bypass remains. Base144% damage, interval110/60s, one hit per scent, cooldown0.5s carried across each chain, area150%, lifetime1.5s per scent, speed420px/s, chain radius100px/70%. All seven upgrades: LV2 chance80%; LV3 damage+30%; LV4 radius125px; LV5 two scents/chance90%; LV6 interval-15%; MAX three scents and each successful spread multiplies base damage by1.1. Enhancements retain original projectile split count and are not multiplied by base-only chain growth. Descendants retain weapon identity/on-hit damage event route. Circular scent collision matches body glow. Added admin equip/level, clear-loadout reset, armory/reward pools, Crafter enhancement/gold MAX glow, both runtimes. Focused regression passes.

Maid Force spread visual: successful chain descendants now render as light-blue radial blooms and blue-white trailing wisps as they travel toward the next target. Initial aimed scent remains mint. Collision, timing, damage and range unchanged. Focused regression verifies blue gradient and forward movement toward chain target.

Cheering Balloons added: Basic Multishot weight4, Cheering Balloons.png inventory icon. Procedural blue round balloons fall from above a random on-screen target, then arc/bounce toward eligible nearby targets within300px, one hit per flight/bounce and0.5s per-target cooldown, global3s lifetime. Base140% damage, interval2s, speed480px/s. Five size grades use existing sizeStat*5 rounded/clamped1..5; area60/70/80/90/100%. Undefined grades default1; Plana grade1. LV4 provisional knockback duration5frames and speed(grade+1)*60px/s, respects immunity/resistance/Racer Pass. All seven upgrades, persistent unlock, reward/armory/admin/clear-loadout integration, gold MAX glow/enhancement and both runtimes supported. Unlock checks reaching600 active run seconds with current character flat=true and Moustache Medal equipped; persists even after defeat. Character tier list and exact knockback values were not provided, so configuration remains explicit for later adjustment.

Reload policy correction (latest user instruction): reload resets game/run loadouts to character defaults (Plana starter only, no items), including skills/tuning/support defaults. Preserve admin controls/toggles/map/panels/character selection/Instant Start via sessionStorage. Runtime snapshot now stores map only; legacy loadouts/tuning payloads are ignored. Supersedes earlier gear-persistence work. Startup-write guard and deferred admin event saving retained. Focused tests verify default gear despite old saved payload and preserved admin preference/map.

Wakamo Bayonet added: Basic Melee weight3, wakamo-bayonet.png inventory/attack sprite. Persistent unlock from actual Stage4 Neru final-boss defeat, including Endless. Only attacks when an enemy sprite hurtbox is within60px reach; selects nearest sprite edge and swings a120-degree blade arc over0.18s. Swept blade checks prevent skipped targets; unlimited targets,0.5s per-target cooldown. MAX follows with reversed second stroke after0.7s, retargeting only if an enemy remains nearby. Damage160%; interval1.5s, LV4/LV6 independently x0.8; LV2 damage x1.2; LV5 assumed area/damage x1.3 because area quantity omitted. LV3 provisional small knockback5frames at120px/s (10px displacement), respects resistance/immunity. Racer scales reach/blade/knockback. Sprite afterimages, all seven levels, admin equip/level/clear integration, armory/rewards, Crafter enhancement/goldMAX glow, normal/optimized runtimes included.
