/**
 * Manual test script for Slack notifications
 *
 * Usage:
 * 1. Set SLACK_INCOMING_WEBHOOK_URL in your .env file
 * 2. Run: node scripts/test-slack-notification.js
 *
 * Expected: A Slack notification should appear in your configured channel
 */

const sendSlackNotification = require("../src/utils/slack-notification");

// Test data for a general contact
const generalContact = {
  firstname: "Jane",
  lastname: "Smith",
  email: "jane@example.com",
  source: "website",
  sponsorshipInquiry: false,
  additionalInfo: "I have a question about the community",
};

// Test data for a sponsorship inquiry
const sponsorshipContact = {
  firstname: "John",
  lastname: "Doe",
  email: "john@acme.com",
  source: "sponsorship-form",
  companyName: "Acme Corp",
  companyWebsite: "acme.com",
  sponsorshipInquiry: true,
  budgetRange: "from-5000-to-10000",
  additionalInfo: "Interested in sponsoring the upcoming workshop",
};

async function runTests() {
  console.log("=== Slack Notification Tests ===\n");

  console.log("Test 1: General contact notification");
  console.log("Sending notification for general contact:", generalContact.email);
  await sendSlackNotification(generalContact);
  console.log("✓ Test 1 complete\n");

  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log("Test 2: Sponsorship inquiry notification");
  console.log("Sending notification for sponsorship:", sponsorshipContact.email);
  await sendSlackNotification(sponsorshipContact);
  console.log("✓ Test 2 complete\n");

  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log("Test 3: Missing webhook URL (should log warning)");
  const originalUrl = process.env.SLACK_INCOMING_WEBHOOK_URL;
  delete process.env.SLACK_INCOMING_WEBHOOK_URL;
  await sendSlackNotification({ firstname: "Test", email: "test@test.com" });
  process.env.SLACK_INCOMING_WEBHOOK_URL = originalUrl;
  console.log("✓ Test 3 complete\n");

  console.log("=== All Tests Complete ===");
  console.log("\nCheck your Slack channel for two test notifications:");
  console.log("1. 📬 New Contact Submission - Jane Smith");
  console.log("2. 🤝 Sponsorship Inquiry - John Doe");
}

runTests().catch(console.error);
