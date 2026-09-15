const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const app = express();
app.set('trust proxy', 1);
app.use(express.json({limit:'15mb'}));
app.use(session({secret:process.env.SESSION_SECRET||'change-this-session-secret',resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:8*60*60*1000}}));
const pool = new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:false});
const seed=JSON.parse(fs.readFileSync(path.join(__dirname,'seed.json'),'utf8'));
async function db(){
 const c=await pool.query('SELECT COUNT(*)::int AS n FROM vehicles');
 if(c.rows[0].n===0){for(const v of seed)await pool.query('INSERT INTO vehicles(data) VALUES($1)',[v]);}
}
const adminRequired=(req,res,next)=>{if(!req.session.admin)return res.status(401).json({error:'Bu işlem için yönetici girişi gerekiyor.'});next()};
const rows=q=>q.rows.map(r=>({id:String(r.id),...r.data}));
app.post('/api/login',(req,res)=>{if((req.body.password||'')!==(process.env.ADMIN_PASSWORD||'112admin'))return res.status(401).json({error:'Yönetici parolası hatalı.'});req.session.admin=true;res.json({ok:true})});
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/bootstrap',async(req,res,next)=>{try{const [v,s]=await Promise.all([pool.query('SELECT id,data FROM vehicles ORDER BY id'),pool.query("SELECT id,data FROM services ORDER BY (data->>'date') DESC NULLS LAST,id DESC")]);res.json({vehicles:rows(v),services:rows(s),authenticated:!!req.session.admin})}catch(e){next(e)}});
app.post('/api/vehicles',adminRequired,async(req,res,next)=>{try{const r=await pool.query('INSERT INTO vehicles(data) VALUES($1) RETURNING id,data',[req.body]);res.status(201).json({vehicle:{id:String(r.rows[0].id),...r.rows[0].data}})}catch(e){next(e)}});
app.put('/api/vehicles/:id',adminRequired,async(req,res,next)=>{try{const r=await pool.query('UPDATE vehicles SET data=$1,updated_at=NOW() WHERE id=$2 RETURNING id,data',[req.body,req.params.id]);if(!r.rowCount)return res.status(404).json({error:'Araç bulunamadı.'});res.json({vehicle:{id:String(r.rows[0].id),...r.rows[0].data}})}catch(e){next(e)}});
app.delete('/api/vehicles/:id',adminRequired,async(req,res,next)=>{try{const q=await pool.query("SELECT data->>'ARAC PLAKASI' AS plate FROM vehicles WHERE id=$1",[req.params.id]);if(!q.rowCount)return res.status(404).json({error:'Araç bulunamadı.'});await pool.query("DELETE FROM services WHERE data->>'plate'=$1",[q.rows[0].plate]);await pool.query('DELETE FROM vehicles WHERE id=$1',[req.params.id]);res.json({ok:true})}catch(e){next(e)}});
app.post('/api/services',adminRequired,async(req,res,next)=>{try{const r=await pool.query('INSERT INTO services(data) VALUES($1) RETURNING id,data',[req.body]);res.status(201).json({service:{id:String(r.rows[0].id),...r.rows[0].data}})}catch(e){next(e)}});
app.put('/api/services/:id',adminRequired,async(req,res,next)=>{try{const r=await pool.query('UPDATE services SET data=$1,updated_at=NOW() WHERE id=$2 RETURNING id,data',[req.body,req.params.id]);if(!r.rowCount)return res.status(404).json({error:'Servis kaydı bulunamadı.'});res.json({service:{id:String(r.rows[0].id),...r.rows[0].data}})}catch(e){next(e)}});
app.delete('/api/services/:id',adminRequired,async(req,res,next)=>{try{const r=await pool.query('DELETE FROM services WHERE id=$1',[req.params.id]);if(!r.rowCount)return res.status(404).json({error:'Servis kaydı bulunamadı.'});res.json({ok:true})}catch(e){next(e)}});
app.post('/api/backup/import',adminRequired,async(req,res,next)=>{const c=await pool.connect();try{await c.query('BEGIN');await c.query('DELETE FROM services');await c.query('DELETE FROM vehicles');for(const v of(req.body.vehicles||[])){const x={...v};delete x.id;await c.query('INSERT INTO vehicles(data) VALUES($1)',[x])}for(const s of(req.body.services||[])){const x={...s};delete x.id;await c.query('INSERT INTO services(data) VALUES($1)',[x])}await c.query('COMMIT');const [v,s]=await Promise.all([c.query('SELECT id,data FROM vehicles ORDER BY id'),c.query('SELECT id,data FROM services ORDER BY id DESC')]);res.json({vehicles:rows(v),services:rows(s)})}catch(e){await c.query('ROLLBACK');next(e)}finally{c.release()}});
app.use(express.static(path.join(__dirname,'public')));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Sunucu hatası. Yöneticiye başvurun.'})});
const port=process.env.PORT||3000;db().then(()=>app.listen(port,'0.0.0.0',()=>console.log(`112 Filo: http://0.0.0.0:${port}`))).catch(e=>{console.error(e);process.exit(1)});
