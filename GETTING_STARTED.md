# Getting Started Guide for Developers

**Quick path to understand and work with this project.**

---

## 🎯 Start Here

### Step 1: Read `README.md`
**Purpose:** Get project overview  
**Time:** 5 minutes  
**What you'll learn:**
- What the project does
- Key features
- Quick overview

**Action:** Just read it, don't code yet.

---

### Step 2: Read `FILE_REFERENCE.md`
**Purpose:** Understand all files and their purposes  
**Time:** 10-15 minutes  
**What you'll learn:**
- What each file does
- How files connect
- Which files are important

**Action:** Skim through, focus on:
- Root files section
- Routes directory
- Services directory

**Key takeaway:** Know where everything is located.

---

### Step 3: Read `DEVELOPER_GUIDE.md`
**Purpose:** Technical deep dive  
**Time:** 20-30 minutes  
**What you'll learn:**
- Architecture details
- How components work together
- Configuration requirements

**Action:** Read sections:
- Project Overview
- File Structure & Purpose
- Key Components
- Configuration Files

**Key takeaway:** Understand the technical architecture.

---

### Step 4: Check `env.example`
**Purpose:** See what configuration is needed  
**Time:** 5 minutes  
**What you'll learn:**
- Required environment variables
- What credentials you need
- Configuration options

**Action:** Open the file and read the comments.

**Key takeaway:** Know what credentials you need to get.

---

### Step 5: Read `SHOPIFY_APP_STORE_GUIDE.md` (If Publishing)
**Purpose:** Learn how to publish to App Store  
**Time:** 30-45 minutes  
**What you'll learn:**
- Partner account setup
- App creation process
- Submission steps

**Action:** Follow steps 1-8 sequentially.

**Key takeaway:** Complete guide for App Store publishing.

---

### Step 6: Read `PRODUCTION_GUIDE.md` (If Deploying)
**Purpose:** Learn production deployment  
**Time:** 30-45 minutes  
**What you'll learn:**
- Deployment options
- Database setup
- Security requirements

**Action:** Choose your platform and follow that section.

**Key takeaway:** How to deploy to production.

---

## 📁 Code Files to Explore (In Order)

### 1. `server.js`
**Why first:** Entry point - shows how everything connects  
**What to look for:**
- Route registration
- Middleware setup
- Server startup

**Time:** 10 minutes

---

### 2. `config.js`
**Why second:** Shows configuration structure  
**What to look for:**
- How env vars are loaded
- Configuration object structure

**Time:** 5 minutes

---

### 3. `routes/auth.js`
**Why third:** OAuth flow is critical for Shopify apps  
**What to look for:**
- `/auth/install` route
- `/auth/callback` route
- Session storage

**Time:** 15 minutes

---

### 4. `routes/webhooks.js`
**Why fourth:** Core functionality - order processing  
**What to look for:**
- `/webhooks/orders/create` handler
- Order parsing
- Error handling

**Time:** 20 minutes

---

### 5. `services/orderProcessor.js`
**Why fifth:** Main business logic  
**What to look for:**
- `processOrder()` method
- Order validation
- Error handling

**Time:** 20 minutes

---

### 6. `services/orderTransformer.js`
**Why sixth:** Format conversion logic  
**What to look for:**
- `transformShopifyToDelybell()` method
- Address mapping
- Payload construction

**Time:** 20 minutes

---

### 7. `services/addressMapper.js`
**Why seventh:** Address parsing logic  
**What to look for:**
- `parseShopifyAddress()` method
- Supported formats
- Pickup address config

**Time:** 15 minutes

---

### 8. `services/addressIdMapper.js`
**Why eighth:** ID lookup logic  
**What to look for:**
- `convertNumbersToIds()` method
- Master data API calls
- Lookup chain

**Time:** 15 minutes

---

### 9. `services/shopifyClient.js`
**Why ninth:** Shopify API integration  
**What to look for:**
- OAuth setup
- API methods
- Session management

**Time:** 15 minutes

---

### 10. `services/delybellClient.js`
**Why tenth:** Delybell API integration  
**What to look for:**
- API methods
- Authentication
- Order creation

**Time:** 15 minutes

---

## 🚀 Quick Start Path (If You're in a Hurry)

**Minimum reading to get started:**

1. ✅ `README.md` (5 min)
2. ✅ `FILE_REFERENCE.md` - Root Files & Routes sections (10 min)
3. ✅ `env.example` (5 min)
4. ✅ `server.js` (10 min)
5. ✅ `routes/webhooks.js` (20 min)

**Total:** ~50 minutes to understand basics

---

## 📋 Task-Based Paths

### Path 1: "I need to publish this to App Store"

**Read in order:**
1. `README.md`
2. `SHOPIFY_APP_STORE_GUIDE.md` ← **Main guide**
3. `APP_STORE_CHECKLIST.md`
4. `PRODUCTION_GUIDE.md` (deployment section)
5. `env.example` (to set up config)

**Then:**
- Follow `SHOPIFY_APP_STORE_GUIDE.md` step by step

---

### Path 2: "I need to deploy this to production"

**Read in order:**
1. `README.md`
2. `PRODUCTION_GUIDE.md` ← **Main guide**
3. `FILE_REFERENCE.md` (to understand files)
4. `env.example` (to set up config)

**Then:**
- Choose deployment platform
- Follow `PRODUCTION_GUIDE.md` for that platform

---

### Path 3: "I need to understand how it works"

**Read in order:**
1. `README.md`
2. `FILE_REFERENCE.md`
3. `DEVELOPER_GUIDE.md`
4. `DOCUMENTATION.md`
5. Code files (in order listed above)

**Then:**
- Read code files starting with `server.js`

---

### Path 4: "I need to fix a bug or add a feature"

**Read in order:**
1. `FILE_REFERENCE.md` (find relevant file)
2. `DEVELOPER_GUIDE.md` (understand architecture)
3. Relevant code file(s)
4. `DOCUMENTATION.md` (if needed)

**Then:**
- Make changes
- Test with test files in `/test` directory

---

## 🎓 Learning Path (Complete Understanding)

**Week 1: Overview**
- Day 1: `README.md`, `FILE_REFERENCE.md`
- Day 2: `DEVELOPER_GUIDE.md`
- Day 3: `DOCUMENTATION.md` (sections 1-5)

**Week 2: Code Deep Dive**
- Day 1: `server.js`, `config.js`
- Day 2: `routes/auth.js`, `routes/webhooks.js`
- Day 3: `services/orderProcessor.js`
- Day 4: `services/orderTransformer.js`
- Day 5: `services/addressMapper.js`, `services/addressIdMapper.js`

**Week 3: Integration**
- Day 1: `services/shopifyClient.js`
- Day 2: `services/delybellClient.js`
- Day 3: Test files
- Day 4: Run tests, understand flow
- Day 5: Make small changes, test

---

## 📝 Checklist for New Developer

### Day 1: Setup
- [ ] Read `README.md`
- [ ] Read `FILE_REFERENCE.md`
- [ ] Clone repository
- [ ] Run `npm install`
- [ ] Copy `env.example` to `.env`
- [ ] Read `env.example` comments

### Day 2: Understanding
- [ ] Read `DEVELOPER_GUIDE.md`
- [ ] Read `server.js`
- [ ] Read `routes/auth.js`
- [ ] Read `routes/webhooks.js`
- [ ] Understand OAuth flow

### Day 3: Core Logic
- [ ] Read `services/orderProcessor.js`
- [ ] Read `services/orderTransformer.js`
- [ ] Read `services/addressMapper.js`
- [ ] Read `services/addressIdMapper.js`
- [ ] Understand order processing flow

### Day 4: Integration
- [ ] Read `services/shopifyClient.js`
- [ ] Read `services/delybellClient.js`
- [ ] Run test scripts
- [ ] Test with mock orders

### Day 5: Ready to Work
- [ ] Can explain the flow
- [ ] Know where to make changes
- [ ] Understand configuration
- [ ] Ready to code!

---

## 🎯 Most Important Files (Priority Order)

### Must Read (Critical)
1. **`README.md`** - Project overview
2. **`FILE_REFERENCE.md`** - File reference
3. **`server.js`** - Entry point
4. **`routes/webhooks.js`** - Core functionality
5. **`services/orderProcessor.js`** - Main logic

### Should Read (Important)
6. **`DEVELOPER_GUIDE.md`** - Technical details
7. **`routes/auth.js`** - OAuth flow
8. **`services/orderTransformer.js`** - Format conversion
9. **`env.example`** - Configuration

### Nice to Read (Helpful)
10. **`DOCUMENTATION.md`** - Complete reference
11. **`PRODUCTION_GUIDE.md`** - Deployment guide
12. **`SHOPIFY_APP_STORE_GUIDE.md`** - Publishing guide

---

## 💡 Pro Tips

1. **Start with `README.md`** - Always start here
2. **Use `FILE_REFERENCE.md`** - When you don't know what a file does
3. **Follow the code flow** - Start with `server.js`, then follow the routes
4. **Read comments in code** - They explain a lot
5. **Run tests** - Use test files to understand behavior
6. **Check `env.example`** - Understand configuration needs

---

## 🆘 When Stuck

**Don't know what a file does?**
→ Check `FILE_REFERENCE.md`

**Don't understand how it works?**
→ Read `DEVELOPER_GUIDE.md`

**Need to deploy?**
→ Read `PRODUCTION_GUIDE.md`

**Need to publish?**
→ Read `SHOPIFY_APP_STORE_GUIDE.md`

**Need API details?**
→ Read `DOCUMENTATION.md`

---

## ✅ Quick Summary

**Start Here:**
1. `README.md` (5 min)
2. `FILE_REFERENCE.md` (15 min)
3. `DEVELOPER_GUIDE.md` (30 min)

**Then Code:**
4. `server.js`
5. `routes/webhooks.js`
6. `services/orderProcessor.js`

**For Specific Tasks:**
- Publishing → `SHOPIFY_APP_STORE_GUIDE.md`
- Deployment → `PRODUCTION_GUIDE.md`
- Understanding → `DOCUMENTATION.md`

---

**Ready? Start with `README.md`!** 🚀
