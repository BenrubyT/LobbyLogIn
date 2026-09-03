const lobbyList =
    document.getElementById("lobbyList");


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

loadLobby();


// Check for changes every 3 seconds
setInterval(loadLobby, 3000);


// Update clock every second
updateClock();

setInterval(updateClock, 1000);
