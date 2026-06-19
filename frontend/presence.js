const NAME_COLORS = [
    "aki",
    "green",
    "white",
    "blue",
    "gold",
    "red",
    "silver",
    "teal",
    "violet",
];

const NAME_ANIMALS = [
    "chan",
    "panda",
    "cat",
    "fox",
    "otter",
    "owl",
    "koala",
    "lynx",
    "seal",
];

function generateDisplayName() {
    const color = NAME_COLORS[Math.floor(Math.random() * NAME_COLORS.length)];
    const animal = NAME_ANIMALS[Math.floor(Math.random() * NAME_ANIMALS.length)];
    return `${color} ${animal}`;
}

function normalizeDisplayName(name) {
    return name.trim().replace(/\s+/g, " ").slice(0, 32);
}

function renderMemberList(members, currentUserId, listElement, countElement) {
    if (!listElement || !countElement) return;

    countElement.innerText = `${members.length} ${members.length === 1 ? "person" : "people"}`;
    listElement.replaceChildren();

    members.forEach((member) => {
        const item = document.createElement("li");
        item.className = "member-pill";
        if (member.id === currentUserId) item.classList.add("is-current");

        const avatar = document.createElement("img");
        avatar.className = "member-avatar";
        avatar.src = "img/guest.svg";
        avatar.alt = "";
        avatar.width = 28;
        avatar.height = 28;

        const name = document.createElement("span");
        name.className = "member-name";
        name.innerText = member.name;

        item.appendChild(avatar);
        item.appendChild(name);

        if (member.id === currentUserId) {
            const you = document.createElement("span");
            you.className = "member-you";
            you.innerText = "You";
            item.appendChild(you);
        }

        listElement.appendChild(item);
    });
}
