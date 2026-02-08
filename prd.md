DelyBell Order Sync

Product Requirements Document (PRD)

Version: 1.0
Status: Ready for Build & App Store Submission
Product Type: Shopify Embedded Public App
Target Market: Shopify merchants using DelyBell logistics
Owner: DelyBell
Last Updated: Feb 2026

1. Product Overview
1.1 Problem Statement

Shopify merchants using DelyBell as their logistics partner currently lack a reliable, standardized way to sync Shopify orders into the DelyBell delivery system.

Manual order entry:

Is time-consuming

Causes fulfillment delays

Introduces human errors

Does not scale for growing merchants

1.2 Solution

DelyBell Order Sync is a Shopify embedded app that allows merchants to:

Automatically capture Shopify orders via webhooks

Review orders inside Shopify Admin

Manually sync selected orders to DelyBell

Track sync status and delivery identifiers

Handle errors and retries safely

Stay fully compliant with Shopify App Store and GDPR requirements

1.3 Goals

Primary Goals

Seamless Shopify → DelyBell order transfer

Zero manual data entry

Full Shopify App Store compliance

High reliability and transparency

Non-Goals

No real-time auto-sync (manual only)

No delivery route optimization

No customer-facing UI

2. Target Users
2.1 Primary User

Shopify Store Owner / Operations Manager

Uses Shopify Admin daily

Needs control over when orders are sent to logistics

Wants visibility into sync status and errors

2.2 Secondary User

DelyBell Operations/Admin Team

Monitors integrations

Supports merchants

Diagnoses failed syncs

3. User Journeys
3.1 Installation Flow

Merchant installs app from Shopify App Store

Shopify OAuth flow completes

App opens embedded inside Shopify Admin

Dashboard loads immediately (no install form)

App registers required webhooks automatically

3.2 Order Sync Flow (Manual)

Customer places order on Shopify store

Shopify sends orders/create webhook

Order is saved in DelyBell system as pending_sync

Merchant opens DelyBell Order Sync in Shopify Admin

Merchant reviews pending orders

Merchant selects orders

Clicks Sync Selected

Orders are sent to DelyBell API

Status updates to processed

DelyBell Order ID is displayed

3.3 Error Handling Flow

Sync fails due to:

Invalid address

API failure

Missing data

Order status becomes failed

Error message is stored and displayed

Merchant clicks Retry

Order is reprocessed

4. Core Features
4.1 Order Capture

Capture orders using Shopify webhooks

Supported events:

orders/create

orders/updated

Ignore already fulfilled or completed orders

Prevent duplicate processing

4.2 Order Management Dashboard (Embedded)

Order Table Columns

Shopify Order #

Order Date

Payment Status

Sync Status

DelyBell Order ID

Actions

Order Statuses

pending_sync

processed

failed

completed

4.3 Manual Sync

Sync single order

Sync multiple selected orders

Disable sync for completed orders

Show progress and result feedback

4.4 Address Mapping & Validation

Pickup Address

Derived from Shopify store address

Cached per store

Delivery Address

Parsed from Shopify shipping address

Block / Road / Building mapping

Validated against DelyBell master data

4.5 Error Handling & Retry

Capture detailed error reasons

Display user-friendly messages

Preserve raw error logs for admin review

Allow retry without duplicating records

4.6 Admin Dashboard (Internal)

Admin Capabilities

View all connected shops

View all orders across shops

Filter by status, shop, date

Retry failed orders

Monitor DelyBell API health

View problem reports

4.7 Problem Reporting

Merchants can submit issues from app UI

Optional order reference

Admin can:

Update status

Add notes

Track resolution

5. Compliance & Security Requirements
5.1 Shopify App Store Compliance

Mandatory Requirements

OAuth authentication

Embedded app support

Immediate redirect after install

HTTPS everywhere

GDPR webhooks implemented

5.2 Mandatory Compliance Webhooks
Topic	Purpose
customers/data_request	Data access request
customers/redact	Customer data deletion
shop/redact	Shop data deletion

Requirements

Accept POST JSON

Verify Shopify HMAC

Return 200 OK

Perform required data deletion/anonymization

5.3 Data Handling

Customer data stored only in order_logs

Data anonymized on redaction

Shop data deleted on uninstall

No unnecessary PII retention

6. Non-Functional Requirements
6.1 Reliability

Webhooks must respond < 5 seconds

Orders must never be lost

Retry logic for transient failures

6.2 Scalability

Support thousands of shops

Support high webhook throughput

Stateless application design

6.3 Observability

Structured logging

Error tracking

Admin diagnostics endpoints

7. Tech Stack (Recommended)
7.1 Core Stack
Layer	Technology
Framework	Shopify CLI
App Runtime	Remix (Node.js)
Hosting	Render / Fly.io / AWS
Database	Supabase (PostgreSQL)
ORM / Client	Supabase JS
Templating	Remix React
Styling	Tailwind CSS
Auth	Shopify OAuth (CLI-managed)
7.2 Integrations
Integration	Purpose
Shopify Admin API	Orders, store data
Shopify Webhooks	Order events, GDPR
DelyBell API	Order creation & tracking
7.3 Security

Shopify-managed HMAC verification

Encrypted secrets

CSP headers for iframe embedding

HTTPS enforced

8. Data Model (High Level)
8.1 Shops

shop

access_token

scopes

installed_at

sync_mode

8.2 Order Logs

shopify_order_id

shopify_order_number

delybell_order_id

status

error_message

financial_status

synced_at

8.3 Problem Reports

shop

order_reference

subject

message

status

admin_notes

9. Success Metrics
9.1 Product Metrics

% orders successfully synced

Sync failure rate

Retry success rate

Average sync time

9.2 Business Metrics

Number of active shops

Orders processed per shop

Support tickets per shop

10. Risks & Mitigations
Risk	Mitigation
Webhook failures	Shopify retry + logging
Address parsing errors	Validation + retries
API downtime	Graceful failure + retry
App Store rejection	Use Shopify CLI defaults
11. Future Enhancements (Out of Scope v1)

Auto-sync mode

Delivery status webhooks

Analytics dashboard

Multi-warehouse support

Multi-currency support

12. Summary

DelyBell Order Sync is a focused, compliant, enterprise-ready Shopify app designed to solve a clear logistics problem with minimal merchant friction.

By leveraging Shopify CLI + Remix, the app:

Reduces maintenance burden

Maximizes App Store approval success

Scales cleanly with merchant growth