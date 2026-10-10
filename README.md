

# 🎥 Intelligent Video Streaming Platform

A scalable, feature-rich video streaming web application designed to deliver localized and secure user experiences. The platform integrates advanced comment moderation, multilingual translation, subscriptions and playlists, real-time notifications, gesture-based video controls, and VoIP capabilities.

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
* Channel subscriptions, playlists and real-time notifications
* Compliance through moderation and authentication
* Regional personalization and adaptive UI
* Secure JWT authentication and automated communication

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

* Save any video to your **Downloads** library with one click
* Downloaded videos are listed in the **Downloads** section
* No daily limits

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
* Socket.IO (real-time notifications)
* Cloudinary (media storage)
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

  * OTP verification
* In-app, real-time notifications for:

  * New uploads from subscribed channels
  * New subscribers
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
