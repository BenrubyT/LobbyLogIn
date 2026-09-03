const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 49155;

const RUNTIME_DIR = process.pkg
    ? path.dirname(process.execPath)
    : __dirname;

const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_FILE = path.join(RUNTIME_DIR, "customers.txt");
const IMAGES_DIR = path.join(RUNTIME_DIR, "public", "images");
const ADMIN_USERNAME = "FrontOffice";
const ADMIN_PASSWORD = "transpere";
const adminSessions = new Set();

app.use(express.json({ limit: "10mb" }));


function getCookieValue(req, name) {

    const cookies = String(req.headers.cookie || "")
        .split(";")
        .map(cookie => cookie.trim());

    const cookie = cookies.find(item => item.startsWith(`${name}=`));

    return cookie
        ? decodeURIComponent(cookie.slice(name.length + 1))
        : "";
}


function requireAdmin(req, res, next) {

    const sessionToken = getCookieValue(req, "adminSession");

    if (!sessionToken || !adminSessions.has(sessionToken)) {

        if (req.path === "/admin.html") {
            return res.redirect("/admin-login.html");
        }

        return res.status(401).json({
            error: "Admin login required."
        });
    }

    next();
}


app.post("/api/admin/login", (req, res) => {

    const username = String(req.body.username || "");
    const password = String(req.body.password || "");

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {

        return res.status(401).json({
            error: "Invalid username or password."
        });
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");

    adminSessions.add(sessionToken);

    res.setHeader(
        "Set-Cookie",
        `adminSession=${encodeURIComponent(sessionToken)}; HttpOnly; SameSite=Strict; Path=/`
    );

    res.json({
        success: true
    });
});


app.post("/api/admin/logout", requireAdmin, (req, res) => {

    adminSessions.delete(getCookieValue(req, "adminSession"));

    res.setHeader(
        "Set-Cookie",
        "adminSession=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"
    );

    res.json({
        success: true
    });
});


app.get("/admin.html", requireAdmin, (req, res) => {

    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.use("/images", express.static(IMAGES_DIR));
app.use(express.static(PUBLIC_DIR));


// =========================================
// DATABASE FUNCTIONS
// =========================================

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "", "utf8");
}

if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}


function readCustomers() {

    try {

        const data = fs.readFileSync(
            DATA_FILE,
            "utf8"
        );

        if (!data.trim()) {
            return [];
        }

        return JSON.parse(data);

    } catch (error) {

        console.error(
            "Could not read customers.txt:",
            error
        );

        return [];
    }
}


function writeCustomers(customers) {

    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(customers, null, 2),
        "utf8"
    );
}


// =========================================
// NORMALIZE NAME / COMPANY
// =========================================

function normalize(value) {

    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}


function formatPhoneNumber(value) {

    const digits = String(value || "")
        .replace(/\D/g, "")
        .slice(0, 10);

    if (digits.length === 0) {
        return "";
    }

    if (digits.length < 4) {
        return digits;
    }

    if (digits.length < 7) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }

    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}


function getCurrentDate() {

    const now = new Date();

    return [
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
        String(now.getFullYear()).slice(-2)
    ].join("/");
}


function formatVisitDate(value) {

    const date = String(value || "").trim();
    const dashedDate = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dashedDate) {
        return `${dashedDate[2]}/${dashedDate[3]}/${dashedDate[1].slice(-2)}`;
    }

    return date;
}


function getCurrentTime() {

    return new Date()
        .toTimeString()
        .slice(0, 5);
}


function getCustomerImageFilename(customer) {

    const name = String(customer.name || "")
        .replace(/[^a-z0-9]/gi, "");

    const company = String(customer.company || "")
        .replace(/[^a-z0-9]/gi, "");

    return `${name}${company}.jpg`;
}


function migrateCustomerPhotos() {

    const customers = readCustomers();
    let changed = false;

    customers.forEach(customer => {

        const photoMatch = String(customer.photo || "").match(
            /^data:image\/jpeg;base64,(.+)$/
        );

        if (!photoMatch) {
            return;
        }

        const filename = getCustomerImageFilename(customer);
        const imagePath = path.join(IMAGES_DIR, filename);

        fs.writeFileSync(
            imagePath,
            Buffer.from(photoMatch[1], "base64")
        );

        customer.photo = `/images/${filename}`;
        changed = true;
    });

    if (changed) {
        writeCustomers(customers);
    }
}


function migrateVisitPurposes() {

    const customers = readCustomers();
    let changed = false;

    customers.forEach(customer => {

        if (!Array.isArray(customer.visited)) {
            return;
        }

        customer.visited = customer.visited.map(visit => {

            if (visit.purpose !== undefined) {
                return visit;
            }

            changed = true;

            return {
                date: visit.date || "",
                checkIn: visit.checkIn || "",
                checkOut: visit.checkOut || "",
                purpose: customer.purpose || ""
            };
        });
    });

    if (changed) {
        writeCustomers(customers);
    }
}


function migrateVisitDates() {

    const customers = readCustomers();
    let changed = false;

    customers.forEach(customer => {

        if (!Array.isArray(customer.visited)) {
            return;
        }

        customer.visited = customer.visited.map(visit => {

            const formattedDate = formatVisitDate(visit.date);

            if (formattedDate === visit.date) {
                return visit;
            }

            changed = true;

            return {
                ...visit,
                date: formattedDate
            };
        });
    });

    if (changed) {
        writeCustomers(customers);
    }
}


function buildVisit(dateValue, timeInValue, timeOutValue, purposeValue) {

    const date = String(dateValue || "").trim();
    const checkIn = String(timeInValue || "").trim();
    const checkOut = String(timeOutValue || "").trim();
    const purpose = String(purposeValue || "").trim();

    if (!date && !checkIn && !checkOut) {
        return null;
    }

    return {
        date: formatVisitDate(date || getCurrentDate()),
        checkIn: checkIn || "",
        checkOut: checkOut || "",
        purpose: purpose || ""
    };
}


function getVisitHistory(customer) {

    if (Array.isArray(customer.visited)) {
        return customer.visited.map(visit => ({
            date: String(visit.date || ""),
            checkIn: String(visit.checkIn || ""),
            checkOut: String(visit.checkOut || ""),
            purpose: String(
                visit.purpose !== undefined
                    ? visit.purpose
                    : customer.purpose || ""
            )
        }));
    }

    const legacyVisit = {
        date: customer.date || "",
        checkIn: customer.timeIn || "",
        checkOut: customer.timeOut || "",
        purpose: customer.purpose || ""
    };

    if (!legacyVisit.date && !legacyVisit.checkIn && !legacyVisit.checkOut) {
        return [];
    }

    return [legacyVisit];
}


// =========================================
// FIND EXISTING CUSTOMER
// =========================================

app.get("/api/customers/find", (req, res) => {

    const name = normalize(req.query.name);
    const company = normalize(req.query.company);

    if (!name || !company) {

        return res.json({
            found: false
        });
    }


    const customers = readCustomers();


    const customer = customers.find(item => {

        return (
            normalize(item.name) === name &&
            normalize(item.company) === company
        );

    });


    if (!customer) {

        return res.json({
            found: false
        });
    }


    res.json({
        found: true,
        customer: customer
    });

});


// =========================================
// GET ALL CUSTOMERS
// =========================================

app.get("/api/customers", requireAdmin, (req, res) => {

    const customers = readCustomers();

    res.json(customers);

});


// =========================================
// ADD OR UPDATE CUSTOMER
// =========================================

app.post("/api/customers", (req, res) => {

    const {
        name,
        company,
        date,
        timeIn,
        timeOut,
        purpose,
        phone,
        email,
        notes
    } = req.body;


    if (!name || !company || !purpose) {

        return res.status(400).json({
            error:
                "Name, company, and purpose are required."
        });

    }


    const customers = readCustomers();


    /*
        IMPORTANT:

        We search again on the server.

        This means even if the browser somehow fails
        to find the previous customer, we still won't
        create a duplicate.
    */

    const existingIndex = customers.findIndex(customer => {

        return (
            normalize(customer.name) === normalize(name) &&
            normalize(customer.company) === normalize(company)
        );

    });


    // =====================================
    // EXISTING CUSTOMER
    // =====================================

    if (existingIndex !== -1) {

        const existingCustomer =
            customers[existingIndex];


        /*
            Update the existing customer's information.

            We keep the same ID so this remains
            the same customer record.
        */

        existingCustomer.name =
            name.trim();

        existingCustomer.company =
            company.trim();

        const newVisit = buildVisit(
            getCurrentDate(),
            getCurrentTime(),
            "",
            purpose
        );
        const visits = getVisitHistory(existingCustomer);

        if (newVisit) {
            visits.push(newVisit);
            existingCustomer.visited = visits;
        }

        delete existingCustomer.date;
        delete existingCustomer.timeIn;
        delete existingCustomer.timeOut;
        delete existingCustomer.checkInDateTime;
        delete existingCustomer.checkOutDateTime;

        existingCustomer.purpose =
            purpose.trim();

        existingCustomer.phone =
            formatPhoneNumber(phone);

        existingCustomer.email =
            email ? email.trim() : "";

        existingCustomer.notes =
            notes ? notes.trim() : "";


        /*
            A returning customer is immediately
            added back to the signed-in list
            and keeps their full visit history.
        */

        existingCustomer.status = "preparing";

        existingCustomer.inLobby = true;


        existingCustomer.lastUpdated =
            new Date().toISOString();


        writeCustomers(customers);


        return res.json({

            success: true,

            existingCustomer: true,

            customer: existingCustomer

        });

    }


    // =====================================
    // NEW CUSTOMER
    // =====================================

    const customer = {

        id: Date.now().toString(),

        name: name.trim(),

        company: company.trim(),

        visited: [
            buildVisit(
                getCurrentDate(),
                getCurrentTime(),
                "",
                purpose
            )
        ],

        purpose: purpose.trim(),

        phone: phone
            ? formatPhoneNumber(phone)
            : "",

        email: email
            ? email.trim()
            : "",

        notes: notes
            ? notes.trim()
            : "",

        status: "preparing",

        inLobby: true,

        createdAt:
            new Date().toISOString(),

    };


    customers.push(customer);

    writeCustomers(customers);


    res.json({

        success: true,

        existingCustomer: false,

        customer: customer

    });

});


// =========================================
// UPDATE CUSTOMER
// =========================================

app.put("/api/customers/:id", requireAdmin, (req, res) => {

    const customers = readCustomers();


    const index =
        customers.findIndex(
            customer =>
                customer.id === req.params.id
        );


    if (index === -1) {

        return res.status(404).json({
            error: "Customer not found."
        });

    }


    const customer =
        customers[index];


    if (req.body.status !== undefined) {
        customer.status =
            req.body.status;
    }


    if (req.body.inLobby !== undefined) {
        customer.inLobby =
            req.body.inLobby;
    }


    if (req.body.name !== undefined) {
        customer.name =
            req.body.name;
    }


    if (req.body.company !== undefined) {
        customer.company =
            req.body.company;
    }


    if (req.body.timeOut !== undefined) {

        const visits = getVisitHistory(customer);
        const latestVisit = visits[visits.length - 1] || {};

        const nextVisit = {
            date: String(latestVisit.date || getCurrentDate()).trim(),
            checkIn: String(latestVisit.checkIn || "").trim(),
            checkOut: String(req.body.timeOut || "").trim(),
            purpose: String(latestVisit.purpose || customer.purpose || "").trim()
        };

        if (visits.length === 0) {
            visits.push(nextVisit);
        } else {
            visits[visits.length - 1] = nextVisit;
        }

        customer.visited = visits;
        delete customer.date;
        delete customer.timeIn;
        delete customer.timeOut;
    }


    if (req.body.purpose !== undefined) {
        customer.purpose =
            req.body.purpose;
    }


    if (req.body.phone !== undefined) {
        customer.phone =
            formatPhoneNumber(req.body.phone);
    }


    if (req.body.email !== undefined) {
        customer.email =
            req.body.email;
    }


    if (req.body.notes !== undefined) {
        customer.notes =
            req.body.notes;
    }


    if (req.body.photo !== undefined) {

        const photoMatch = String(req.body.photo).match(
            /^data:image\/jpeg;base64,(.+)$/
        );

        if (!photoMatch) {

            return res.status(400).json({
                error: "Photo must be a JPEG camera image."
            });

        }

        const filename = getCustomerImageFilename(customer);
        const imagePath = path.join(IMAGES_DIR, filename);

        fs.writeFileSync(
            imagePath,
            Buffer.from(photoMatch[1], "base64")
        );

        customer.photo = `/images/${filename}`;
    }

    /** 
    if (req.body.date !== undefined) {
        customer.date =
            req.body.date;
    }
            */


    customer.lastUpdated =
        new Date().toISOString();


    writeCustomers(customers);


    res.json({

        success: true,

        customer: customer

    });

});


// =========================================
// DELETE CUSTOMER
// =========================================

app.delete("/api/customers/:id", requireAdmin, (req, res) => {

    let customers = readCustomers();


    const originalLength =
        customers.length;


    customers =
        customers.filter(
            customer =>
                customer.id !== req.params.id
        );


    if (customers.length === originalLength) {

        return res.status(404).json({
            error: "Customer not found."
        });

    }


    writeCustomers(customers);


    res.json({
        success: true
    });

});


// =========================================
// LOBBY CUSTOMERS
// =========================================

app.get("/api/lobby", (req, res) => {

    const customers = readCustomers();


    const lobbyCustomers =
        customers.filter(customer =>

            customer.inLobby === true &&
            customer.status !== "none"

        );


    res.json(lobbyCustomers);

});


// =========================================
// START SERVER
// =========================================

migrateCustomerPhotos();
migrateVisitPurposes();
migrateVisitDates();

app.listen(PORT, () => {

    console.log("");
    console.log("=================================");
    console.log(" Lobby Sign-In System Running");
    console.log("=================================");
    console.log("");

    console.log(
        `Sign-In: http://localhost:${PORT}/signin.html`
    );

    console.log(
        `Admin:   http://localhost:${PORT}/admin.html`
    );

    console.log(
        `Lobby:   http://localhost:${PORT}/lobby.html`
    );

    console.log("");

});


// =========================================
// EXPORT CUSTOMER HISTORY
// =========================================

function escapeCSV(value) {

    return `"${String(value || "")
        .replace(/"/g, '""')}"`;
}


app.get("/api/customers/export", requireAdmin, (req, res) => {

    const customers = readCustomers();
    const headers = [
        "Name",
        "Company",
        "Date",
        "Time In",
        "Time Out",
        "Purpose",
        "Phone",
        "Email",
        "Notes",
        "Status"
    ];

    const rows = [headers.map(escapeCSV).join(",")];

    customers.forEach(customer => {

        getVisitHistory(customer).forEach(visit => {

            rows.push([
                customer.name,
                customer.company,
                visit.date,
                visit.checkIn,
                visit.checkOut,
                visit.purpose,
                customer.phone,
                customer.email,
                customer.notes,
                customer.status
            ].map(escapeCSV).join(","));
        });
    });

    res
        .type("text/csv")
        .set(
            "Content-Disposition",
            "attachment; filename=customer-history.csv"
        )
        .send(`\ufeff${rows.join("\r\n")}\r\n`);
});