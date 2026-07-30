(function () {
    const statusMessage = document.getElementById("statusMessage");
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const submitButton = loginForm?.querySelector("button");

    function setStatus(message, isError = false) {
        if (!statusMessage) return;
        statusMessage.textContent = message;
        statusMessage.className = `status-message${isError ? " error" : ""}`;
    }

    function setLoading(isLoading) {
        if (!submitButton) return;
        submitButton.disabled = isLoading;
        submitButton.textContent = isLoading ? "Signing in..." : "Sign in";
    }

    const config = window.__SUPABASE_CONFIG || {};
    const supabaseUrl = (config.url || "").trim();
    const supabaseAnonKey = (config.anonKey || "").trim();

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("YOUR_PROJECT") || supabaseAnonKey.includes("YOUR_")) {
        setStatus("Set your Supabase URL and anon key in the page before signing in.", true);
        return;
    }

    if (!window.supabase?.createClient) {
        setStatus("Supabase failed to load. Please refresh the page.", true);
        return;
    }

    const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

    loginForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        setLoading(true);
        setStatus("Signing you in...");

        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailInput.value.trim(),
            password: passwordInput.value,
        });

        if (error) {
            setStatus(error.message, true);
            setLoading(false);
            return;
        }

        if (data?.user) {
            setStatus("Signed in successfully.");
            window.location.href = "gimmicks.html";
        }
    });
})();
