from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

BASE=Path(__file__).resolve().parent
UPLOADS=BASE/"uploads"; UPLOADS.mkdir(exist_ok=True)
engine=create_engine("sqlite:///"+str(BASE/"fixmycity.db"),connect_args={"check_same_thread":False})
SessionLocal=sessionmaker(bind=engine); Base=declarative_base()
pwd=CryptContext(schemes=["bcrypt"],deprecated="auto")
SECRET="CHANGE_THIS_SECRET_KEY"
app=FastAPI(title="FixMyCity API")
app.add_middleware(CORSMiddleware,allow_origins=["http://localhost:5173","http://localhost:5174"],allow_methods=["*"],allow_headers=["*"],allow_credentials=True)
app.mount("/uploads",StaticFiles(directory=str(UPLOADS)),name="uploads")
security=HTTPBearer()

class User(Base):
    __tablename__="users"
    id=Column(Integer,primary_key=True); name=Column(String(100)); email=Column(String(150),unique=True,index=True); password=Column(String(255)); role=Column(String(30),default="citizen")
class Complaint(Base):
    __tablename__="complaints"
    id=Column(Integer,primary_key=True); user_id=Column(Integer); title=Column(String(150)); description=Column(Text)
    category=Column(String(60),default="Other"); priority=Column(String(30),default="Medium"); status=Column(String(30),default="Pending")
    department=Column(String(100),default="General"); latitude=Column(Float); longitude=Column(Float); image_url=Column(String(300)); created_at=Column(DateTime,default=datetime.utcnow)
Base.metadata.create_all(engine)

class Register(BaseModel): name:str; email:EmailStr; password:str
class Login(BaseModel): email:EmailStr; password:str
class Status(BaseModel): status:str

def db():
    s=SessionLocal()
    try: yield s
    finally: s.close()

def token(uid):
    return jwt.encode({"sub":str(uid),"exp":datetime.utcnow()+timedelta(hours=24)},SECRET,algorithm="HS256")

def user_now(c:HTTPAuthorizationCredentials=Depends(security),s:Session=Depends(db)):
    try: uid=int(jwt.decode(c.credentials,SECRET,algorithms=["HS256"])["sub"])
    except (JWTError,ValueError,KeyError): raise HTTPException(401,"Invalid or expired token")
    u=s.get(User,uid)
    if not u: raise HTTPException(401,"User not found")
    return u

def classify(t,d):
    x=(t+" "+d).lower()
    rules={"Pothole":["pothole","road hole","road damage","broken road","crack"],
           "Garbage":["garbage","trash","waste","dustbin","rubbish"],
           "Water Leakage":["water leak","leakage","pipe leak"],
           "Street Light":["street light","lamp post","light not working"],
           "Drainage":["drain","drainage","sewage"]}
    for cat,words in rules.items():
        if any(w in x for w in words): return cat
    return "Other"

def department(cat):
    return {"Pothole":"Road & Buildings","Garbage":"Sanitation","Water Leakage":"Water Department",
            "Street Light":"Electrical Department","Drainage":"Public Works","Other":"General"}[cat]

def priority(cat,d):
    x=d.lower()
    if any(w in x for w in ["accident","danger","hospital","school","major","flood"]): return "Critical"
    if cat in {"Pothole","Water Leakage","Drainage"}: return "High"
    return "Medium"

@app.get("/")
def root(): return {"message":"FixMyCity API is running"}

@app.post("/auth/register")
def register(x:Register,s:Session=Depends(db)):
    if s.query(User).filter_by(email=x.email).first(): raise HTTPException(400,"Email already registered")
    s.add(User(name=x.name,email=x.email,password=pwd.hash(x.password),role="citizen")); s.commit()
    return {"message":"Registration successful"}

@app.post("/auth/login")
def login(x:Login,s:Session=Depends(db)):
    u=s.query(User).filter_by(email=x.email).first()
    if not u or not pwd.verify(x.password,u.password): raise HTTPException(401,"Invalid email or password")
    return {"token":token(u.id),"user":{"id":u.id,"name":u.name,"email":u.email,"role":u.role}}

@app.post("/complaints")
async def create(title:str=Form(...),description:str=Form(...),latitude:Optional[float]=Form(None),longitude:Optional[float]=Form(None),
                 image:Optional[UploadFile]=File(None),u:User=Depends(user_now),s:Session=Depends(db)):
    cat=classify(title,description)
    url=None
    if image and image.filename:
        if not image.content_type or not image.content_type.startswith("image/"): raise HTTPException(400,"Only image files are allowed")
        data=await image.read()
        if len(data)>5*1024*1024: raise HTTPException(400,"Image must be under 5 MB")
        name=f"{u.id}_{int(datetime.utcnow().timestamp())}_{Path(image.filename).name}"
        (UPLOADS/name).write_bytes(data); url=f"/uploads/{name}"
    c=Complaint(user_id=u.id,title=title,description=description,category=cat,priority=priority(cat,description),
                department=department(cat),latitude=latitude,longitude=longitude,image_url=url)
    s.add(c); s.commit(); s.refresh(c)
    return c

def out(c): return {"id":c.id,"title":c.title,"description":c.description,"category":c.category,"priority":c.priority,
                    "status":c.status,"department":c.department,"latitude":c.latitude,"longitude":c.longitude,
                    "image_url":c.image_url,"created_at":c.created_at}

@app.get("/complaints/my")
def mine(u:User=Depends(user_now),s:Session=Depends(db)): return [out(c) for c in s.query(Complaint).filter_by(user_id=u.id).order_by(Complaint.created_at.desc()).all()]

@app.get("/complaints")
def all_complaints(u:User=Depends(user_now),s:Session=Depends(db)):
    if u.role not in ["officer","admin"]: raise HTTPException(403,"Officer/Admin only")
    return [out(c) for c in s.query(Complaint).order_by(Complaint.created_at.desc()).all()]

@app.patch("/complaints/{cid}/status")
def update(cid:int,x:Status,u:User=Depends(user_now),s:Session=Depends(db)):
    if u.role not in ["officer","admin"]: raise HTTPException(403,"Officer/Admin only")
    if x.status not in ["Pending","In Progress","Resolved"]: raise HTTPException(400,"Invalid status")
    c=s.get(Complaint,cid)
    if not c: raise HTTPException(404,"Complaint not found")
    c.status=x.status; s.commit(); s.refresh(c); return out(c)

@app.post("/admin/seed-demo")
def seed(s:Session=Depends(db)):
    for name,email,role in [("Demo Citizen","citizen@fixmycity.com","citizen"),("Demo Officer","officer@fixmycity.com","officer"),("Demo Admin","admin@fixmycity.com","admin")]:
        u=s.query(User).filter_by(email=email).first()
        if u:
            u.password=pwd.hash("Demo@123")
            u.role=role
        else:
            s.add(User(name=name,email=email,password=pwd.hash("Demo@123"),role=role))
    s.commit()
    return {"message":"Demo accounts ready","password":"Demo@123"}
