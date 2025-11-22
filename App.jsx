import React, { useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const API = (import.meta && import.meta.env && import.meta.env.VITE_API) ? import.meta.env.VITE_API : 'http://localhost:4000/api';
const ADMIN_PASSWORD = 'admin123';
const PERSONALIDADES = ['Estratega','Creativo','Competitivo','Explorador','Narrativo','Social','Relajado','Hardcore','Innovador'];

function GameViewer({ url, onClose }) {
  if (!url) return null;
  return (
    <div className='viewer'>
      <div className='viewer-inner'>
        <button className='close' onClick={onClose}>Cerrar</button>
        <iframe src={url} title='game' className='game-frame'></iframe>
      </div>
    </div>
  );
}

function GameCard({ game, onPlay, onToggle, onDelete }) {
  return (
    <div className='card'>
      <div className='thumb'>{game.portada ? <img src={game.portada} alt='' /> : 'No image'}</div>
      <div className='info'>
        <h3>{game.titulo}</h3>
        <p className='muted'>{game.genero} • {game.personalidad}</p>
        <div className='actions'>
          <button onClick={()=>onPlay(game.url)}>Jugar</button>
          <button onClick={()=>onToggle(game)}>{game.completado ? 'No completado' : 'Marcar completado'}</button>
          <button onClick={()=>onDelete(game._id)}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

function Featured({ games, onPlay }) {
  const featured = games.slice(0,4);
  return (
    <div className='featured'>
      <h2>Destacados</h2>
      <div className='grid'>
        {featured.map(g=>(
          <div key={g._id} className='feat'>
            <img src={g.portada} alt=''/>
            <div className='title'>{g.titulo}</div>
            <button onClick={()=>onPlay(g.url)}>Jugar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPanel({ onAddLocal }) {
  const [pass, setPass] = useState('');
  const [authed, setAuthed] = useState(false);
  const [form, setForm] = useState({ titulo:'', genero:'', personalidad:'', portada:'', url:'' });

  const login = ()=> { if(pass===ADMIN_PASSWORD) setAuthed(true); else alert('Contraseña incorrecta'); };
  const add = ()=> { if(!form.titulo||!form.url){alert('Titulo y URL obligatorios'); return;} const newGame={...form,_id:'local_'+Date.now(),horas:0,puntuacion:0,completado:false}; onAddLocal(newGame); setForm({ titulo:'', genero:'', personalidad:'', portada:'', url:'' }); };

  if(!authed) return (<div className='panel'><h3>Login Admin</h3><input placeholder='Contraseña' value={pass} onChange={e=>setPass(e.target.value)}/><button onClick={login}>Entrar</button></div>);

  return (
    <div className='panel'>
      <h3>Admin - Agregar juego</h3>
      <input placeholder='Título' value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})}/>
      <input placeholder='Género' value={form.genero} onChange={e=>setForm({...form,genero:e.target.value})}/>
      <select value={form.personalidad} onChange={e=>setForm({...form,personalidad:e.target.value})}>
        <option value=''>Personalidad</option>
        {PERSONALIDADES.map(p=> <option key={p} value={p}>{p}</option>)}
      </select>
      <input placeholder='URL portada' value={form.portada} onChange={e=>setForm({...form,portada:e.target.value})}/>
      <input placeholder='URL del juego' value={form.url} onChange={e=>setForm({...form,url:e.target.value})}/>
      <button onClick={add}>Agregar local</button>
    </div>
  );
}

function StatsPanel({ games }) {
  const total = games.length;
  const horas = games.reduce((s,g)=>s+(g.horas||0),0);
  const avg = total ? (games.reduce((s,g)=>s+(g.puntuacion||0),0)/total).toFixed(2) : '0.00';
  const completed = games.filter(g=>g.completado).length;
  const perPers = PERSONALIDADES.map(p=>({p,count:games.filter(g=>g.personalidad===p).length}));
  const topByHours = [...games].sort((a,b)=>(b.horas||0)-(a.horas||0)).slice(0,5);

  const exportJSON = ()=>{ const d={total,horas,avg,completed,perPers,topByHours}; const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='stats.json'; a.click(); URL.revokeObjectURL(url); };
  const exportPDF = async ()=>{ const doc=new jsPDF('p','pt','a4'); const node=document.getElementById('stats-for-pdf'); const canvas=await html2canvas(node,{scale:2}); const img=canvas.toDataURL('image/png'); const imgProps=doc.getImageProperties(img); const pdfWidth=doc.internal.pageSize.getWidth(); const pdfHeight=(imgProps.height*pdfWidth)/imgProps.width; doc.addImage(img,'PNG',0,0,pdfWidth,pdfHeight); doc.save('gametracker-stats.pdf'); };

  return (
    <div id='stats-for-pdf' className='panel'>
      <h3>Panel de Estadísticas</h3>
      <div className='grid'>
        <div>Juegos: <strong>{total}</strong></div>
        <div>Horas: <strong>{horas}</strong></div>
        <div>Promedio: <strong>{avg}</strong></div>
        <div>Completados: <strong>{completed}</strong></div>
      </div>
      <div className='mt-2'>
        <h4>Juegos por personalidad</h4>
        {perPers.map(x=> <div key={x.p}>{x.p}: {x.count}</div>)}
      </div>
      <div className='mt-2'>
        <h4>Top por horas</h4>
        <ol>{topByHours.map(g=> <li key={g._id}>{g.titulo} — {g.horas||0} h</li>)}</ol>
      </div>
      <div className='mt-2'><button onClick={exportJSON}>Exportar JSON</button><button onClick={exportPDF}>Exportar PDF</button></div>
    </div>
  );
}

export default function App(){
  const [route,setRoute]=useState('library');
  const [games,setGames]=useState([]);
  const [viewer,setViewer]=useState(null);

  useEffect(()=>{
    const local=[{_id:'1',titulo:'Fireboy & Watergirl',genero:'Puzzle / Cooperativo',personalidad:'Creativo',portada:'https://i.imgur.com/kN0y4y8.png',url:'https://poki.com/en/g/fireboy-and-watergirl',horas:0,puntuacion:0,completado:false},{_id:'2',titulo:'Slope',genero:'Arcade / Reflejos',personalidad:'Competitivo',portada:'https://i.imgur.com/QkQzE3t.png',url:'https://poki.com/en/g/slope',horas:0,puntuacion:0,completado:false},{_id:'3',titulo:'Subway Surfers',genero:'Arcade / Runner',personalidad:'Explorador',portada:'https://i.imgur.com/bzVtzM2.png',url:'https://poki.com/en/g/subway-surfers',horas:0,puntuacion:0,completado:false},{_id:'4',titulo:'Temple Run 2',genero:'Runner',personalidad:'Explorador',portada:'https://i.imgur.com/eV2kQou.png',url:'https://poki.com/en/g/temple-run-2',horas:0,puntuacion:0,completado:false},{_id:'5',titulo:'Moto X3M',genero:'Carreras / Acrobacias',personalidad:'Competitivo',portada:'https://i.imgur.com/aOFVx2L.png',url:'https://poki.com/en/g/moto-x3m',horas:0,puntuacion:0,completado:false},{_id:'6',titulo:'Vex 7',genero:'Plataformas',personalidad:'Hardcore',portada:'https://i.imgur.com/dGnyE8z.png',url:'https://poki.com/en/g/vex-7',horas:0,puntuacion:0,completado:false},{_id:'7',titulo:'Basketball Stars',genero:'Deportes',personalidad:'Social',portada:'https://i.imgur.com/ZscjlAq.png',url:'https://poki.com/en/g/basketball-stars',horas:0,puntuacion:0,completado:false},{_id:'8',titulo:'Stickman Hook',genero:'Arcade',personalidad:'Relajado',portada:'https://i.imgur.com/2C51pPj.png',url:'https://poki.com/en/g/stickman-hook',horas:0,puntuacion:0,completado:false},{_id:'9',titulo:'Getting Over It',genero:'Plataformas Difíciles',personalidad:'Hardcore',portada:'https://i.imgur.com/lpV5zGZ.png',url:'https://poki.com/en/g/getting-over-it',horas:0,puntuacion:0,completado:false},{_id:'10',titulo:'2048',genero:'Lógica',personalidad:'Estratega',portada:'https://i.imgur.com/0lTe57o.png',url:'https://poki.com/en/g/2048',horas:0,puntuacion:0,completado:false}];
    (async()=>{
      try{
        const res=await axios.get(`${API}/games`);
        if(res && res.data && res.data.length) setGames(res.data);
        else setGames(local);
      }catch(e){
        setGames(local);
      }
    })();
  },[]);

  const handlePlay=url=>setViewer(url);
  const toggleComplete=async(game)=>{ if(game._id && !String(game._id).startsWith('local_')){ try{ await axios.put(`${API}/games/${game._id}`,{...game,completado:!game.completado}); const res=await axios.get(`${API}/games`); setGames(res.data); return;}catch{} } setGames(prev=>prev.map(g=>g._id===game._id?{...g,completado:!g.completado}:g)); };
  const deleteGame=async(id)=>{ if(confirm('Eliminar juego?')){ if(!String(id).startsWith('local_')){ try{ await axios.delete(`${API}/games/${id}`); const res=await axios.get(`${API}/games`); setGames(res.data); return;}catch{} } setGames(prev=>prev.filter(g=>g._id!==id)); } };
  const addLocalGame=game=>{ const newGame={...game,_id:'local_'+Date.now()}; setGames(prev=>[...prev,newGame]); };

  return (
    <div className='app'>
      <header className='header'>
        <div><h1>GameTracker PRO</h1><div className='muted'>Biblioteca por personalidad</div></div>
        <nav>
          <button onClick={()=>setRoute('library')}>Biblioteca</button>
          <button onClick={()=>setRoute('featured')}>Destacados</button>
          <button onClick={()=>setRoute('stats')}>Estadísticas</button>
          <button onClick={()=>setRoute('admin')}>Admin</button>
        </nav>
      </header>

      <main className='main'>
        {route==='library' && <div className='layout'><div className='list'>{games.map(g=> <GameCard key={g._id} game={g} onPlay={handlePlay} onToggle={toggleComplete} onDelete={deleteGame} />)}</div><aside className='aside'><StatsPanel games={games} /></aside></div>}
        {route==='featured' && <Featured games={games} onPlay={handlePlay} />}
        {route==='stats' && <StatsPanel games={games} />}
        {route==='admin' && <AdminPanel onAddLocal={addLocalGame} />}
      </main>

      <GameViewer url={viewer} onClose={()=>setViewer(null)} />
    </div>
  );
}
