const SUPABASE_URL = "https://mgmoesyjjxnooldfnlqv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zYRcsxDeJVEaMLtM-cXh2Q_x4YDRZHL";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

const DISCORD_ID = "333695842760523776";
const BIRTH_DATE = new Date("2006-05-08");

function calculateAge() {
    const today = new Date();

    let age = today.getFullYear() - BIRTH_DATE.getFullYear();
    const monthDiff = today.getMonth() - BIRTH_DATE.getMonth();

    if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < BIRTH_DATE.getDate())
    ) {
        age--;
    }

    const ageElement = document.getElementById("age");

    if (ageElement) {
        ageElement.textContent = age;
    }
}

async function fetchProfilePic() {
    const response = await fetch(
        `https://lanyard.rest/v1/users/${DISCORD_ID}`
    );

    const { data } = await response.json();

    const profilePic = document.getElementById("profile-pic");

    const isAnimated = data.discord_user.avatar.startsWith("a_");
    const extension = isAnimated ? "gif" : "png";

    profilePic.src =
        `https://cdn.discordapp.com/avatars/${DISCORD_ID}/${data.discord_user.avatar}.${extension}?size=256`;
}

// -------------------------
// Messages
// -------------------------

async function submitMessage(event) {
    event.preventDefault();

    const messageInput = document.getElementById("messageInput");
    const status = document.getElementById("messageStatus");
    const content = messageInput.value.trim();

    if (!content) {
        status.textContent = "Please write a message first.";
        status.classList.add("error");
        return;
    }

    status.textContent = "Sending...";
    status.classList.remove("error");

    const { error } = await supabaseClient
        .from("messages")
        .insert({ content });

    if (error) {
        status.textContent =
            "Something went wrong while sending your message.";

        status.classList.add("error");
        return;
    }

    messageInput.value = "";
    status.textContent = "Message sent anonymously.";
}

function initMessageForm() {
    const form = document.getElementById("messageForm");

    if (!form) return;

    form.addEventListener(
        "submit",
        submitMessage
    );
}

// -------------------------
// Drawing
// -------------------------

const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");

function clearCanvas() {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

clearCanvas();

let drawing = false;

ctx.strokeStyle = "#000000";
document
    .querySelector('.color-btn[data-color="#000000"]')
    ?.classList.add("active");
ctx.lineWidth = 3;
ctx.lineCap = "round";
ctx.lineJoin = "round";

function getCanvasPosition(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();

    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

function getMousePos(e) {
    return getCanvasPosition(e.clientX, e.clientY);
}

function getTouchPos(e) {
    const touch = e.touches[0];

    return getCanvasPosition(
        touch.clientX,
        touch.clientY
    );
}

// Mouse drawing

canvas.addEventListener("mousedown", (e) => {
    drawing = true;

    const pos = getMousePos(e);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
});

canvas.addEventListener("mousemove", (e) => {
    if (!drawing) return;

    const pos = getMousePos(e);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
});

canvas.addEventListener("mouseup", () => {
    drawing = false;
});

canvas.addEventListener("mouseleave", () => {
    drawing = false;
});

// Touch drawing

canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();

    drawing = true;

    const pos = getTouchPos(e);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
});

canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();

    if (!drawing) return;

    const pos = getTouchPos(e);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
});

canvas.addEventListener("touchend", () => {
    drawing = false;
});

// Clear button

const clearButton = document.getElementById("clearDrawing");

if (clearButton) {
    clearButton.addEventListener(
        "click",
        clearCanvas
    );
}

// Colors

const colorButtons = document.querySelectorAll(".color-btn");

function selectColor(button, color) {
    colorButtons.forEach((btn) => {
        btn.classList.remove("active");
    });

    button.classList.add("active");
    ctx.strokeStyle = color;
}

colorButtons.forEach((button) => {
    button.addEventListener("click", () => {
        selectColor(button, button.dataset.color);
    });
});

// Brush size

const brushSize = document.getElementById("brushSize");

if (brushSize) {
    brushSize.addEventListener("input", () => {
        ctx.lineWidth = brushSize.value;
    });
}

// -------------------------
// Upload Drawing
// -------------------------

async function submitDrawing() {
    const button = document.getElementById("submitDrawing");

    button.disabled = true;
    button.textContent = "Uploading...";

    try {
        const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, "image/png");
        });

        if (!blob) {
            throw new Error("Could not create image.");
        }

        const fileName = crypto.randomUUID() + ".png";

        const uploadResult = await supabaseClient.storage
            .from("drawings")
            .upload(fileName, blob, {
                contentType: "image/png"
            });

        if (uploadResult.error) {
            throw uploadResult.error;
        }

        const { data: signedUrlData, error: signedError } =
            await supabaseClient.storage
                .from("drawings")
                .createSignedUrl(
                    fileName,
                    60 * 60
                );


        if (signedError) {
            throw signedError;
        }


        const insertResult =
            await supabaseClient
                .from("drawings")
                .insert({
                    image_url: fileName
                });

        if (insertResult.error) {
            throw insertResult.error;
        }

        button.textContent = "Drawing Sent!";

        setTimeout(() => {
            button.textContent = "Submit Drawing";
            button.disabled = false;
        }, 2000);

        clearCanvas();

    } catch (error) {
        console.error("DRAWING UPLOAD ERROR:", error);

        button.textContent = "Upload Failed";

        setTimeout(() => {
            button.textContent = "Submit Drawing";
            button.disabled = false;
        }, 2000);
    }
}

document
    .getElementById("submitDrawing")
    ?.addEventListener(
        "click",
        submitDrawing
    );

async function checkAdminLogin() {
    const header = document.getElementById("adminHeader");

    if (!header) return;

    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
        header.style.display = "block";
    }
}

checkAdminLogin();
calculateAge();
fetchProfilePic();
initMessageForm();