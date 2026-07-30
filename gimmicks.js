(function () {
    const content = document.getElementById("dashboardContent");

    if (!window.__SUPABASE_CONFIG || !window.supabase?.createClient) {
        if (content) {
            content.innerHTML = '<p class="status-message error">Supabase is not configured correctly.</p>';
        }
        return;
    }

    const supabase = window.supabase.createClient(
        window.__SUPABASE_CONFIG.url,
        window.__SUPABASE_CONFIG.anonKey
    );

    function formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
        if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
        return date.toLocaleDateString();
    }

    async function signOut() {
        await supabase.auth.signOut();
        window.location.href = "index.html";
    }

    function renderDashboard(messages, drawings) {
        const combined = [];

        messages.forEach((message) => {
            combined.push({
                type: "message",
                id: message.id,
                created_at: message.created_at,
                content: message.content,
            });
        });

        drawings.forEach((drawing) => {
            combined.push({
                type: "drawing",
                id: drawing.id,
                created_at: drawing.created_at,
                image_url: drawing.image_url,
            });
        });

        combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (!content) return;

        content.innerHTML = `
            <div class="dashboard-toolbar">
                <p class="status-message">Welcome back. Your admin tools are ready.</p>
                <button id="logoutButton" class="auth-button" type="button">Log out</button>
            </div>
            <div class="dashboard-list">
                ${combined.length === 0 ? '<p class="status-message">No messages or drawings yet.</p>' : combined.map((item) => {
                    if (item.type === "message") {
                        return `
                            <article class="dashboard-card">
                                <div class="dashboard-meta">Message • ${formatTime(item.created_at)}</div>
                                <p class="dashboard-text">${item.content}</p>
                            </article>
                        `;
                    }

                    return `
                        <article class="dashboard-card">
                            <div class="dashboard-meta">Drawing • ${formatTime(item.created_at)}</div>
                            <img 
                                class="dashboard-image" 
                                src="${item.image_url}" 
                                alt="Anonymous drawing"
                                onerror="this.style.display='none'"
                            >
                        </article>
                    `;
                }).join("")}
            </div>
        `;

        document.getElementById("logoutButton")?.addEventListener("click", signOut);
    }

    async function checkAccess() {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            if (content) {
                content.innerHTML = `
                    <p class="status-message error">You don't have access to this page.</p>
                    <p class="status-message">Redirecting you back to the main page...</p>
                `;
            }

            window.setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
            return;
        }

        const { data: messages, error: messagesError } = await supabase
            .from("messages")
            .select("id, content, created_at, approved")
            .eq("approved", true)
            .order("created_at", { ascending: false });

        const { data: drawings, error: drawingsError } = await supabase
                .from("drawings")
                .select("id, image_url, created_at, approved")
                .eq("approved", true)
                .order("created_at", { ascending: false });

            if (drawingsError) {
                console.error(drawingsError);
                return;
            }

            for (const drawing of drawings) {

                const { data, error } = await supabase.storage
                    .from("drawings")
                    .createSignedUrl(
                        drawing.image_url,
                        3600
                    );

                if (error) {
                    console.error(
                        "Failed creating signed URL:",
                        drawing.image_url,
                        error
                    );
                    continue;
                }

                drawing.image_url = data.signedUrl;
            }

        if (messagesError || drawingsError) {
            if (content) {
                content.innerHTML = '<p class="status-message error">Unable to load gimmicks right now.</p>';
            }
            return;
        }

        renderDashboard(messages || [], drawings || []);

    }

    checkAccess();
})();
