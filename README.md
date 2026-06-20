# Postgraduate Candidate & Graduation Status Dashboard

A comprehensive, real-time digital dashboard designed for the UniSZA Graduate School (PPS) to monitor, track, and analyze postgraduate candidate enrolment, active status, academic demographics, and PTA/PSU (International Postgraduate Target) achievements.

## 🚀 Workflow & Architecture (GitOps)
This project embraces a modern **Local Development & GitOps** alur kerja to ensure code integrity, version control, and seamless deployment:
- **Local IDE:** VS Code (HTML/CSS/JS frontend logic)
- **Deployment Tool:** Clasp CLI (`clasp push && clasp deploy`)
- **Cloud Infrastructure:** Google Apps Script & Google Sheets (Backend database)
- **Single Source of Truth (SSoT):** GitHub (`ggn-candidate-dashboard`)

## 🛠️ Key Features
- **Real-Time Demographics:** Visual breakdowns of student sessions, programs (Master vs. PhD), nationalities, and faculty distributions.
- **PTA/PSU Tracker:** Automated comparison table tracking current international student enrollments against university-defined KPI targets.
- **Interactive Student Profiles:** On-click student profile card featuring real-time duration of study calculations and custom read-only/edit-only administrative controls.
- **Secure Access Control:** Password-protected editing features for administrators while maintaining general read-only accessibility for public stakeholders.

## 📦 Tech Stack
- **Frontend:** HTML5, Tailwind CSS, FontAwesome Icons, Chart.js (with Chart DataLabels plugin).
- **Backend:** Google Apps Script (GAS) using the `doGet` and `doPost` API endpoints.
- **Database:** Google Sheets.
- **Libraries:** SweetAlert2 for polished alert systems, SheetJS (XLSX) for spreadsheet processing, html2pdf.js for report export capabilities.
