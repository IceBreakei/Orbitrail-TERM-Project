# Stage 1 review

Verified against campaign-config.js, event-config.js, campaign-schedule.js and movement.js. Times below use the internal campaign clock; SPD is a ratio of the 240px/s unmodified player base speed. Event overrides replace the regular values.

## Regular roster and encounters

| Enemy | HP | ATK | SPD | px/s | EXP | Internal time |
|---|---:|---:|---:|---:|---:|---|
| Mob1 | 8 | 2 | 0.35 | 84 | 6 | 00:00?03:00 |
| Mob2 | 40 | 4 | 0.4 | 96 | 7 | 00:30?05:00 |
| Mega Mob (mini-boss) | 600 | 6 | 0.5 | 120 | 150 | Once at 02:00 |
| Mob3 | 80 | 4 | 0.4 | 96 | 8 | 03:00?05:00 |
| Pedrozilla | 20 | 2 | 1 | 240 | 3 | 04:00?06:00 |
| Mega Mob3 (mini-boss) | 1800 | 10 | 0.75 | 180 | 600 | Once at 04:00 |
| Highlander Student1 | 125 | 5 | 0.6 | 144 | 12 | 05:00?08:30* |
| Highlander Student3 | 30 | 6 | 0.7 | 168 | 12 | 05:00?11:00* |
| Highlander Student2 | 150 | 7 | 0.6 | 144 | 9 | 05:55?08:30* |
| Shiroko (boss) | 25000 | 20 | 1.2 | 288 | 5000 | Once at 06:00 |

*The internal clock freezes at06:00 while Shiroko lives, so these later end times are not reached in Stage1. Highlanders continue spawning during the boss. Shiroko uses normal chase behavior. The two earlier mini-bosses are not required for stage clearance.

## Timed formations (fully resolved stats)

| Time | Enemy | Pattern | Count | Lifetime | HP | ATK | SPD | EXP |
|---|---|---|---:|---|---:|---:|---:|---:|
| 00:05 | Mob1 | Cluster | 20 | No timer | 8 | 2 | .35 | 6 |
| 01:05 | Pedrozilla | Horde | 30 | No timer | 20 | 2 | 1 | 3 |
| 01:30 | Mob2 | Wall | 140 | 8.3s | 120 | 4 | .4 | 4 |
| 02:35 | Mob2 | Ring | 50 | No timer | 40 | 4 | .4 | 7 |
| 02:45 | Mob3 | Stampede | 10 | 20s | 500 | 4 | .4 | 8 |
| 03:15 | Mob1 | Wall | 140 | 8.3s | 200 | 2 | .55 | 5 |
| 03:18 | Pedrozilla | Horde | 30 | No timer | 20 | 2 | 1 | 3 |
| 03:40 | Mob1 | Stampede | 20 | 20s | 500 | 2 | 1.6 | 8 |
| 04:15 | Mob1 | Ring | 50 | 26s | 200 | 2 | .35 | 5 |
| 05:00?05:10 | Pedrozilla | Horde | 100 every5s | No timer | 20 | 2 | 1 | 3 |
| 05:30 | Mob2 | Stampede | 40 | 20s | 800 | 4 | 2 | 8 |

Formations start offscreen. No timer means no event-specific lifetime; normal defeat/cleanup still applies. Event expiration removes enemies without loot or kills. The 00:05 cluster is20 rather than the initial15 request, reflecting the later cluster-size instruction.

## Spawning and testing rules

- Ordinary stream:5?8/s based on nearby density;2/s once50 visible population slots are reached. Overall cap400, with population cleanup at360 trimming to280. Mega enemies consume3 slots.
- Regular stream samples eligible roster entries. During boss combat each regular spawn has0.5% chance to become a Mega. A matching dedicated mini-boss profile is used when available; otherwise HPx10/ATKx2 applies. At the frozen06:00 pool this means Highlander Mega rolls.
- Bosses are exempt from ordinary population cleanup. Drops clear on map changes, except the newly preserved Stage1 Gacha File reward.
- Default Development seed0 sets enemies to1HP; random spawning defaults off, and invincibility defaults on. Reroll seed and enable spawning to test actual balance.
- Legacy automatic events, including the harmless-enemy timestamp schedule, are disabled. The replacement campaign events above are enabled. No generated random formations before17:00.

## Stage clear

Defeating the scheduled Shiroko marks Stage1 cleared and automatically queues the background transition to Stage2. Stage2 internal clock starts06:30. Unopened Gacha Files now carry to a safe spot near the player in Stage2 instead of blocking transition. If a File dialog is already open, it resolves before gameplay/transition resumes. EXP and other ground drops follow the existing map-change cleanup rule.

## Verification limits

Campaign schedule, Gacha File rules and File UI tests passed. This is a configuration/code audit, not a completed six-minute browser playthrough. Visual formation alignment, encounter difficulty, and drop balance still need playtesting before calling Stage1 fully complete.
