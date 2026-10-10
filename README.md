

# 🎥 Intelligent Video Streaming Platform

A scalable, feature-rich video streaming web application designed to deliver localized, secure, and premium user experiences. The platform integrates advanced comment moderation, multilingual translation, secure payment workflows, adaptive theming, gesture-based video controls, and VoIP capabilities.

---

## 📸 Screenshots
### 📝 Before Login
![Before Login](https://res.cloudinary.com/dfacldueh/image/upload/v1769492033/Screenshot_2026-01-27_105019_surpyw.png)

### 🔐 After Login
![After Login](https://res.cloudinary.com/dfacldueh/image/upload/v1769492033/Screenshot_2026-01-27_105136_hu9ycs.png)

### 🤖 Video call Feature 
![Video call Feature](https://res.cloudinary.com/dfacldueh/image/upload/v1769492033/Screenshot_2026-01-27_105231_h2ikdu.png)

### 👤 Phone Verification
![Phone Verification](https://res.cloudinary.com/dfacldueh/image/upload/v1769492032/Screenshot_2026-01-27_105044_yrpwzp.png)

--- 

---

## 📌 Key Functional Objectives

This platform focuses on:

* User engagement through interactive comments and gestures
* Monetization via tier-based subscriptions
* Compliance through moderation and authentication
* Regional personalization and adaptive UI
* Secure payments and automated communication

---

## 🗣️ Comment Management & Moderation

### Core Capabilities

* Users can post comments in **any language**
* Each comment includes:

  * 👍 Like option
  * 👎 Dislike option
  * 🌐 Translate option (user-selectable target language)
  * 📍 Exact **city name** of the commenter (geo-resolved)

### Moderation Rules

* Comments containing **special characters** are **not permitted**
* A comment is **automatically removed** once it receives **2 dislikes**
* Comment validation and moderation occur in real time

---

## 🌍 Multilingual Comment Translation

* Integrated translation service for user comments
* Users may translate comments into any desired language
* Translation occurs on demand without modifying the original content

---

## 📥 Video Download Feature

### Free Plan

* Users can download **only one video per day**
* Downloaded videos are:

  * Stored locally
  * Displayed in the **User Profile → Downloads** section

### Premium Access

* Unlimited video downloads
* Triggered via **Premium Upgrade**
* Payment gateway: **Razorpay (Test Mode)**

### Payment Workflow

* User clicks **Premium Plan**
* Razorpay test payment is initiated
* Upon successful payment:

  * Unlimited downloads are enabled
  * Access rights are updated immediately

---

## 💳 Subscription Plans & Watch Limits

| Plan   | Watch Time Limit | Price |
| ------ | ---------------- | ----- |
| Free   | 5 minutes        | ₹0    |
| Bronze | 7 minutes        | ₹10   |
| Silver | 10 minutes       | ₹50   |
| Gold   | Unlimited        | ₹100  |

### Plan Upgrade Features

* Seamless upgrade from Free to Bronze / Silver / Gold
* Razorpay payment integration
* Plan entitlements applied instantly

### Email Notification

* On successful payment:

  * User receives a **confirmation email**
  * An **invoice** is automatically generated and attached

---

## 🎨 Adaptive Theme Management

### Theme Logic

* **White Theme** is applied when:

  * Login time is between **10:00 AM – 12:00 PM**
  * AND user location is one of:

    * Tamil Nadu
    * Kerala
    * Karnataka
    * Andhra Pradesh
    * Telangana

* **Dark Theme** is applied for:

  * All other time ranges
  * All other states

---

## 🔐 Location-Based OTP Verification

### Southern India Login

If user logs in from:

* Tamil Nadu
* Kerala
* Karnataka
* Andhra Pradesh
* Telangana

➡ OTP is sent via **Email**

### Other States Login

➡ OTP is sent via **Mobile Number (SMS)**

---

## ▶️ Custom Video Player (Gesture-Based Controls)

A fully customized video player with intuitive gesture interactions:

| Gesture             | Action               |
| ------------------- | -------------------- |
| Double-tap (Right)  | Forward 10 seconds   |
| Double-tap (Left)   | Rewind 10 seconds    |
| Single-tap (Center) | Pause / Play         |
| Triple-tap (Center) | Play next video      |
| Triple-tap (Right)  | Close website        |
| Triple-tap (Left)   | Open comment section |

---

## 📞 VoIP & Screen Sharing

### Capabilities

* Users can initiate **video calls** with friends
* Screen sharing of **YouTube website**
* Entire video call session can be:

  * Recorded
  * Saved locally on the user’s system

---

## 🛠️ Technology Stack

### Frontend

* TypeScript
* TailwindCSS
* Gesture handling libraries
* WebRTC (VoIP & screen sharing)

### Backend

* Node.js
* Express.js
* MongoDB / Mongoose
* JWT Authentication
* Razorpay SDK
* Email & SMS services

---

## 📂 Project Architecture

```bash
📦 Intelligent-Video-Platform
 ┣ 📂 backend
 ┃ ┣ controllers
 ┃ ┣ models
 ┃ ┣ routes
 ┃ ┣ middleware
 ┃ ┣ services
 ┃ ┗ server.js
 ┣ 📂 frontend
 ┃ ┣ src
 ┃ ┃ ┣ components
 ┃ ┃ ┣ pages
 ┃ ┃ ┣ hooks
 ┃ ┃ ┣ utils
 ┃ ┃ ┗ main.jsx
 ┗ README.md
```



## 📧 Notifications & Communication

* Email alerts for:

  * Successful payments
  * OTP verification
  * Invoice delivery
* SMS alerts for:

  * OTP verification (non-southern states)

---

## 📞 Contact Information

For technical discussions, integration support, or collaboration:

**Email:** [kashishmahajan878@gmail.com](mailto:kashishmahajan878@gmail.com)
**LinkedIn:** [https://www.linkedin.com/in/kashish-mahajan-0591ba2b4/](https://www.linkedin.com/in/kashish-mahajan-0591ba2b4/)
**GitHub:** [https://github.com/KashishMahajan1203](https://github.com/KashishMahajan1203)

---

**Developed and maintained with a focus on scalability, security, and user experience.**

---
