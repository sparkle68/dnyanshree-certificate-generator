
const form = document.getElementById("certificateForm");
const downloadBtn = document.getElementById("downloadBtn");
const historyBody = document.getElementById("certificateHistory");
const searchInput = document.getElementById("searchCertificate");

let allCertificates = [];
let currentCertificate = null;


// Safe HTML
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}


// Format date as DD-MM-YYYY
function formatDate(dateValue) {
    if (!dateValue) return "";

    const date = new Date(dateValue + "T00:00:00");

    if (isNaN(date.getTime())) return dateValue;

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}


// Generate QR Code
function generateCertificateQR(certificate) {

    const qrContainer =
        document.getElementById("certificateQRCode");

    if (!qrContainer) return;

    qrContainer.innerHTML = "";

    if (!certificate || !certificate.certificateId) {
        qrContainer.textContent = "QR unavailable";
        return;
    }

    if (typeof QRCode === "undefined") {
        qrContainer.textContent = "QR Library Not Loaded";
        console.error("QRCode library not found.");
        return;
    }

    const verificationURL =
        window.location.origin +
        "/verify.html?certificateId=" +
        encodeURIComponent(certificate.certificateId);

    new QRCode(qrContainer, {
        text: verificationURL,
        width: 100,
        height: 100,
        colorDark: "#102448",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}


// Display certificate
function showCertificate(certificate) {

    currentCertificate = certificate;

    document.getElementById("previewName").textContent =
        certificate.studentName || "Student Name";

    document.getElementById("previewAchievement").textContent =
        certificate.achievementDescription ||
        certificate.courseName ||
        "Achievement Description";

    document.getElementById("previewCourse").textContent =
        certificate.courseName || "Event / Activity";

    document.getElementById("previewDepartment").textContent =
        certificate.department || "Not Specified";

    document.getElementById("previewDate").textContent =
        formatDate(certificate.certificateDate);

    document.getElementById("certificateId").textContent =
        "Certificate ID: " + (certificate.certificateId || "Not Available");

    generateCertificateQR(certificate);

    if (downloadBtn) {
        downloadBtn.disabled = false;
    }

    document.getElementById("certificate").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// Generate and save certificate
if (form) {

    form.addEventListener("submit", async function(event) {

        event.preventDefault();

        const name =
            document.getElementById("studentName").value.trim();

        const achievement =
            document.getElementById("achievementDescription").value.trim();

        const course =
            document.getElementById("courseName").value.trim();

        const department =
            document.getElementById("department").value.trim();

        const date =
            document.getElementById("certificateDate").value;

        if (!name || !achievement || !course || !department || !date) {
            alert("Please fill all certificate details.");
            return;
        }

        const submitButton =
            form.querySelector('button[type="submit"]');

        submitButton.disabled = true;

        try {

            const response = await fetch("/api/certificates", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    studentName: name,
                    achievementDescription: achievement,
                    courseName: course,
                    department: department,
                    certificateDate: date
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Certificate save failed."
                );
            }

            showCertificate(result.certificate);

            alert("Certificate Generated Successfully!");

            form.reset();

            await loadCertificates();

        } catch (error) {

            console.error("Certificate Error:", error);
            alert("Error: " + error.message);

        } finally {

            submitButton.disabled = false;
        }
    });
}


// Print certificate
if (downloadBtn) {

    downloadBtn.addEventListener("click", function() {

        if (!currentCertificate) {
            alert("Please generate or select a certificate first.");
            return;
        }

        window.print();
    });
}


// Load certificate history
async function loadCertificates() {

    try {

        const response = await fetch("/api/certificates");
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error("Unable to load certificates.");
        }

        allCertificates = result.certificates || [];

        const totalElement =
            document.getElementById("totalCertificates");

        if (totalElement) {
            totalElement.textContent = allCertificates.length;
        }

        displayCertificates(allCertificates);

    } catch (error) {

        console.error("History Error:", error);

        if (historyBody) {
            historyBody.innerHTML =
                '<tr><td colspan="5">Unable to load certificate history.</td></tr>';
        }
    }
}


// Display history
function displayCertificates(certificates) {

    if (!historyBody) return;

    if (!certificates.length) {

        historyBody.innerHTML =
            '<tr><td colspan="5">No certificates found.</td></tr>';

        return;
    }

    historyBody.innerHTML = certificates.map(certificate => `

        <tr>
            <td>${escapeHTML(certificate.certificateId)}</td>
            <td>${escapeHTML(certificate.studentName)}</td>
            <td>${escapeHTML(certificate.courseName)}</td>
            <td>${escapeHTML(formatDate(certificate.certificateDate))}</td>
            <td>
                <button
                    type="button"
                    class="view-btn"
                    data-id="${escapeHTML(certificate.certificateId)}">
                    View / Print
                </button>
            </td>
        </tr>

    `).join("");
}


// Search certificates
if (searchInput) {

    searchInput.addEventListener("input", function() {

        const searchValue = this.value.toLowerCase().trim();

        const filteredCertificates = allCertificates.filter(certificate => {

            const studentName =
                String(certificate.studentName || "").toLowerCase();

            const certificateId =
                String(certificate.certificateId || "").toLowerCase();

            return studentName.includes(searchValue) ||
                   certificateId.includes(searchValue);
        });

        displayCertificates(filteredCertificates);
    });
}


// View old certificate
if (historyBody) {

    historyBody.addEventListener("click", function(event) {

        const button = event.target.closest(".view-btn");

        if (!button) return;

        const certificate = allCertificates.find(item =>
            item.certificateId === button.dataset.id
        );

        if (certificate) {
            showCertificate(certificate);
        }
    });
}


// Load history on page opening
loadCertificates();
