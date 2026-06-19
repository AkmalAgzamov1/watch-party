from fastapi import WebSocket
from typing import Dict
from uuid import uuid4
import time


DEFAULT_PLAYBACK = {"time": 0.0, "playing": False, "updated_at": 0.0}


class ConnectionManager:
    def __init__(self):
        # room_id -> connection id -> connection metadata
        self.rooms: Dict[str, Dict[str, dict]] = {}
        # room_id -> playback state
        self.playback: Dict[str, dict] = {}

    async def connect(self, room_id: str, websocket: WebSocket, name: str):
        await websocket.accept()

        if room_id not in self.rooms:
            self.rooms[room_id] = {}

        user_id = uuid4().hex
        user = {"id": user_id, "name": name}
        self.rooms[room_id][user_id] = {
            "websocket": websocket,
            "user": user,
        }
        return user

    def disconnect(self, room_id: str, user_id: str):
        if room_id not in self.rooms or user_id not in self.rooms[room_id]:
            return None

        connection = self.rooms[room_id].pop(user_id)

        if len(self.rooms[room_id]) == 0:
            del self.rooms[room_id]
            self.playback.pop(room_id, None)

        return connection["user"]

    def update_playback(self, room_id: str, position: float, playing: bool):
        self.playback[room_id] = {
            "time": max(0.0, float(position)),
            "playing": playing,
            "updated_at": time.time(),
        }

    def playback_state(self, room_id: str):
        state = self.playback.get(room_id, DEFAULT_PLAYBACK.copy())
        current_time = state["time"]

        if state["playing"]:
            elapsed = time.time() - state["updated_at"]
            current_time += max(0.0, elapsed)

        return {
            "time": current_time,
            "playing": state["playing"],
        }

    def rename(self, room_id: str, user_id: str, name: str):
        if room_id not in self.rooms or user_id not in self.rooms[room_id]:
            return None

        user = self.rooms[room_id][user_id]["user"]
        previous_name = user["name"]
        user["name"] = name
        return previous_name, user

    def members(self, room_id: str):
        if room_id not in self.rooms:
            return []

        return [connection["user"] for connection in self.rooms[room_id].values()]

    async def broadcast(self, room_id: str, message: str):
        if room_id not in self.rooms:
            return

        for connection in self.rooms[room_id].values():
            await connection["websocket"].send_text(message)
