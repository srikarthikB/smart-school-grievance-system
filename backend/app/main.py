import threading
import time
import requests

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analytics, auth, complaints, feedback, users
from app.core.config import settings


def keep_alive():
    while True:
        try:
            requests.get("https://smart-school-grievance-api.onrender.com/api/health")
            print("Ping sent")
        except Exception as e:
            print(f"Ping failed: {e}")

        time.sleep(600)  # 10 minutes

threading.Thread(target=keep_alive, daemon=True).start()


app = FastAPI(
    title="Smart School Grievance Management System API",
    version="1.0.0",
    description="REST API for school grievance submission, assignment, tracking, resolution, and feedback.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(complaints.router, prefix="/api/complaints", tags=["Complaints"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["Feedback"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
