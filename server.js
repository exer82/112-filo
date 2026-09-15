const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname)));
app.get('/health', (_req,res)=>res.json({ok:true, service:'112-filo-site'}));
app.get('*', (_req,res)=>res.sendFile(path.join(__dirname,'index.html')));
app.listen(PORT, ()=>console.log(`112 Filo site listening on ${PORT}`));
