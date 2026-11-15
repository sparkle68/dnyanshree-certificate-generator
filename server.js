
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, "certificates.json");

app.use(express.json());
app.use(express.static(__dirname));

// Read saved certificates
function readCertificates() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(DATA_FILE, "[]");
        }

        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        if (!Array.isArray(data)) {
            throw new Error("Certificate data must be an array.");
        }

        return data;

    } catch (error) {
        console.error("Read Error:", error);
        throw error;
    }
}


// Backend test API
app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Backend Connected Successfully!"
    });
});


// Save certificate API
app.post("/api/certificates", (req, res) => {
    try {

        const {
            studentName,
            achievementDescription,
            courseName,
            department,
            certificateDate
        } = req.body;

        // Validate all required fields
        if (
            typeof studentName !== "string" ||
            typeof achievementDescription !== "string" ||
            typeof courseName !== "string" ||
            typeof department !== "string" ||
            typeof certificateDate !== "string" ||
            !studentName.trim() ||
            !achievementDescription.trim() ||
            !courseName.trim() ||
            !department.trim() ||
            !certificateDate.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Please fill all certificate details."
            });
        }

        const certificates = readCertificates();

        const newCertificate = {

            certificateId: "CERT-" + Date.now(),

            studentName: studentName.trim(),

            achievementDescription:
                achievementDescription.trim(),

            courseName: courseName.trim(),

            department: department.trim(),

            certificateDate: certificateDate,

            createdAt: new Date().toISOString()
        };

        certificates.push(newCertificate);

        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(certificates, null, 4)
        );

        res.status(201).json({
            success: true,
            message: "Certificate saved successfully!",
            certificate: newCertificate
        });

    } catch (error) {

        console.error("Save Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to save certificate."
        });
    }
});


// Get all certificates
app.get("/api/certificates", (req, res) => {
    try {

        const certificates = readCertificates();

        res.json({
            success: true,
            total: certificates.length,
            certificates
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Unable to load certificates."
        });
    }
});


// Verify certificate by Certificate ID
app.get("/api/verify", (req, res) => {
    try {

        const certificateId = (req.query.certificateId || "")
            .trim()
            .toUpperCase();

        if (!certificateId) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: "Please enter a Certificate ID."
            });
        }

        const certificates = readCertificates();

        const certificate = certificates.find(item =>
            String(item.certificateId || "")
                .trim()
                .toUpperCase() === certificateId
        );

        if (!certificate) {
            return res.status(404).json({
                success: true,
                valid: false,
                message: "Certificate not found. Please check the Certificate ID."
            });
        }

        res.json({
            success: true,
            valid: true,
            message: "Certificate is valid.",

            certificate: {
                certificateId: certificate.certificateId,
                studentName: certificate.studentName,
                achievementDescription:
                    certificate.achievementDescription ||
                    certificate.courseName,
                courseName: certificate.courseName,
                department: certificate.department || "",
                certificateDate: certificate.certificateDate
            }
        });

    } catch (error) {

        console.error("Verification Error:", error);

        res.status(500).json({
            success: false,
            valid: false,
            message: "Unable to verify certificate."
        });
    }
});


// Backend diagnostic API
app.get("/api/check", (req, res) => {
    res.json({
        message: "NEW SERVER IS WORKING",
        port: PORT
    });
});


console.log("Certificate API routes loaded");

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
