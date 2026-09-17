const lobbyList =
    document.getElementById("lobbyList");

const lobbyTickerTrack =
    document.getElementById("lobbyTickerTrack");


// -----------------------------------------
// LOAD LOBBY
// -----------------------------------------

async function loadLobby() {

    try {

        const response =
            await fetch("/api/lobby");

        const customers =
            await response.json();

        renderLobby(customers);

    } catch (error) {

        console.error(
            "Could not load lobby:",
            error
        );

    }
}


// -----------------------------------------
// DAILY TICKER
// -----------------------------------------

function renderTicker() {

    const tickerItems = [
        "Transpere is a national ITAD (Information Technology Asset Disposition) company with over 30 years' experience in managing IT related assets for corporations, healthcare, government and education.", "Founded in 2016 with 25+ years’ experience in the ITAD industry, Transpere has established strategic partnerships with leading technology providers. We are trusted by thousands of companies, from small and medium-size businesses to over 80% of all Fortune 1000 companies in the United States.",
        "Proper retirement of IT assets can be very complicated due to factors ranging from environmental sustainability to data security. That's where Transpere comes in. We are helping companies properly retire their technology assets in a way that doesn't compromise their data security or harm the environment while recovering value from hardware."
    ];

    const itemMarkup = tickerItems
        .map(item => `
            <span class="lobby-ticker-item">
                ${escapeHTML(item)}
            </span>
        `)
        .join("");

    lobbyTickerTrack.innerHTML = itemMarkup + itemMarkup;

    window.requestAnimationFrame(() => {
        const tickerSpeed = 50;
        const loopDistance = lobbyTickerTrack.scrollWidth / 2;
        const loopDuration = Math.max(28, loopDistance / tickerSpeed);

        lobbyTickerTrack.style.setProperty(
            "--ticker-duration",
            `${loopDuration}s`
        );

        lobbyTickerTrack.style.setProperty(
            "--ticker-loop-distance",
            `${loopDistance}px`
        );

        lobbyTickerTrack.classList.add("is-ready");
    });
}


// -----------------------------------------
// RENDER LOBBY
// -----------------------------------------

function renderLobby(customers) {

    lobbyList.innerHTML = "";


    if (customers.length === 0) {

        lobbyList.innerHTML = `

            <div class="lobby-empty">

                <h2>Welcome</h2>

                <p>
                    Please sign in at the front desk.
                </p>

            </div>

        `;

        return;
    }


    // Preparing customers first
    const sortedCustomers =
        customers.sort((a, b) => {

            if (
                a.status === "preparing" &&
                b.status === "ready"
            ) {
                return -1;
            }

            if (
                a.status === "ready" &&
                b.status === "preparing"
            ) {
                return 1;
            }

            return 0;

        });


    sortedCustomers.forEach(customer => {

        const card =
            document.createElement("div");


        card.className =
            "lobby-card " +
            customer.status;


        const statusText =
            customer.status === "ready"
                ? "READY"
                : "PREPARING";


        card.innerHTML = `

            <div class="lobby-name">
                ${escapeHTML(customer.name)}
            </div>

            <div class="lobby-company">
                ${escapeHTML(customer.company)}
            </div>

            <div class="lobby-status">
                ${statusText}
            </div>

        `;


        lobbyList.appendChild(card);

    });
}


// -----------------------------------------
// CLOCK
// -----------------------------------------

function updateClock() {

    const now = new Date();


    const time =
        now.toLocaleTimeString([], {

            hour: "numeric",

            minute: "2-digit"

        });


    document.getElementById(
        "currentTime"
    ).textContent = time;
}


// -----------------------------------------
// ESCAPE HTML
// -----------------------------------------

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// -----------------------------------------
// AUTO UPDATE
// -----------------------------------------

renderTicker();
loadLobby();


// Check for changes every 5 minutes
setInterval(loadLobby, 300000);


// Update clock every second
updateClock();

setInterval(updateClock, 1000);
