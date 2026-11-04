// Start/end times use the campaign internal clock; lifetimes use active gameplay time.
const event=(id,timeSeconds,enemy,pattern,count,lifetimeSeconds=null,stats='default',extra={})=>
 ({id,timeSeconds,enemy,pattern,count,lifetimeSeconds,stats,
   stage:timeSeconds<390?'first':timeSeconds<840?'second':'third',
   radius:240,...(pattern==='stampede'?{warningSeconds:.8}:{}),...extra});
export const campaignEventSettings={enabled:true,warningSeconds:.8};
export const campaignEventChart=[
 event('mob-cluster-0005',5,'mob','cluster',20),
 event('pedro-horde-0105',65,'pedrozilla','horde',30),
 event('mob2-wall-0130',90,'mob2','wall',140,8.3,{hp:120,exp:4}),
 event('mob2-ring-0235',155,'mob2','ring',50),
 event('mob3-stampede-0245',165,'mob3','stampede',10,20,{hp:500,exp:8}),
 event('mob-wall-0315',195,'mob','wall',140,8.3,{hp:200,spd:.55,exp:5}),
 event('pedro-horde-0318',198,'pedrozilla','horde',30),
 event('mob-stampede-0340',220,'mob','stampede',20,20,{hp:500,spd:1.6,exp:8}),
 event('mob-ring-0415',255,'mob','ring',50,26,{hp:200,exp:5}),
 event('pedro-hordes-0500',300,'pedrozilla','horde',100,null,'default',{endTimeSeconds:310,repeatSeconds:5}),
 event('mob2-stampede-0530',330,'mob2','stampede',40,20,{hp:800,spd:2,exp:8}),
 event('sweeper-ring-0700',420,'whiteSweeper','ring',120,25,{hp:500,atk:5,spd:.05,exp:10}),
 event('heavy-rings-0830',510,'heavySweeper','ring',27,22,'default',{repeatSeconds:1.66,repeatForLifetime:true}),
 event('ops-hordes-0900',540,'opsSweeper','horde',120,null,'default',{endTimeSeconds:570,repeatSeconds:5}),
 event('ops-stampede-1015',615,'opsSweeper','stampede',40,20,{hp:1000,spd:1.6,exp:10}),
 event('heavy-ring-1130',690,'heavySweeper','ring',120),
 event('sweeper-stampede-1220',740,'whiteSweeper','stampede',20,20,{hp:2000,atk:7,spd:2,exp:10}),
 event('ops-stampede-1225',745,'opsSweeper','stampede',20,20,{hp:2000,atk:7,spd:3,exp:10}),
 event('heavy-stampede-1245',765,'heavySweeper','stampede',188,20,{hp:2000,atk:7,spd:2,exp:10},{spawnDuration:5,endTimeSeconds:770}),
 event('sweeper-hordes-1330',810,'whiteSweeper','horde',40,null,{hp:70,atk:2,spd:1.7,exp:5},{endTimeSeconds:820,repeatSeconds:2}),
 event('highlander1-stampede-1420',860,'highlander1','stampede',10,20,{hp:2000,spd:2,exp:10}),
 event('highlander2-stampede-1425',865,'highlander2','stampede',10,20,{hp:2000,spd:2,exp:10}),
 event('highlander3-stampede-1430',870,'highlander3','stampede',20,20,{hp:2000,spd:2,exp:10}),
 event('highlander-mix-1435',875,['highlander1','highlander2','highlander3'],'stampede',24,20,{hp:2000,spd:2,exp:10},{endTimeSeconds:880,repeatSeconds:1}),
 event('arius3-wall-1445',885,'arius3','wall',16,20,{hp:2000,spd:1.6,exp:10}),
 event('arius1-wall-1615',975,'arius1','wall',100,15,{hp:1500,spd:.26,exp:10}),
 event('arius2-stampede-1700',1020,'arius2','stampede',40,20,{hp:5000,spd:2,exp:10})
];

/** Generated formations use regular and Mega variants; full bosses/harmless NPCs stay separate. */
export const seededEventSettings={enabled:true,startSeconds:1020,firstDelay:25,minInterval:35,maxInterval:55,
 patterns:['cluster','horde','hordeRush','ring','wall','stampede','wave','airdrop','fastball','ambush'],
 clusterCount:20,minCount:12,maxCount:60,minLifetime:14,maxLifetime:24,
 enemyTypes:['mob','mob2','mob3','pedrozilla','whiteSweeper','heavySweeper','opsSweeper',
  'arius1','arius2','arius3','highlander1','highlander2','highlander3',
  'megaMob','megaMob3','megaSweeper','megaHeavySweeper','megaOpsSweeper','megaArius2','megaArius3','megaPedrozilla']};
