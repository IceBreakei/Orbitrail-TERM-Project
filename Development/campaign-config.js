// Table SPD is a ratio of playerSettings.speed (unmodified player base speed).
// Example: 0.35 means 35% of 240 px/s = 84 px/s, independent of player SPD upgrades.
// Internal campaign time is independent of the continuously running survival timer.
export const campaignSettings = {
  enabled: true, stageStarts: {first:0,second:390,third:840,fourth:1080},
  megaChanceDuringBoss: 0.005, endlessRandomFrom: 1500
};
const row=(id,stage,kind,enemies,hp,atk,spd,exp,start,end=Infinity,extra={})=>
  ({id,stage,kind,enemies:Array.isArray(enemies)?enemies:[enemies],hp,atk,spd,exp,start,end,...extra});
const mobs=['mob','mob2','mob3'], sweepers=['whiteSweeper','heavySweeper','opsSweeper'];
const arius=['arius1','arius2','arius3'], highlanders=['highlander1','highlander2','highlander3'];

/** User-supplied per-stage/per-window values. No legacy stat multiplier is applied again. */
export const campaignEnemyRows = [
 row('s1-mob1','first','regular','mob',8,2,.35,6,0,180),
 row('s1-mob2','first','regular','mob2',40,4,.4,7,30,300),
 row('s1-mega-mob','first','mini','megaMob',600,6,.5,150,120,Infinity,{baseEnemy:'mob'}),
 row('s1-mob3','first','regular','mob3',80,4,.4,8,180,300),
 row('s1-pedro','first','regular','pedrozilla',20,2,1,3,240,360),
 row('s1-mega-mob3','first','mini','megaMob3',1800,10,.75,600,240,Infinity,{baseEnemy:'mob3'}),
 row('s1-highlander1','first','regular','highlander1',125,5,.6,12,300,510),
 row('s1-highlander3','first','regular','highlander3',30,6,.7,12,300,660),
 row('s1-highlander2','first','regular','highlander2',150,7,.6,9,355,510),
 row('s1-shiroko','first','boss','shiroko',8000,15,.8,2000,360,Infinity,{gate:true,freeze:true}),
 row('s2-sweeper','second','regular','whiteSweeper',180,7,.85,9,390,660),
 row('s2-heavy','second','regular','heavySweeper',220,8,.65,9,455,660),
 row('s2-mega-sweeper','second','mini','megaSweeper',3500,11,1,1500,480,Infinity,{baseEnemy:'whiteSweeper'}),
 row('s2-ops','second','regular','opsSweeper',50,4,1.15,7,570,660),
 row('s2-mega-heavy','second','mini','megaHeavySweeper',2500,10,.9,1000,600,Infinity,{baseEnemy:'heavySweeper'}),
 row('s2-mob1','second','regular','mob',100,5,1.1,8,660,840),
 row('s2-mob2','second','regular','mob2',450,11,.8,10,720,840),
 row('s2-arisu','second','boss','arisu',15000,15,.8,2000,720),
 // Clarified order: Arisu first, then OPS at13:00 freezes the clock. Both must be defeated.
 row('s2-mega-ops','second','mini','megaOpsSweeper',5500,18,1,2000,780,Infinity,{baseEnemy:'opsSweeper',gate:true,freeze:true}),
 row('s3-arius1','third','regular','arius1',650,14,.7,12,840,960),
 row('s3-arius2','third','regular','arius2',650,12,.9,12,840,960),
 row('s3-mega-arius2','third','mini','megaArius2',7500,20,1.1,1200,900,Infinity,{baseEnemy:'arius2'}),
 row('s3-mega-arius3','third','mini','megaArius3',7500,20,1.1,1200,900,Infinity,{baseEnemy:'arius3'}),
 row('s3-arius3','third','regular','arius3',900,14,.7,11,945,1140),
 row('s3-pedro','third','regular','pedrozilla',750,12,1,11,945,1140),
 row('s3-iroha','third','mini','iroha',23000,20,1.1,2000,1050,Infinity,{gate:true,freeze:true}),
 row('s4-mobs','fourth','regular',mobs,2000,18,.6,14,1080,1140),
 row('s4-highlanders','fourth','regular',highlanders,3000,17,.4,15,1140,1200),
 row('s4-arius','fourth','regular',arius,3000,16,.4,15,1140,1200),
 row('s4-mega-pedro','fourth','regular','megaPedrozilla',1000,12,.85,20,1200,1380,{mega:true}),
 row('s4-neru','fourth','boss','neru',30000,20,1.2,5000,1200,Infinity,{gate:true}),
 row('s4-sweepers','fourth','regular',sweepers,1000,14,.65,23,1380,1500)
];


/** Endless arrivals use these exact base values, without reapplying Mega HP/ATK bonuses. */
export const endlessEnemySettings = {
  startSeconds: 23 * 60, midoriStartSeconds: 30 * 60,
  mega: { hp: 5000, atk: 15, spd: 1, exp: 25 },
  midori: { hp: 9000, atk: 5, spd: 1.5, exp: 25 },
  enemies: [...mobs, 'pedrozilla', ...arius, ...highlanders, ...sweepers]
};

/** Return an ordinary arrival profile; Midori joins the evenly mixed pool at 30:00. */
export function pickEndlessEnemy(seconds, random = Math.random) {
  const settings = endlessEnemySettings;
  if (seconds < settings.startSeconds) return null;
  const pool = seconds >= settings.midoriStartSeconds ? [...settings.enemies, 'midori'] : settings.enemies;
  const type = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  const mega = type !== 'midori';
  return {type, mega:false, scheduled:false,
    row:{id:`endless-${type}`, stage:'endless', kind:'regular', enemies:[type],
      ...(mega ? settings.mega : settings.midori), mega, endless:true, start:settings.startSeconds}};
}
