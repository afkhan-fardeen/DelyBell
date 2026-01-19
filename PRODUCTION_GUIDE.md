# Production Deployment Guide

This guide covers everything needed to deploy the Shopify-Delybell Integration app to production for Delybell clients.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Options](#deployment-options)
3. [Environment Setup](#environment-setup)
4. [Database Setup](#database-setup)
5. [Security Hardening](#security-hardening)
6. [Monitoring & Logging](#monitoring--logging)
7. [Scaling Considerations](#scaling-considerations)
8. [Multi-Store Pickup Addresses](#multi-store-pickup-addresses)
9. [SSL/HTTPS Setup](#sslhttps-setup)
10. [Error Handling & Alerts](#error-handling--alerts)
11. [Performance Optimization](#performance-optimization)
12. [Backup & Recovery](#backup--recovery)

---

## Pre-Deployment Checklist

### ✅ Code Readiness

- [ ] All environment variables documented in `env.example`
- [ ] No hardcoded credentials in code
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Test suite passes
- [ ] Code reviewed and approved

### ✅ Infrastructure Readiness

- [ ] Server/hosting platform selected
- [ ] Domain name registered
- [ ] SSL certificate obtained
- [ ] Database provisioned (if needed)
- [ ] Monitoring tools configured
- [ ] Backup strategy defined

### ✅ Shopify App Setup

- [ ] Shopify Partner account created
- [ ] App created in Partner Dashboard
- [ ] App URL configured
- [ ] Redirect URLs configured
- [ ] Webhook URLs configured
- [ ] OAuth scopes verified

### ✅ Delybell API Setup

- [ ] Delybell API credentials obtained
- [ ] API access tested
- [ ] Rate limits understood
- [ ] Error codes documented

---

## Deployment Options

### Option 1: Heroku (Recommended for Quick Start)

**Pros:**
- Easy deployment
- Built-in SSL
- Automatic scaling
- Add-ons for databases

**Steps:**

1. **Install Heroku CLI:**
   ```bash
   npm install -g heroku
   heroku login
   ```

2. **Create Heroku App:**
   ```bash
   heroku create your-app-name
   ```

3. **Set Environment Variables:**
   ```bash
   heroku config:set DELYBELL_API_URL=https://new.api.delybell.com
   heroku config:set DELYBELL_ACCESS_KEY=your_key
   heroku config:set DELYBELL_SECRET_KEY=your_secret
   heroku config:set SHOPIFY_API_KEY=your_key
   heroku config:set SHOPIFY_API_SECRET=your_secret
   heroku config:set SHOPIFY_HOST=your-app-name.herokuapp.com
   heroku config:set SHOPIFY_SCOPES=read_orders,write_orders
   heroku config:set PORT=80
   ```

4. **Add PostgreSQL (for session storage):**
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

5. **Deploy:**
   ```bash
   git push heroku main
   ```

6. **Update Shopify App Settings:**
   - App URL: `https://your-app-name.herokuapp.com`
   - Redirect URLs: `https://your-app-name.herokuapp.com/auth/callback`
   - Webhook URL: `https://your-app-name.herokuapp.com/webhooks/orders/create`

### Option 2: AWS (EC2 + RDS)

**Pros:**
- Full control
- Cost-effective at scale
- Enterprise-grade infrastructure

**Steps:**

1. **Launch EC2 Instance:**
   - Ubuntu 22.04 LTS
   - t3.small or larger
   - Security group: Allow HTTP (80), HTTPS (443), SSH (22)

2. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install PM2 (Process Manager):**
   ```bash
   sudo npm install -g pm2
   ```

4. **Clone and Setup:**
   ```bash
   git clone <repository-url>
   cd DelyBell
   npm install --production
   ```

5. **Configure Environment:**
   ```bash
   cp env.example .env
   nano .env  # Edit with production values
   ```

6. **Setup RDS PostgreSQL:**
   - Create RDS instance (PostgreSQL)
   - Note connection string
   - Update `.env` with database URL

7. **Start with PM2:**
   ```bash
   pm2 start server.js --name delybell-app
   pm2 save
   pm2 startup  # Auto-start on reboot
   ```

8. **Setup Nginx (Reverse Proxy):**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/delybell
   ```

   Nginx config:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/delybell /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

9. **Setup SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Option 3: DigitalOcean App Platform

**Pros:**
- Simple deployment
- Built-in CI/CD
- Auto-scaling
- Managed databases

**Steps:**

1. **Create App in DigitalOcean Dashboard**
2. **Connect GitHub Repository**
3. **Configure Environment Variables**
4. **Add PostgreSQL Database**
5. **Deploy**

### Option 4: Railway / Render

**Pros:**
- Very simple setup
- Automatic deployments
- Free tier available

**Steps:**

1. **Connect GitHub Repository**
2. **Set Environment Variables**
3. **Deploy**

---

## Environment Setup

### Production Environment Variables

Create `.env` file with production values:

```env
# Shopify Configuration
SHOPIFY_API_KEY=prod_shopify_api_key
SHOPIFY_API_SECRET=prod_shopify_api_secret
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_HOST=your-production-domain.com

# Delybell API Configuration
DELYBELL_API_URL=https://new.api.delybell.com
DELYBELL_ACCESS_KEY=prod_delybell_access_key
DELYBELL_SECRET_KEY=prod_delybell_secret_key

# Server Configuration
NODE_ENV=production
PORT=3000

# Database (if using PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Default Service Configuration
DEFAULT_SERVICE_TYPE_ID=1
DEFAULT_PICKUP_SLOT_TYPE=1
```

### Environment Variable Security

**DO:**
- ✅ Use environment variables for all secrets
- ✅ Use different credentials for production
- ✅ Rotate credentials regularly
- ✅ Use secret management tools (AWS Secrets Manager, etc.)

**DON'T:**
- ❌ Commit `.env` to git
- ❌ Share credentials via email/chat
- ❌ Use development credentials in production
- ❌ Hardcode secrets in code

---

## Database Setup

### Why Database?

The current implementation uses **in-memory session storage**, which:
- ❌ Loses sessions on server restart
- ❌ Doesn't work with multiple server instances
- ❌ Not suitable for production

### Option 1: PostgreSQL (Recommended)

**Install PostgreSQL Driver:**
```bash
npm install pg
```

**Create Database:**
```sql
CREATE DATABASE delybell_app;
CREATE USER delybell_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE delybell_app TO delybell_user;
```

**Create Sessions Table:**
```sql
CREATE TABLE shopify_sessions (
    id VARCHAR(255) PRIMARY KEY,
    shop VARCHAR(255) NOT NULL,
    state VARCHAR(255),
    is_online BOOLEAN DEFAULT false,
    scope VARCHAR(255),
    expires TIMESTAMP,
    access_token TEXT,
    user_id BIGINT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shopify_sessions_shop ON shopify_sessions(shop);
CREATE INDEX idx_shopify_sessions_expires ON shopify_sessions(expires);
```

**Update `services/sessionStorage.js`:**

Replace in-memory storage with PostgreSQL:

```javascript
const { Pool } = require('pg');

class SessionStorage {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async storeSession(id, session) {
    const query = `
      INSERT INTO shopify_sessions (id, shop, state, is_online, scope, expires, access_token, user_id, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (id) 
      DO UPDATE SET 
        shop = $2, state = $3, is_online = $4, scope = $5, 
        expires = $6, access_token = $7, user_id = $8, updated_at = NOW()
    `;
    await this.pool.query(query, [
      id,
      session.shop,
      session.state,
      session.isOnline,
      session.scope,
      session.expires,
      session.accessToken,
      session.userId
    ]);
  }

  async loadSession(id) {
    const query = 'SELECT * FROM shopify_sessions WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    if (result.rows.length === 0) return undefined;
    
    const row = result.rows[0];
    return {
      id: row.id,
      shop: row.shop,
      state: row.state,
      isOnline: row.is_online,
      scope: row.scope,
      expires: row.expires,
      accessToken: row.access_token,
      userId: row.user_id
    };
  }

  async deleteSession(id) {
    const query = 'DELETE FROM shopify_sessions WHERE id = $1';
    await this.pool.query(query, [id]);
  }
}
```

### Option 2: Redis (For High Performance)

**Install Redis:**
```bash
npm install redis
```

**Update `services/sessionStorage.js`** to use Redis instead of in-memory.

---

## Security Hardening

### 1. Webhook Verification

✅ **Already Implemented** - `middleware/webhookVerification.js` verifies HMAC signatures.

**Verify it's enabled:**
```javascript
// In server.js
app.use('/webhooks', verifyWebhook, webhookRoutes);
```

### 2. HTTPS Only

**Force HTTPS:**
```javascript
// In server.js (before routes)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

### 3. Rate Limiting

**Install:**
```bash
npm install express-rate-limit
```

**Configure:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api', limiter);
app.use('/webhooks', limiter);
```

### 4. Input Validation

**Install:**
```bash
npm install express-validator
```

**Validate webhook payloads:**
```javascript
const { body, validationResult } = require('express-validator');

router.post('/orders/create', 
  [
    body('id').isString().notEmpty(),
    body('order_number').isInt(),
    body('shipping_address').isObject()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... rest of handler
  }
);
```

### 5. CORS Configuration

**Restrict CORS:**
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true
}));
```

### 6. Security Headers

**Install:**
```bash
npm install helmet
```

**Configure:**
```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

## Monitoring & Logging

### 1. Application Logging

**Install Winston:**
```bash
npm install winston
```

**Create `utils/logger.js`:**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

module.exports = logger;
```

**Use in code:**
```javascript
const logger = require('./utils/logger');

logger.info('Order processed', { orderId, shop });
logger.error('Order failed', { error, orderId });
```

### 2. Error Tracking

**Install Sentry:**
```bash
npm install @sentry/node
```

**Configure:**
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### 3. Health Check Endpoint

**Enhanced health check:**
```javascript
router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    checks: {
      database: await checkDatabase(),
      delybell: await checkDelybellAPI()
    }
  };
  res.json(health);
});
```

### 4. Metrics Collection

**Install Prometheus Client:**
```bash
npm install prom-client
```

**Expose metrics endpoint:**
```javascript
const client = require('prom-client');
const register = new client.Registry();

client.collectDefaultMetrics({ register });

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## Scaling Considerations

### Horizontal Scaling

**Current Limitation:** In-memory session storage doesn't work with multiple instances.

**Solution:** Use database (PostgreSQL/Redis) for session storage.

**Load Balancer Setup:**
```
Load Balancer
    ├── Instance 1 (Port 3000)
    ├── Instance 2 (Port 3000)
    └── Instance 3 (Port 3000)
         ↓
    Shared Database (PostgreSQL/Redis)
```

### Rate Limiting

**Delybell API Rate Limits:**
- Check Delybell API documentation for rate limits
- Implement request queuing if needed
- Use exponential backoff for retries

**Shopify API Rate Limits:**
- 40 requests per app per store per minute
- Implement rate limiting in `shopifyClient.js`

### Caching

**Cache Master Data:**
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour

async function getBlocks(search) {
  const cacheKey = `blocks:${search}`;
  let blocks = cache.get(cacheKey);
  if (!blocks) {
    blocks = await delybellClient.getBlocks(search);
    cache.set(cacheKey, blocks);
  }
  return blocks;
}
```

---

## Multi-Store Pickup Addresses

### Current Limitation

All stores use the same hardcoded pickup address.

### Solution: Store-Specific Configuration

**Option 1: Database Table**

```sql
CREATE TABLE store_configs (
    shop VARCHAR(255) PRIMARY KEY,
    pickup_block_id INTEGER NOT NULL,
    pickup_road_id INTEGER NOT NULL,
    pickup_building_id INTEGER NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_customer_name VARCHAR(255),
    pickup_mobile_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Update `services/addressMapper.js`:**

```javascript
async getPickupConfig(shop) {
  // Check database for store-specific config
  const config = await db.query(
    'SELECT * FROM store_configs WHERE shop = $1',
    [shop]
  );
  
  if (config.rows.length > 0) {
    return config.rows[0];
  }
  
  // Fallback to default (Babybow)
  return this.getBabybowPickupConfig();
}
```

**Option 2: Environment Variables**

```env
STORE_CONFIG_JSON={"store1.myshopify.com":{"block_id":1,"road_id":114,"building_id":417},"store2.myshopify.com":{"block_id":2,"road_id":200,"building_id":500}}
```

**Option 3: Configuration File**

```json
{
  "stores": {
    "store1.myshopify.com": {
      "pickup": {
        "block_id": 1,
        "road_id": 114,
        "building_id": 417,
        "address": "Building 417, Road 114, Block 1, Ras Ruman"
      }
    }
  },
  "default": {
    "pickup": {
      "block_id": 1,
      "road_id": 114,
      "building_id": 417
    }
  }
}
```

---

## SSL/HTTPS Setup

### Let's Encrypt (Free SSL)

**Install Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
```

**Obtain Certificate:**
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

**Auto-Renewal:**
```bash
sudo certbot renew --dry-run
```

### Cloudflare (Alternative)

1. Add domain to Cloudflare
2. Update nameservers
3. Enable SSL/TLS encryption
4. Use Cloudflare's free SSL

---

## Error Handling & Alerts

### Email Alerts

**Install Nodemailer:**
```bash
npm install nodemailer
```

**Send alerts on critical errors:**
```javascript
const nodemailer = require('nodemailer');

async function sendAlert(error, context) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.ALERT_EMAIL,
    to: process.env.ADMIN_EMAIL,
    subject: `[Delybell App] Critical Error`,
    html: `
      <h2>Error Alert</h2>
      <p><strong>Error:</strong> ${error.message}</p>
      <p><strong>Context:</strong> ${JSON.stringify(context, null, 2)}</p>
      <pre>${error.stack}</pre>
    `
  });
}
```

### Slack/Discord Webhooks

**Send alerts to Slack:**
```javascript
const axios = require('axios');

async function sendSlackAlert(message) {
  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    text: `[Delybell App] ${message}`
  });
}
```

---

## Performance Optimization

### 1. Database Connection Pooling

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

### 2. Async Processing

**Use job queue for order processing:**
```bash
npm install bull redis
```

**Process orders asynchronously:**
```javascript
const Queue = require('bull');
const orderQueue = new Queue('order processing', {
  redis: { host: '127.0.0.1', port: 6379 }
});

orderQueue.process(async (job) => {
  const { order, shop } = job.data;
  return await orderProcessor.processOrder(order, shop);
});
```

### 3. Response Compression

```bash
npm install compression
```

```javascript
const compression = require('compression');
app.use(compression());
```

---

## Backup & Recovery

### Database Backups

**PostgreSQL Automated Backups:**
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
```

### Session Backup

**Export sessions:**
```sql
COPY shopify_sessions TO '/tmp/sessions_backup.csv' CSV HEADER;
```

### Recovery Procedure

1. Restore database from backup
2. Restart application
3. Verify webhooks are working
4. Test order processing

---

## Deployment Checklist

### Pre-Launch

- [ ] All environment variables set
- [ ] Database configured and tested
- [ ] SSL certificate installed
- [ ] Monitoring configured
- [ ] Error alerts configured
- [ ] Backup strategy implemented
- [ ] Load testing completed

### Launch Day

- [ ] Deploy to production
- [ ] Verify health check endpoint
- [ ] Test webhook endpoint
- [ ] Install app in test Shopify store
- [ ] Process test order
- [ ] Monitor logs for errors
- [ ] Verify order created in Delybell

### Post-Launch

- [ ] Monitor for 24 hours
- [ ] Check error rates
- [ ] Verify all stores can install app
- [ ] Document any issues
- [ ] Schedule regular maintenance

---

## Support & Maintenance

### Regular Tasks

**Weekly:**
- Review error logs
- Check database size
- Verify backups

**Monthly:**
- Update dependencies
- Review performance metrics
- Rotate credentials

**Quarterly:**
- Security audit
- Load testing
- Disaster recovery drill

---

## Additional Resources

- [Shopify App Development](https://shopify.dev/docs/apps)
- [Delybell API Documentation](https://documenter.getpostman.com/view/37966240/2sB34eKND9)
- [Node.js Production Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

## Need Help?

For deployment assistance:
1. Review logs for specific errors
2. Check environment variables
3. Verify API credentials
4. Test with mock orders first
5. Contact Delybell support for API issues
