const iso = d => d.toISOString().slice(0,10);
export const todayISO = () => iso(new Date());
export function seedData(date=todayISO()){
 return {tasks:[
  ['Finish washing dishes','High','Home','08:30',30],['Fix blackout curtain','High','Home','09:00',30],['Mop my floors','High','Home','09:30',30],['Make 2 shirts (GVO & Travel)','High','Creative','10:00',60],['Make cologne','High','Personal','11:00',30],['Pay rent','High','Finance','11:30',30],['Make brownies','Medium','Home','12:00',60],['Order rest of Halloween costume','Medium','Personal','13:00',60],['Check closet for black suits','Medium','Personal','14:00',30],['Buy black jeans','Medium','Shopping','14:30',30],['Buy black boots','Medium','Shopping','15:00',30],['Cook chicken','Medium','Home','16:00',60],['Build todo list / calendar web app','High','Project','17:00',120],['Find out if TVs was a scam','Medium','Personal','19:00',60]
 ].map((x,i)=>({id:`seed-${i}`,title:x[0],priority:x[1],category:x[2],startTime:x[3],estimatedMinutes:x[4],date,notes:'',completed:false,createdAt:Date.now()+i})),
 goals:[{id:'g1',title:'Get all off-day tasks done',completed:false},{id:'g2',title:'Keep space clean',completed:false},{id:'g3',title:'Make progress on personal goals',completed:false},{id:'g4',title:'Save money',completed:false}],
 habits:[{id:'h1',title:'Workout / move',completed:false},{id:'h2',title:'Water (8 cups)',completed:false},{id:'h3',title:'Eat good',completed:false},{id:'h4',title:'Stay organized',completed:false},{id:'h5',title:'Limit distractions',completed:false}],
 notes:[{id:'n1',title:'Check TV company/order status and payment trail'},{id:'n2',title:'Plan Halloween costume delivery timeline'},{id:'n3',title:'Take photos of finished GVO & Travel shirts'}],
 shopping:[{id:'s1',title:'Halloween costume items',completed:false},{id:'s2',title:'Black jeans',completed:false},{id:'s3',title:'Black boots',completed:false}]};
}
