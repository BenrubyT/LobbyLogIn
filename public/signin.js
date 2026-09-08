const form =
    document.getElementById("signinForm");

const successMessage =
    document.getElementById("successMessage");

const nameInput =
    document.getElementById("name");

const companyInput =
    document.getElementById("company");

const dateInput =
    document.getElementById("date");

const phoneInput =
    document.getElementById("phone");

const purposeInput =
    document.getElementById("purpose");

const emailInput =
    document.getElementById("email");

const notesInput =
    document.getElementById("notes");


function formatPhoneNumber(value) {

    const digits = String(value || "")
        .replace(/\D/g, "")
        .slice(0, 10);

    if (digits.length < 4) {
        return digits;
    }

    if (digits.length < 7) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }

    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}


phoneInput.addEventListener(
    "input",
    function () {
        phoneInput.value = formatPhoneNumber(phoneInput.value);
    }
);


// =========================================
// SET TODAY'S DATE
// =========================================

dateInput.value =
    new Date()
        .toISOString()
        .split("T")[0];

// =========================================
// EXISTING CUSTOMER MESSAGE
// =========================================

const validationMessage =
    document.createElement("div");

validationMessage.id =
    "validationMessage";

validationMessage.className =
    "form-message error-message";

validationMessage.style.display =
    "none";

validationMessage.textContent =
    "Name, company, and purpose are required.";

form.insertBefore(
    validationMessage,
    form.firstChild
);


const existingCustomerMessage =
    document.createElement("div");

existingCustomerMessage.id =
    "existingCustomerMessage";

existingCustomerMessage.style.display =
    "none";

existingCustomerMessage.style.marginTop =
    "10px";

existingCustomerMessage.style.marginBottom =
    "10px";

existingCustomerMessage.style.padding =
    "12px";

existingCustomerMessage.style.borderRadius =
    "7px";

existingCustomerMessage.style.background =
    "#dcfce7";

existingCustomerMessage.style.color =
    "#166534";

existingCustomerMessage.style.fontWeight =
    "bold";

existingCustomerMessage.textContent =
    "Existing customer found. Your previous information has been loaded.";

companyInput.parentNode.insertBefore(
    existingCustomerMessage,
    companyInput.nextSibling
);


// =========================================
// SEARCH TIMER
// =========================================

let searchTimer = null;


// =========================================
// SEARCH FOR EXISTING CUSTOMER
// =========================================

async function checkForExistingCustomer() {

    const name =
        nameInput.value.trim();

    const company =
        companyInput.value.trim();


    /*
        Don't search until both fields
        have something in them.
    */

    if (!name || !company) {

        existingCustomerMessage.style.display =
            "none";

        return;
    }


    try {

        const response =
            await fetch(
                `/api/customers/find?name=${encodeURIComponent(name)}&company=${encodeURIComponent(company)}`
            );


        const result =
            await response.json();


        if (!result.found) {

            existingCustomerMessage.style.display =
                "none";

            return;
        }


        const customer =
            result.customer;


        /*
            Load the customer's previous
            information into the form.
        */

        nameInput.value =
            customer.name;

        companyInput.value =
            customer.company;


        /*
            We intentionally use today's date
            for a new visit instead of the
            customer's old date.
        */

        dateInput.value =
            new Date()
                .toISOString()
                .split("T")[0];

        phoneInput.value =
            formatPhoneNumber(customer.phone || "");


        emailInput.value =
            customer.email || "";


        notesInput.value =
            customer.notes || "";


        existingCustomerMessage.style.display =
            "block";


    } catch (error) {

        console.error(
            "Customer lookup failed:",
            error
        );

    }

}


// =========================================
// WATCH NAME
// =========================================

nameInput.addEventListener(
    "input",
    function () {

        clearTimeout(searchTimer);

        searchTimer =
            setTimeout(
                checkForExistingCustomer,
                400
            );

    }
);


// =========================================
// WATCH COMPANY
// =========================================

companyInput.addEventListener(
    "input",
    function () {

        clearTimeout(searchTimer);

        searchTimer =
            setTimeout(
                checkForExistingCustomer,
                400
            );

    }
);


// Also check when leaving the company field
companyInput.addEventListener(
    "blur",
    checkForExistingCustomer
);


// =========================================
// SUBMIT
// =========================================

function showValidationMessage(message) {

    validationMessage.textContent =
        message;

    validationMessage.style.display =
        "block";

}


function clearValidationMessage() {

    validationMessage.textContent = "";
    validationMessage.style.display = "none";

}


form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const name = nameInput.value.trim();
        const company = companyInput.value.trim();
        const purpose = purposeInput.value.trim();

        if (!name || !purpose || !phoneInput.value.trim()) {

            showValidationMessage(
                "Name, purpose, and phone number are required."
            );

            return;
        }

        clearValidationMessage();


        const submitButton =
            form.querySelector(
                "button[type='submit']"
            );


        submitButton.disabled =
            true;

        submitButton.textContent =
            "Submitting...";


        const customer = {

            name: name,

            company: company,

            purpose: purpose,

            phone: phoneInput.value,

            email: emailInput.value,

            notes: notesInput.value

        };


        try {

            const response =
                await fetch(
                    "/api/customers",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(customer)

                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.error ||
                    "Something went wrong."
                );

            }


            // Hide form
            form.hidden = true;


            // Hide existing customer notice
            existingCustomerMessage.style.display =
                "none";


            // Show thank-you message
            successMessage.hidden =
                false;


            /*
                Return to a completely blank
                sign-in sheet after 2.5 seconds.
            */

            setTimeout(
                () => {

                    window.location.reload();

                },
                2500
            );


        } catch (error) {

            showValidationMessage(
                error.message ||
                "There was a problem submitting your information."
            );


            submitButton.disabled =
                false;

            submitButton.textContent =
                "Sign In";

        }

    }
);