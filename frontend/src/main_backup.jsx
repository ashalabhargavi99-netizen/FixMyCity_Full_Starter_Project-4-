import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import axios from "axios";
import "./style.css";
const API="http://127.0.0.1:8000";
const api=axios.create({baseURL:API});
api.interceptors.request.use(c=>{let t=localStorage.getItem("token");if(t)c.headers.Authorization=`Bearer ${t}`;return c});

function App(){
 const [page,setPage]=useState("home"),[user,setUser]=useState(()=>JSON.parse(localStorage.getItem("user")||"null"));
 const logout=()=>{localStorage.clear();setUser(null);setPage("home")};
 return <><header><b onClick={()=>setPage("home")}>📍 FixMyCity</b><nav>
 <button onClick={()=>setPage("home")}>Home</button>{user&&<><button onClick={()=>setPage("report")}>Report Issue</button><button onClick={()=>setPage("mine")}>My Complaints</button></>}
 {user&&["officer","admin"].includes(user.role)&&<button onClick={()=>setPage("officer")}>Officer Dashboard</button>}
 {!user?<><button onClick={()=>setPage("login")}>Login</button><button className="blue" onClick={()=>setPage("register")}>Register</button></>:<button onClick={logout}>Logout</button>}
 </nav></header><main>
 {page==="home"&&<Home go={setPage} user={user}/>}
 {page==="login"&&<Login setUser={setUser} go={setPage}/>}
 {page==="register"&&<Register go={setPage}/>}
 {page==="report"&&user&&<Report go={setPage}/>}
 {page==="mine"&&user&&<Mine/>}
 {page==="officer"&&user&&<Officer/>}
 </main><footer>FixMyCity • Report Today. Better City Tomorrow.</footer></>
}
function Home({go,user}){return <section className="hero"><div><small>AI-POWERED CIVIC PLATFORM</small><h1>Report civic problems.<br/><em>Build a better city.</em></h1><p>Report potholes, garbage, water leakage, street-light and drainage issues. FixMyCity routes complaints to the right department.</p><button className="blue big" onClick={()=>go(user?"report":"login")}>Report an Issue</button></div><div className="card"><h2>How it works</h2><p>👤 Citizen</p><p>🤖 AI Analysis</p><p>🏛️ Department</p><p>👨‍💼 Officer</p><p>🔧 Resolution</p><p>⭐ Citizen Feedback</p></div></section>}
function Login({setUser,go}){let[e,setE]=useState(""),[p,setP]=useState(""),[m,setM]=useState("");async function submit(x){x.preventDefault();try{let r=await api.post("/auth/login",{email:e,password:p});localStorage.setItem("token",r.data.token);localStorage.setItem("user",JSON.stringify(r.data.user));setUser(r.data.user);go("home")}catch(x){setM(x.response?.data?.detail||"Login failed")}}return <Auth title="Login" submit={submit} msg={m}><input placeholder="Email" type="email" value={e} onChange={x=>setE(x.target.value)} required/><input placeholder="Password" type="password" value={p} onChange={x=>setP(x.target.value)} required/></Auth>}
function Register({go}){let[n,setN]=useState(""),[e,setE]=useState(""),[p,setP]=useState(""),[m,setM]=useState("");async function submit(x){x.preventDefault();try{await api.post("/auth/register",{name:n,email:e,password:p});alert("Registered. Please login.");go("login")}catch(x){setM(x.response?.data?.detail||"Registration failed")}}return <Auth title="Create Account" submit={submit} msg={m}><input placeholder="Full name" value={n} onChange={x=>setN(x.target.value)} required/><input placeholder="Email" type="email" value={e} onChange={x=>setE(x.target.value)} required/><input placeholder="Password" type="password" value={p} onChange={x=>setP(x.target.value)} minLength="6" required/></Auth>}
function Auth({title,submit,children,msg}){return <div className="wrap"><form className="card form" onSubmit={submit}><h2>{title}</h2>{children}<button className="blue">Continue</button>{msg&&<p className="error">{msg}</p>}</form></div>}
function Report({go}){let[t,setT]=useState(""),[d,setD]=useState(""),[f,setF]=useState(null),[lat,setLat]=useState(""),[lng,setLng]=useState(""),[m,setM]=useState("");function loc(){navigator.geolocation?.getCurrentPosition(p=>{setLat(p.coords.latitude);setLng(p.coords.longitude)},()=>setM("Location permission denied."))}async function submit(e){e.preventDefault();let x=new FormData();x.append("title",t);x.append("description",d);if(lat)x.append("latitude",lat);if(lng)x.append("longitude",lng);if(f)x.append("image",f);try{let r=await api.post("/complaints",x);alert(`Complaint #${r.data.id} submitted\\nAI Category: ${r.data.category}\\nDepartment: ${r.data.department}\\nPriority: ${r.data.priority}`);go("mine")}catch(e){setM(e.response?.data?.detail||"Submission failed")}}return <div className="wrap wide"><form className="card form" onSubmit={submit}><h2>Report an Issue</h2><label>Issue title</label><input value={t} onChange={e=>setT(e.target.value)} placeholder="e.g. Large pothole near school" required/><label>Description</label><textarea value={d} onChange={e=>setD(e.target.value)} placeholder="Describe the problem..." required/><label>Photo</label><input type="file" accept="image/*" onChange={e=>setF(e.target.files[0])}/><label>Location</label><div className="row"><input readOnly value={lat?`${lat}, ${lng}`:"Not selected"}/><button type="button" onClick={loc}>📍 Use My Location</button></div><button className="blue">Submit Complaint</button>{m&&<p className="error">{m}</p>}</form></div>}
function Mine(){let[x,setX]=useState([]);useEffect(()=>{api.get("/complaints/my").then(r=>setX(r.data))},[]);return <section className="page"><h2>My Complaints</h2>{!x.length?<div className="card">No complaints yet.</div>:x.map(c=><div className="card item" key={c.id}><div><h3>#{c.id} • {c.title}</h3><p>{c.description}</p><p><b>Category:</b> {c.category} &nbsp; <b>Department:</b> {c.department}</p></div><span className="tag">{c.status}</span></div>)}</section>}
function Officer(){let[x,setX]=useState([]);async function load(){setX((await api.get("/complaints")).data)}useEffect(()=>{load()},[]);async function st(id,status){await api.patch(`/complaints/${id}/status`,{status});load()}return <section className="page"><h2>Officer Dashboard</h2>{x.map(c=><div className="card item" key={c.id}><div><h3>#{c.id} • {c.title}</h3><p>{c.description}</p><p>{c.category} • {c.department} • <b>{c.priority}</b></p></div><select value={c.status} onChange={e=>st(c.id,e.target.value)}><option>Pending</option><option>In Progress</option><option>Resolved</option></select></div>)}</section>}
createRoot(document.getElementById("root")).render(<App/>);
