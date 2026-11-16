
require("dotenv").config();

const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase connection
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

app.use(express.json());
app.use(express.static(__dirname));

// Trust proxy for secure cookies on Render
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

// Session configuration
const session = require("express-session");
const bcrypt = require("bcryptjs");

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 8 * 60 * 60 * 1000
    }
}));

// Admin login
app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (
            username !== process.env.ADMIN_USERNAME ||
            !password ||
            !process.env.ADMIN_PASSWORD_HASH
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            process.env.ADMIN_PASSWORD_HASH
        );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });
        }

        req.session.regenerate((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Login failed."
                });
            }

            req.session.isAdmin = true;

            res.json({
                success: true,
                message: "Admin login successful."
            });
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Login error."
        });
    }
});

// Check admin session
app.get("/api/auth-status", (req, res) => {
    res.json({
        success: true,
        isAdmin: req.session.isAdmin === true
    });
});

// Admin logout
app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Logout failed."
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            success: true,
            message: "Logged out successfully."
        });
    });
});

// Admin protection middleware
function requireAdmin(req, res, next) {
    if (req.session.isAdmin === true) {
        return next();
    }

    return res.status(401).json({
        success: false,
        message: "Admin login required."
    });
}

// Backend test
app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Backend Connected Successfully!"
    });
});

// Convert database row to existing website format
function formatCertificate(row) {
    return {
        certificateId: row.certificate_id,
        studentName: row.student_name,
        achievementDescription: row.achievement_description,
        courseName: row.course_name,
        department: row.department,
        certificateDate: row.certificate_date,
        createdAt: row.created_at
    };
}

// Generate and save certificate
app.post("/api/certificates", requireAdmin, async (req, res) => {
    try {
        const {
            studentName,
            achievementDescription,
            courseName,
            department,
            certificateDate
        } = req.body;

        if (
            !studentName ||
            !achievementDescription ||
            !courseName ||
            !department ||
            !certificateDate
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        const certificate = {
            certificate_id: "CERT-" + Date.now(),
            student_name: studentName,
            achievement_description: achievementDescription,
            course_name: courseName,
            department: department,
            certificate_date: certificateDate
        };

        const { data, error } = await supabase
            .from("certificates")
            .insert([certificate])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            certificate: formatCertificate(data)
        });

    } catch (error) {
        console.error("Certificate Save Error:", error);

        res.status(500).json({
            success: false,
            message: "Certificate could not be saved."
        });
    }
});

// Get all certificates
app.get("/api/certificates", requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("certificates")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            total: data.length,
            certificates: data.map(formatCertificate)
        });

    } catch (error) {
        console.error("Fetch Error:", error);

        res.status(500).json({
            success: false,
            message: "Certificates could not be loaded."
        });
    }
});

// Verify certificate
app.get("/api/verify", async (req, res) => {
    try {
        const certificateId = (req.query.certificateId || "")
            .trim()
            .toUpperCase();

        if (!certificateId) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: "Certificate ID is required."
            });
        }

        const { data, error } = await supabase
            .from("certificates")
            .select("*")
            .eq("certificate_id", certificateId)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.json({
                success: true,
                valid: false,
                message: "Certificate not found."
            });
        }

        res.json({
            success: true,
            valid: true,
            certificate: formatCertificate(data)
        });

    } catch (error) {
        console.error("Verification Error:", error);

        res.status(500).json({
            success: false,
            valid: false,
            message: "Verification failed."
        });
    }
});
// Supabase Database Test
app.get("/api/db-test", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("certificates")
            .select("certificate_id")
            .limit(1);

        if (error) throw error;

        res.json({
            success: true,
            message: "Supabase Database Connected Successfully!"
        });

    } catch (error) {
        console.error("Database Error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// Check Admin Login Status
app.get("/api/auth-status", (req, res) => {
    res.json({
        success: true,
        isAdmin: req.session.isAdmin === true
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
