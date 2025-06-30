// Module 6e: Test script for address endpoints
// Run with: node scripts/test-address-endpoints.js

const BASE_URL = 'http://localhost:3000';

// Sample address data for testing
const sampleAddress = {
  street: '123 Test Street',
  city: 'Test City',
  state: 'CA',
  postal_code: '90210',
  country: 'United States'
};

async function testVisitorAddressEndpoint() {
  console.log('🔍 Testing visitor address endpoint...');
  
  try {
    // Note: In real testing, you would need a valid visitor JWT token
    // This is just a structure example
    const response = await fetch(`${BASE_URL}/api/visitor/updateAddress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_VISITOR_JWT_TOKEN_HERE'
      },
      body: JSON.stringify({
        address: sampleAddress
      })
    });

    const result = await response.json();
    console.log('Visitor address endpoint response:', result);
    
    if (response.ok) {
      console.log('✅ Visitor address endpoint working');
    } else {
      console.log('❌ Visitor address endpoint failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error testing visitor address endpoint:', error.message);
  }
}

async function testUserAddressEndpoint() {
  console.log('🔍 Testing user address endpoint...');
  
  try {
    // Note: In real testing, you would need a valid Supabase session token
    // This is just a structure example
    const response = await fetch(`${BASE_URL}/api/user/updateAddress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_SUPABASE_SESSION_TOKEN_HERE'
      },
      body: JSON.stringify({
        address: sampleAddress
      })
    });

    const result = await response.json();
    console.log('User address endpoint response:', result);
    
    if (response.ok) {
      console.log('✅ User address endpoint working');
    } else {
      console.log('❌ User address endpoint failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error testing user address endpoint:', error.message);
  }
}

async function runTests() {
  console.log('📍 Module 6e: Testing address endpoints...\n');
  
  console.log('⚠️  Note: Replace JWT tokens with valid ones for actual testing\n');
  
  await testVisitorAddressEndpoint();
  console.log('');
  await testUserAddressEndpoint();
  
  console.log('\n📍 Address endpoint testing complete');
  console.log('💡 To test properly:');
  console.log('   1. Apply the SQL schema changes from supabase-schema/address-fields.sql');
  console.log('   2. Get valid JWT tokens from your app');
  console.log('   3. Replace the token placeholders in this script');
  console.log('   4. Run: node scripts/test-address-endpoints.js');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testVisitorAddressEndpoint,
  testUserAddressEndpoint,
  sampleAddress
}; 