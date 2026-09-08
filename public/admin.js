const currentCustomerTable =
    document.getElementById("currentCustomerTable");

const customerTable =
    document.getElementById("customerTable");

const totalCustomers =
    document.getElementById("totalCustomers");

const preparingCount =
    document.getElementById("preparingCount");

const readyCount =
    document.getElementById("readyCount");

const refreshButton =
    document.getElementById("refreshButton");

const importCustomerFile =
    document.getElementById("importCustomerFile");

const importHistoryButton =
    document.getElementById("importHistoryButton");

const exportHistoryButton =
    document.getElementById("exportHistoryButton");

const logoutButton =
    document.getElementById("logoutButton");


// -----------------------------------------
// LOAD CUSTOMERS
// -----------------------------------------

async function loadCustomers() {

    try {

        const response =
            await fetch("/api/customers");

        if (response.status === 401) {
            window.location.href = "/admin-login.html";
            return;
        }

        const customers =
            await response.json();

        renderCurrentCustomers(customers);
        renderCustomers(customers);

    } catch (error) {

        console.error(error);

        currentCustomerTable.innerHTML = `
            <tr>
                <td colspan="12">
                    Unable to load customer information.
                </td>
            </tr>
        `;

        customerTable.innerHTML = `
            <tr>
                <td colspan="12">
                    Unable to load customer information.
                </td>
            </tr>
        `;
    }
}


function getLatestVisit(customer) {

    if (Array.isArray(customer.visited) && customer.visited.length > 0) {
        return customer.visited[customer.visited.length - 1];
    }

    return {
        date: customer.date || "",
        checkIn: customer.timeIn || "",
        checkOut: customer.timeOut || "",
        purpose: customer.purpose || ""
    };
}


function getVisitRows(customer) {

    if (Array.isArray(customer.visited) && customer.visited.length > 0) {
        return customer.visited.slice().reverse();
    }

    return [{
        date: customer.date || "",
        checkIn: customer.timeIn || "",
        checkOut: customer.timeOut || "",
        purpose: customer.purpose || ""
    }];
}


function getCustomerGroups(customers) {

    const groups = new Map();

    customers.forEach(customer => {

        const key = `${normalizeName(customer.name)}|${normalizeName(customer.company)}`;

        if (!groups.has(key)) {
            groups.set(key, {
                id: customer.id,
                name: customer.name,
                company: customer.company,
                photo: customer.photo || "",
                purpose: customer.purpose || "",
                phone: customer.phone || "",
                email: customer.email || "",
                notes: customer.notes || "",
                status: customer.status || "none",
                inLobby: Boolean(customer.inLobby),
                visited: getVisitRows(customer),
                lastUpdated: customer.lastUpdated || customer.createdAt || "",
            });

            return;
        }

        const group = groups.get(key);

        group.visited = [...group.visited, ...getVisitRows(customer)];
        group.status = customer.inLobby ? (customer.status || "preparing") : group.status;
        group.inLobby = group.inLobby || Boolean(customer.inLobby);
        group.photo = customer.photo || group.photo || "";
        group.purpose = customer.purpose || group.purpose;
        group.phone = customer.phone || group.phone;
        group.email = customer.email || group.email;
        group.notes = customer.notes || group.notes;

        if (customer.lastUpdated || customer.createdAt) {
            const current = new Date(group.lastUpdated || 0).getTime();
            const candidate = new Date(customer.lastUpdated || customer.createdAt || 0).getTime();

            if (candidate > current) {
                group.id = customer.id;
                group.lastUpdated = customer.lastUpdated || customer.createdAt;
            }
        }
    });

    return Array.from(groups.values()).map(group => {
        const orderedVisited = group.visited
            .filter(visit => visit && (visit.date || visit.checkIn || visit.checkOut))
            .slice()
            .reverse();

        return {
            ...group,
            visited: orderedVisited
        };
    });
}


function normalizeName(value) {

    return String(value || "")
        .trim()
        .toLowerCase();
}


function buildCustomerRow(customer) {

    const latestVisit = getLatestVisit(customer);

    let statusHTML = "";

    if (
        customer.inLobby &&
        customer.status === "preparing"
    ) {

        statusHTML = `
            <span class="status preparing">
                PREPARING
            </span>
        `;

    } else if (
        customer.inLobby &&
        customer.status === "ready"
    ) {

        statusHTML = `
            <span class="status ready">
                READY
            </span>
        `;

    } else {

        statusHTML = `
            <span class="status none">
                NOT IN LOBBY
            </span>
        `;
    }


    const row = document.createElement("tr");

    row.innerHTML = `

        <td>
            <strong>
                ${escapeHTML(customer.name)}
            </strong>
        </td>

        <td>
            ${escapeHTML(customer.company)}
        </td>

        <td>
            ${customer.photo ? `
                <img
                    class="customer-photo"
                    src="${customer.photo}"
                    alt="Customer photo"
                >
            ` : "No photo"}
        </td>

        <td>
            ${escapeHTML(latestVisit.date || "")}
        </td>

        <td>
            ${escapeHTML(latestVisit.checkIn || "")}
        </td>

        <td>
            ${escapeHTML(latestVisit.checkOut || "")}
        </td>

        <td class="purpose-cell">
            ${escapeHTML(customer.purpose)}
        </td>

        <td>
            ${escapeHTML(customer.phone || "")}
        </td>

        <td>
            ${escapeHTML(customer.email || "")}
        </td>

        <td class="notes-cell">
            ${escapeHTML(customer.notes || "")}
        </td>

        <td>
            ${statusHTML}
        </td>

        <td class="actions">

            <button
                class="action-button preparing-button"
                onclick="setPreparing('${customer.id}')"
            >
                Preparing
            </button>


            <button
                class="action-button ready-button"
                onclick="setReady('${customer.id}')"
            >
                Ready
            </button>


            <button
                class="action-button photo-button"
                onclick="captureCustomerPhoto('${customer.id}')"
            >
                Take Photo
            </button>

            <button
                class="action-button timeout-button"
                onclick="setTimeOut('${customer.id}')"
            >
                Time Out
            </button>

            <button
                class="action-button remove-button"
                onclick="removeFromLobby('${customer.id}')"
            >
                Remove
            </button>

        </td>
    `;

    return row;
}


// -----------------------------------------
// RENDER CURRENT CUSTOMERS
// -----------------------------------------

function renderCurrentCustomers(customers) {

    currentCustomerTable.innerHTML = "";

    const activeCustomers =
        getCustomerGroups(customers).filter(
            customer =>
                customer.inLobby === true &&
                customer.status !== "none"
        );

    if (activeCustomers.length === 0) {

        currentCustomerTable.innerHTML = `
            <tr>
                <td colspan="12" class="empty-table">
                    No customers are currently signed in.
                </td>
            </tr>
        `;

        return;
    }

    activeCustomers
        .slice()
        .reverse()
        .forEach(customer => {
            currentCustomerTable.appendChild(
                buildCustomerRow(customer)
            );
        });
}


// -----------------------------------------
// RENDER CUSTOMERS
// -----------------------------------------

function renderCustomers(customers) {

    const groupedCustomers = getCustomerGroups(customers);

    customerTable.innerHTML = "";

    totalCustomers.textContent =
        groupedCustomers.length;


    const preparing =
        groupedCustomers.filter(
            customer =>
                customer.inLobby &&
                customer.status === "preparing"
        ).length;


    const ready =
        groupedCustomers.filter(
            customer =>
                customer.inLobby &&
                customer.status === "ready"
        ).length;


    preparingCount.textContent =
        preparing;

    readyCount.textContent =
        ready;


    if (groupedCustomers.length === 0) {

        customerTable.innerHTML = `
            <tr>
                <td colspan="12" class="empty-table">
                    No customers have signed in yet.
                </td>
            </tr>
        `;

        return;
    }

    groupedCustomers
        .slice()
        .reverse()
        .forEach(customer => {
            const visitDates = customer.visited
                .map(visit => escapeHTML(visit.date || "-"))
                .join("<br>");

            const visitCheckIns = customer.visited
                .map(visit => escapeHTML(visit.checkIn || "-"))
                .join("<br>");

            const visitCheckOuts = customer.visited
                .map(visit => escapeHTML(visit.checkOut || "-"))
                .join("<br>");

            const visitPurposes = customer.visited
                .map(visit => escapeHTML(visit.purpose || customer.purpose || "-"))
                .join("<br>");

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>
                    <strong>
                        ${escapeHTML(customer.name)}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(customer.company)}
                </td>

                <td>
                    ${customer.photo ? `
                        <img
                            class="customer-photo"
                            src="${customer.photo}"
                            alt="Customer photo"
                        >
                    ` : "No photo"}
                </td>

                <td>
                    ${visitDates}
                </td>

                <td>
                    ${visitCheckIns}
                </td>

                <td>
                    ${visitCheckOuts}
                </td>

                <td class="purpose-cell">
                    ${visitPurposes}
                </td>

                <td>
                    ${escapeHTML(customer.phone || "")}
                </td>

                <td>
                    ${escapeHTML(customer.email || "")}
                </td>

                <td class="notes-cell">
                    ${escapeHTML(customer.notes || "")}
                </td>

                <td>
                    <span class="status none">
                        VISIT HISTORY
                    </span>
                </td>

                <td class="actions">
                    <button
                        class="action-button preparing-button"
                        onclick="setPreparing('${customer.id}')"
                    >
                        Preparing
                    </button>

                    <button
                        class="action-button ready-button"
                        onclick="setReady('${customer.id}')"
                    >
                        Ready
                    </button>

                    <button
                        class="action-button photo-button"
                        onclick="captureCustomerPhoto('${customer.id}')"
                    >
                        Take Photo
                    </button>

                    <button
                        class="action-button timeout-button"
                        onclick="setTimeOut('${customer.id}')"
                    >
                        Time Out
                    </button>

                    <button
                        class="action-button remove-button"
                        onclick="removeFromLobby('${customer.id}')"
                    >
                        Remove
                    </button>
                </td>
            `;

            customerTable.appendChild(row);
        });
}


// -----------------------------------------
// SET PREPARING
// -----------------------------------------

async function setPreparing(id) {

    await updateCustomer(id, {

        status: "preparing",

        inLobby: true

    });
}


// -----------------------------------------
// SET READY
// -----------------------------------------

async function setReady(id) {

    await updateCustomer(id, {

        status: "ready",

        inLobby: true

    });
}


// -----------------------------------------
// TIME OUT
// -----------------------------------------

async function setTimeOut(id) {

    const timeOut =
        new Date()
            .toTimeString()
            .slice(0, 5);

    await updateCustomer(id, {

        timeOut: timeOut,

        status: "none",

        inLobby: false

    });
}


async function captureCustomerPhoto(id) {

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {

        alert("This browser does not support direct camera capture.");

        return;

    }

    try {

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment"
            },
            audio: false
        });

        const video = document.createElement("video");

        video.srcObject = stream;

        video.playsInline = true;

        video.autoplay = true;

        const cameraOverlay = document.createElement("div");

        cameraOverlay.className = "camera-capture-overlay";

        cameraOverlay.innerHTML = `
            <div class="camera-capture-panel">
                <p class="camera-countdown">Photo in <strong>5</strong></p>
            </div>
        `;

        const cameraPanel = cameraOverlay.querySelector(".camera-capture-panel");

        cameraPanel.prepend(video);

        document.body.appendChild(cameraOverlay);

        await video.play();

        const countdown = cameraOverlay.querySelector(".camera-countdown strong");

        for (let seconds = 5; seconds > 0; seconds -= 1) {

            countdown.textContent = seconds;

            await new Promise(resolve => setTimeout(resolve, 1000));

        }

        const canvas = document.createElement("canvas");

        const sourceWidth = video.videoWidth || 640;

        const sourceHeight = video.videoHeight || 480;

        const maxWidth = 1280;

        const scale = Math.min(1, maxWidth / sourceWidth);

        const width = Math.round(sourceWidth * scale);

        const height = Math.round(sourceHeight * scale);

        canvas.width = width;

        canvas.height = height;

        const context = canvas.getContext("2d");

        context.drawImage(video, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);

        stream.getTracks().forEach(track => track.stop());

        cameraOverlay.remove();

        await updateCustomer(id, {
            photo: dataUrl
        });

    } catch (error) {

        console.error(error);

        document.querySelectorAll(".camera-capture-overlay")
            .forEach(overlay => overlay.remove());

        alert("Camera access was not available. Please allow camera permissions and try again.");

    }
}


// -----------------------------------------
// REMOVE FROM LOBBY
// -----------------------------------------

async function removeFromLobby(id) {

    await setTimeOut(id);
}


// -----------------------------------------
// UPDATE CUSTOMER
// -----------------------------------------

async function updateCustomer(id, data) {

    try {

        const response =
            await fetch(`/api/customers/${id}`, {

                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(data)

            });


        if (!response.ok) {

            const result =
                await response.json();

            throw new Error(
                result.error ||
                "Could not update customer."
            );
        }


        await loadCustomers();


    } catch (error) {

        alert(error.message);

    }
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
// REFRESH BUTTON
// -----------------------------------------

refreshButton.addEventListener(
    "click",
    loadCustomers
);


importHistoryButton.addEventListener(
    "click",
    function () {
        importCustomerFile.click();
    }
);


importCustomerFile.addEventListener(
    "change",
    async function () {
        const file = importCustomerFile.files?.[0];

        if (!file) {
            return;
        }

        try {

            const csvText = await file.text();

            const response = await fetch("/api/customers/import", {
                method: "POST",
                headers: {
                    "Content-Type": "text/csv"
                },
                body: csvText
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Could not import CSV data.");
            }

            importCustomerFile.value = "";
            await loadCustomers();
            alert(`Imported ${result.importedRows || 0} visit rows.`);

        } catch (error) {
            alert(error.message);
        }
    }
);


exportHistoryButton.addEventListener(
    "click",
    function () {
        window.location.href = "/api/customers/export";
    }
);


logoutButton.addEventListener(
    "click",
    async function () {
        await fetch("/api/admin/logout", {
            method: "POST"
        });

        window.location.href = "/admin-login.html";
    }
);


// Automatically refresh admin every 5 seconds
setInterval(loadCustomers, 5000);


// Initial load
loadCustomers();
