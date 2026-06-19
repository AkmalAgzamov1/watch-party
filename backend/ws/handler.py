from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.ws.manager import ConnectionManager
import json

router = APIRouter()
manager = ConnectionManager()


@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    requested_name = websocket.query_params.get("name", "Guest").strip()
    user = await manager.connect(room_id, websocket, normalize_name(requested_name))
    user_id = user["id"]

    await websocket.send_text(json.dumps({
        "type": "room-state",
        "currentUser": user,
        "members": manager.members(room_id),
        "playback": manager.playback_state(room_id),
    }))
    await manager.broadcast(room_id, json.dumps({
        "type": "user-joined",
        "user": user,
        "members": manager.members(room_id),
    }))

    try:
        while True:
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                msg_type = message.get("type")
                print(f"Received message of type {msg_type} in room {room_id}")

                if msg_type == "chat":
                    await manager.broadcast(
                        room_id,
                        json.dumps({
                            "type": "chat",
                            "message": message["message"],
                            "sender": user,
                        })
                    )
                elif msg_type == "name-change":
                    requested_name = message.get("name", "")
                    renamed = manager.rename(room_id, user_id, normalize_name(requested_name))
                    if renamed:
                        previous_name, user = renamed
                        await manager.broadcast(
                            room_id,
                            json.dumps({
                                "type": "name-change",
                                "user": user,
                                "previousName": previous_name,
                                "members": manager.members(room_id),
                            })
                        )
                elif msg_type == "play":
                    play_time = float(message.get("time", 0))
                    manager.update_playback(room_id, play_time, True)
                    await manager.broadcast(
                        room_id,
                        json.dumps({
                            "type": "play",
                            "time": play_time,
                        })
                    )
                elif msg_type == "pause":
                    pause_time = float(message.get("time", 0))
                    manager.update_playback(room_id, pause_time, False)
                    await manager.broadcast(
                        room_id,
                        json.dumps({
                            "type": "pause",
                            "time": pause_time,
                        })
                    )
                elif msg_type == "seek":
                    seek_time = float(message["time"])
                    playback = manager.playback.get(room_id, {"playing": False})
                    manager.update_playback(room_id, seek_time, playback.get("playing", False))
                    await manager.broadcast(
                        room_id,
                        json.dumps({
                            "type": "seek",
                            "time": seek_time,
                        })
                    )
                else:
                    await manager.broadcast(
                        room_id,
                        json.dumps({
                            "type": "system",
                            "message": "unknown event"
                        })
                    )

            except json.JSONDecodeError:
                await manager.broadcast(
                    room_id,
                    json.dumps({
                        "type": "chat",
                        "message": data,
                        "sender": user,
                    })
                )

    except WebSocketDisconnect:
        disconnected_user = manager.disconnect(room_id, user_id)
        if disconnected_user:
            await manager.broadcast(room_id, json.dumps({
                "type": "user-left",
                "user": disconnected_user,
                "members": manager.members(room_id),
            }))


def normalize_name(name: str):
    name = " ".join(name.split())
    return name[:32] or "Guest"
