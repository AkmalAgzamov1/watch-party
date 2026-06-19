// ----- Video sync -----
function sendVideoSignal(type) {
    if (suppressVideoSignal || !video) return;

    const payload = { time: video.currentTime };
    if (!sendSocketEvent(type, payload) && type === "play") {
        pendingPlay = true;
    }
}

function sendSeekSignal() {
    if (suppressVideoSignal || !video) return;

    sendSocketEvent("seek", { time: video.currentTime });
}

function applyRemotePlay() {
    if (!video || !video.paused) return;

    suppressVideoSignal = true;
    video.play()
        .catch((error) => console.warn("Remote play blocked.", error))
        .finally(() => {
            suppressVideoSignal = false;
        });
}

function applyRemotePause() {
    if (!video || video.paused) return;

    suppressVideoSignal = true;
    video.pause();
    suppressVideoSignal = false;
}

function applyRemoteSeek(time) {
    if (!video || typeof time !== "number") return;
    if (Math.abs(video.currentTime - time) < 0.3) return;

    suppressVideoSignal = true;
    video.currentTime = time;
    setTimeout(() => {
        suppressVideoSignal = false;
    }, 0);
}

function applyRoomPlayback(playback) {
    if (!video || !playback || typeof playback.time !== "number") return;

    suppressVideoSignal = true;

    const seek = () => {
        if (Math.abs(video.currentTime - playback.time) >= 0.3) {
            video.currentTime = playback.time;
        }
    };

    if (video.readyState >= 1) {
        seek();
    } else {
        video.addEventListener("loadedmetadata", seek, { once: true });
    }

    const finish = () => {
        suppressVideoSignal = false;
    };

    if (playback.playing) {
        video.play()
            .catch((error) => console.warn("Synced play blocked.", error))
            .finally(finish);
    } else {
        video.pause();
        finish();
    }
}

// ----- Chat -----
function sendMessage() {
    const message = input?.value.trim();
    if (!message || !sendSocketEvent("chat", { message })) return;

    sendButton?.classList.add("is-loading");
    sendButton?.setAttribute("aria-busy", "true");

    if (input) input.value = "";

    setTimeout(() => {
        sendButton?.classList.remove("is-loading");
        sendButton?.removeAttribute("aria-busy");
    }, 180);
}

function addChatMessage(message, sender, isMine) {
    if (!messagesDiv) return;

    const div = document.createElement("div");
    div.className = `message chat-message ${isMine ? "is-mine" : "is-other"}`;

    if (!isMine && sender?.name) {
        const badge = document.createElement("span");
        badge.className = "message-badge";
        badge.innerText = sender.name;
        div.appendChild(badge);
    }

    const body = document.createElement("span");
    body.className = "message-body";
    body.innerText = message;

    div.appendChild(body);
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ----- UI helpers -----
async function copyRoomCode() {
    try {
        copyRoomBtn?.classList.add("is-loading");
        copyRoomBtn?.setAttribute("aria-busy", "true");
        await navigator.clipboard.writeText(roomId);
        copyRoomBtn?.classList.remove("is-loading");
        copyRoomBtn?.removeAttribute("aria-busy");
        copyRoomBtn.querySelector(".btn-label").innerText = "Copied";
        setTimeout(() => {
            copyRoomBtn.querySelector(".btn-label").innerText = "Copy code";
        }, 1200);
    } catch (error) {
        copyRoomBtn?.classList.remove("is-loading");
        copyRoomBtn?.removeAttribute("aria-busy");
        copyRoomBtn.querySelector(".btn-label").innerText = "Copy failed";
        setTimeout(() => {
            copyRoomBtn.querySelector(".btn-label").innerText = "Copy code";
        }, 1200);
        console.warn("Unable to copy room code", error);
    }
}

function setStatus(text, state) {
    if (!statusDiv) return;

    statusDiv.innerText = text;
    statusDiv.classList.remove("is-connecting", "is-connected", "is-disconnected");
    statusDiv.classList.add(`is-${state}`);
}

function setSystemMessage(message) {
    if (!messagesDiv) return;

    const div = document.createElement("div");
    div.className = "message system";
    div.innerText = message;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function setChatEnabled(isEnabled) {
    if (!sendButton || !input) return;

    sendButton.disabled = !isEnabled;
    input.disabled = !isEnabled;
    input.placeholder = isEnabled ? "Type a message" : "Connecting to chat";
}
