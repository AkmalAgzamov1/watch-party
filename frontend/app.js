// ----- State -----
let socket;
let socketReady = false;
let suppressVideoSignal = false;
let pendingPlay = false;
let currentUser = {
    id: null,
    name: generateDisplayName(),
};
let members = [];

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room")?.trim() || `room-${Math.random().toString(36).slice(2, 10)}`;

// ----- Elements -----
const video = document.getElementById("video");
const messagesDiv = document.getElementById("messages");
const statusDiv = document.getElementById("status");
const input = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const chatForm = document.getElementById("chatForm");
const roomCodeElement = document.getElementById("roomCode");
const copyRoomBtn = document.getElementById("copyRoomBtn");
const membersList = document.getElementById("membersList");
const memberCount = document.getElementById("memberCount");
const currentNameElement = document.getElementById("currentName");
const renameButton = document.getElementById("renameButton");

// ----- Setup -----
roomCodeElement && (roomCodeElement.innerText = roomId);

if (roomId && window.history.replaceState) {
    window.history.replaceState({}, "", `?room=${encodeURIComponent(roomId)}`);
}

copyRoomBtn?.addEventListener("click", copyRoomCode);
renameButton?.addEventListener("click", renameCurrentUser);
chatForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage();
});

video?.addEventListener("play", () => sendVideoSignal("play"));
video?.addEventListener("pause", () => sendVideoSignal("pause"));
video?.addEventListener("seeked", sendSeekSignal);

connect();
setChatEnabled(false);
renderCurrentName();
renderMemberList(members, currentUser.id, membersList, memberCount);

// ----- Socket -----
function getSocketUrl() {
    const hostname = window.location.hostname || "127.0.0.1";
    const host = hostname === "localhost" ? "127.0.0.1" : hostname;
    return `ws://${host}:8000/ws/${roomId}?name=${encodeURIComponent(currentUser.name)}`;
}

function connect() {
    socket = new WebSocket(getSocketUrl());

    socket.onopen = () => {
        socketReady = true;
        setStatus("Connected", "connected");
        setChatEnabled(true);
        setSystemMessage("Connected to the room.");

        if (pendingPlay && !video?.paused) {
            pendingPlay = false;
            sendSocketEvent("play");
        }
    };

    socket.onmessage = (event) => {
        handleSocketEvent(JSON.parse(event.data));
    };

    socket.onclose = () => {
        socketReady = false;
        setStatus("Reconnecting", "disconnected");
        setChatEnabled(false);
        setTimeout(connect, 2000);
    };
}

function sendSocketEvent(type, payload = {}) {
    if (!socketReady) return false;

    socket.send(JSON.stringify({ type, ...payload }));
    return true;
}

// All incoming socket event types live here.
function handleSocketEvent(data) {
    const handlers = {
        chat: () => addChatMessage(data.message, data.sender, data.sender?.id === currentUser.id),
        play: applyRemotePlay,
        pause: applyRemotePause,
        seek: () => applyRemoteSeek(data.time),
        "room-state": () => setRoomState(data.currentUser, data.members, data.playback),
        "user-joined": () => applyUserJoined(data.user, data.members),
        "user-left": () => applyUserLeft(data.user, data.members),
        "name-change": () => applyNameChange(data.user, data.previousName, data.members),
        system: () => console.warn(data.message),
    };

    handlers[data.type]?.();
}

function setRoomState(user, roomMembers, playback) {
    currentUser = user;
    members = roomMembers || [];
    renderCurrentName();
    renderMemberList(members, currentUser.id, membersList, memberCount);
    applyRoomPlayback(playback);
}

function applyUserJoined(user, roomMembers) {
    members = roomMembers || members;
    renderMemberList(members, currentUser.id, membersList, memberCount);

    if (user?.id === currentUser.id) return;
    setSystemMessage(`${user.name} joined the room.`);
}

function applyUserLeft(user, roomMembers) {
    members = roomMembers || members;
    renderMemberList(members, currentUser.id, membersList, memberCount);

    if (user?.name) {
        setSystemMessage(`${user.name} left the room.`);
    }
}

function applyNameChange(user, previousName, roomMembers) {
    members = roomMembers || members;
    renderMemberList(members, currentUser.id, membersList, memberCount);

    if (user?.id === currentUser.id) {
        currentUser = user;
        renderCurrentName();
        return;
    }

    if (user?.name && previousName) {
        setSystemMessage(`${previousName} is now ${user.name}.`);
    }
}

function renameCurrentUser() {
    const nextName = normalizeDisplayName(window.prompt("Rename yourself", currentUser.name) || "");
    if (!nextName || nextName === currentUser.name) return;
    if (!sendSocketEvent("name-change", { name: nextName })) return;

    currentUser = { ...currentUser, name: nextName };
    renderCurrentName();
}

function renderCurrentName() {
    if (!currentNameElement) return;
    currentNameElement.innerText = currentUser.name;
}
