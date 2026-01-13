/**
 * Mock Shopify Order Generator
 * Generates sample Shopify order data for testing Delybell integration
 */

/**
 * Generate a mock Shopify order
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock Shopify order
 */
function generateMockShopifyOrder(overrides = {}) {
  const orderNumber = overrides.orderNumber || Math.floor(Math.random() * 1000000);
  
  return {
    id: overrides.id || orderNumber,
    order_number: overrides.orderNumber || orderNumber,
    name: overrides.name || `#${orderNumber}`,
    email: overrides.email || 'customer@example.com',
    created_at: overrides.createdAt || new Date().toISOString(),
    updated_at: overrides.updatedAt || new Date().toISOString(),
    note: overrides.note || '',
    tags: overrides.tags || '',
    financial_status: overrides.financialStatus || 'pending',
    fulfillment_status: overrides.fulfillmentStatus || null,
    total_price: overrides.totalPrice || '150.00',
    subtotal_price: overrides.subtotalPrice || '100.00',
    total_tax: overrides.totalTax || '10.00',
    currency: overrides.currency || 'USD',
    
    customer: {
      id: overrides.customerId || 123456,
      first_name: overrides.customerFirstName || 'John',
      last_name: overrides.customerLastName || 'Doe',
      email: overrides.customerEmail || 'customer@example.com',
      phone: overrides.customerPhone || '+1234567890',
      ...overrides.customer,
    },
    
    billing_address: {
      first_name: overrides.billingFirstName || 'Jane',
      last_name: overrides.billingLastName || 'Smith',
      company: overrides.billingCompany || 'Shopify Store',
      address1: overrides.billingAddress1 || '123 Main Street',
      address2: overrides.billingAddress2 || 'Suite 100',
      city: overrides.billingCity || 'New York',
      province: overrides.billingProvince || 'NY',
      country: overrides.billingCountry || 'United States',
      zip: overrides.billingZip || '10001',
      phone: overrides.billingPhone || '+1234567890',
      email: overrides.billingEmail || 'store@example.com',
      latitude: overrides.billingLatitude || '40.7128',
      longitude: overrides.billingLongitude || '-74.0060',
      ...overrides.billingAddress,
    },
    
    shipping_address: {
      first_name: overrides.shippingFirstName || 'John',
      last_name: overrides.shippingLastName || 'Doe',
      company: overrides.shippingCompany || '',
      address1: overrides.shippingAddress1 || '456 Oak Avenue',
      address2: overrides.shippingAddress2 || 'Apt 5B',
      city: overrides.shippingCity || 'Los Angeles',
      province: overrides.shippingProvince || 'CA',
      country: overrides.shippingCountry || 'United States',
      zip: overrides.shippingZip || '90001',
      phone: overrides.shippingPhone || '+1987654321',
      email: overrides.shippingEmail || 'customer@example.com',
      latitude: overrides.shippingLatitude || '34.0522',
      longitude: overrides.shippingLongitude || '-118.2437',
      note: overrides.shippingNote || 'Please leave at front door',
      ...overrides.shippingAddress,
    },
    
    line_items: overrides.lineItems || [
      {
        id: 1,
        title: 'Product 1',
        name: 'Product 1 - Variant 1',
        quantity: 2,
        price: '50.00',
        grams: 500, // Weight in grams
        weight: 0.5, // Weight in kg
        sku: 'PROD-001',
        variant_title: 'Size: Large, Color: Blue',
        vendor: 'Test Vendor',
        product_id: 1001,
        variant_id: 2001,
      },
      {
        id: 2,
        title: 'Product 2',
        name: 'Product 2 - Variant 2',
        quantity: 1,
        price: '30.00',
        grams: 300,
        weight: 0.3,
        sku: 'PROD-002',
        variant_title: 'Size: Medium',
        vendor: 'Test Vendor',
        product_id: 1002,
        variant_id: 2002,
      },
    ],
    
    payment_gateway_names: overrides.paymentGatewayNames || ['manual'],
    
    ...overrides,
  };
}

/**
 * Generate multiple mock orders
 * @param {number} count - Number of orders to generate
 * @param {Object} baseOverrides - Base overrides for all orders
 * @returns {Array} Array of mock orders
 */
function generateMockShopifyOrders(count = 5, baseOverrides = {}) {
  const orders = [];
  for (let i = 0; i < count; i++) {
    orders.push(generateMockShopifyOrder({
      ...baseOverrides,
      orderNumber: (baseOverrides.startOrderNumber || 1000) + i,
    }));
  }
  return orders;
}

module.exports = {
  generateMockShopifyOrder,
  generateMockShopifyOrders,
};

