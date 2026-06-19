from fastapi import FastAPI
from backend.ws.handler import router as ws_router

app = FastAPI()

app.include_router(ws_router)

@app.get("/")
def home():
    return {"message": "Hello"}     