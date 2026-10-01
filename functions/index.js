import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
const app=express(); app.use(cors()); app.use(express.json({limit:'200kb'}));
app.post('/api/plan-day',async(req,res)=>{try{if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'OPENAI_API_KEY is not configured.'});const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});const tasks=Array.isArray(req.body.tasks)?req.body.tasks.slice(0,50):[];const response=await client.responses.create({model:'gpt-5-mini',input:[{role:'system',content:'You are a productivity planning assistant. Build a realistic schedule from the supplied tasks. Respect priorities, times, durations and breaks. Return concise JSON only.'},{role:'user',content:JSON.stringify({date:req.body.date,tasks})}]});res.json({plan:response.output_text})}catch(err){console.error(err);res.status(500).json({error:'Unable to build plan.'})}});
app.listen(process.env.PORT||3000,()=>console.log('API ready'));
