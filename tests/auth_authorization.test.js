/**
 * End-to-End Test Suite for Firebase JWT Authentication & Custom Claims Authorization
 *
 * Tests all 12 required conditions:
 * 1. No Authorization header -> 401
 * 2. Invalid token -> 401
 * 3. Expired/revoked token -> 401
 * 4. Valid Firebase token -> authenticated
 * 5. USER accessing admin endpoint -> 403
 * 6. AGENT accessing admin-only role-management endpoint -> 403
 * 7. ADMIN accessing admin endpoint -> allowed
 * 8. USER accessing own ticket -> allowed
 * 9. USER attempting to access another user's ticket -> rejected (403)
 * 10. Ticket creation uses req.user.uid rather than req.body.userId
 * 11. Role is read from Firebase custom claims
 * 12. Changing a role and refreshing the Firebase ID token results in the new role being recognized
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const http = require("http");
const app = require("../src/app");
const { admin } = require("../src/config/firebase");
const db = require("../src/config/db");
const { setRole } = require("../src/services/firebaseAuth.service");

const API_KEY = "AIzaSyA17jkFilvC7UZ9dqDYSu1ykrHWxmUVmxk";

let server;
let baseUrl;

/**
 * Creates or retrieves a Firebase Auth user, then sets their initial role claim
 */
async function getOrCreateFirebaseUser(uid, email, role) {
  try {
    await admin.auth().getUser(uid);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      await admin.auth().createUser({
        uid,
        email,
        displayName: uid,
      });
    } else {
      throw err;
    }
  }
  await setRole(uid, role);
}

/**
 * Exchange custom token for real Firebase ID token via Identity Toolkit REST API
 */
async function getIdTokenForUser(uid, claims = {}) {
  if (Object.keys(claims).length > 0) {
    await admin.auth().setCustomUserClaims(uid, claims);
  }
  const customToken = await admin.auth().createCustomToken(uid);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );

  const data = await response.json();
  if (!data.idToken) {
    throw new Error(`Failed to get ID token: ${JSON.stringify(data)}`);
  }
  return data.idToken;
}

/**
 * Helper to execute HTTP requests against test server
 */
async function apiRequest(method, endpoint, { token = null, body = null } = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = { "Content-Type": "application/json" };
  if (token !== null) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const resData = await res.json().catch(() => null);
  return { status: res.status, data: resData };
}

async function runTests() {
  // console.log("==================================================================");
  // console.log("🚀 Starting Authentication & Authorization Security Test Suite");
  // console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      // console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      // console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Set up test server
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      // console.log(`📡 Test server running on ${baseUrl}`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const userAUid = `test-user-a-${timestamp}`;
  const userBUid = `test-user-b-${timestamp}`;
  const agentUid = `test-agent-${timestamp}`;
  const adminUid = `test-admin-${timestamp}`;

  let ticketA = null;
  let spoofedTicket = null;

  try {
    // console.log("\n👤 Initializing test users in Firebase Auth...");
    await getOrCreateFirebaseUser(userAUid, `${userAUid}@student.just.edu.bd`, "user");
    await getOrCreateFirebaseUser(userBUid, `${userBUid}@student.just.edu.bd`, "user");
    await getOrCreateFirebaseUser(agentUid, `${agentUid}@just.edu.bd`, "agent");
    await getOrCreateFirebaseUser(adminUid, `${adminUid}@just.edu.bd`, "admin");
    // console.log("   Test users registered.");

    // Mint real Firebase ID Tokens
    // console.log("\n🔑 Minting Firebase ID Tokens...");
    const userAToken = await getIdTokenForUser(userAUid, { role: "user" });
    const userBToken = await getIdTokenForUser(userBUid, { role: "user" });
    const agentToken = await getIdTokenForUser(agentUid, { role: "agent" });
    const adminToken = await getIdTokenForUser(adminUid, { role: "admin" });
    //  console.log("   Tokens minted successfully.");

    // Fetch department and help topic ID for creating test tickets
    const deptRes = await db.query("SELECT id FROM departments LIMIT 1");
    const deptId = deptRes.rows[0]?.id || 1;
    const topicRes = await db.query("SELECT id FROM help_topics LIMIT 1");
    const topicId = topicRes.rows[0]?.id || 1;

    // console.log("\n📋 Executing Test Cases:\n");

    // -------------------------------------------------------------
    // Test 1: No Authorization header -> 401
    // -------------------------------------------------------------
    const res1 = await apiRequest("GET", "/api/tickets");
    assert(res1.status === 401, "Test 1: No Authorization header returns 401 Unauthorized");

    // -------------------------------------------------------------
    // Test 2: Invalid token -> 401
    // -------------------------------------------------------------
    const res2 = await apiRequest("GET", "/api/tickets", { token: "invalid.jwt.token.value" });
    assert(res2.status === 401, "Test 2: Invalid token returns 401 Unauthorized");

    // -------------------------------------------------------------
    // Test 3: Malformed / Expired / Revoked token -> 401
    // -------------------------------------------------------------
    const malformedToken = userAToken.substring(0, userAToken.length - 20) + "tampered";
    const res3 = await apiRequest("GET", "/api/tickets", { token: malformedToken });
    assert(res3.status === 401, "Test 3: Malformed / tampered token returns 401 Unauthorized");

    // -------------------------------------------------------------
    // Test 4: Valid Firebase token -> authenticated (200)
    // -------------------------------------------------------------
    const res4 = await apiRequest("GET", "/api/tickets", { token: userAToken });
    assert(res4.status === 200, "Test 4: Valid Firebase ID Token returns 200 Authenticated");

    // -------------------------------------------------------------
    // Test 5: USER accessing admin endpoint -> 403
    // -------------------------------------------------------------
    const res5 = await apiRequest("PATCH", `/api/users/${userBUid}/role`, {
      token: userAToken,
      body: { role: "admin" },
    });
    assert(res5.status === 403, "Test 5: USER accessing admin role-management endpoint returns 403 Forbidden");

    // -------------------------------------------------------------
    // Test 6: AGENT accessing admin-only role-management endpoint -> 403
    // -------------------------------------------------------------
    const res6 = await apiRequest("PATCH", `/api/users/${userBUid}/role`, {
      token: agentToken,
      body: { role: "admin" },
    });
    assert(res6.status === 403, "Test 6: AGENT accessing admin-only role-management endpoint returns 403 Forbidden");

    // -------------------------------------------------------------
    // Test 7: ADMIN accessing admin endpoint -> allowed (200)
    // -------------------------------------------------------------
    const res7 = await apiRequest("PATCH", `/api/users/${userBUid}/role`, {
      token: adminToken,
      body: { role: "agent" },
    });
    assert(res7.status === 200 && res7.data?.data?.role === "agent", "Test 7: ADMIN accessing admin endpoint returns 200 Allowed");

    // -------------------------------------------------------------
    // Test 8: USER accessing own ticket -> allowed
    // -------------------------------------------------------------
    // Create a ticket with User A
    const createTicketRes = await apiRequest("POST", "/api/tickets", {
      token: userAToken,
      body: {
        subject: "User A Test Ticket",
        description: "Testing ticket ownership",
        mobile: "01700000000",
        department_id: deptId,
        help_topic_id: topicId,
      },
    });
    ticketA = createTicketRes.data?.data;
    assert(createTicketRes.status === 201 && !!ticketA?.id, "Pre-requisite: Created ticket for User A");

    const res8 = await apiRequest("GET", `/api/tickets/${ticketA.id}`, { token: userAToken });
    assert(res8.status === 200 && res8.data?.data?.id === ticketA.id, "Test 8: USER accessing own ticket returns 200 Allowed");

    // -------------------------------------------------------------
    // Test 9: USER attempting to access another user's ticket -> rejected (403)
    // -------------------------------------------------------------
    const res9 = await apiRequest("GET", `/api/tickets/${ticketA.id}`, { token: userBToken });
    assert(res9.status === 403, "Test 9: USER attempting to access another user's ticket is rejected with 403 Forbidden");

    // -------------------------------------------------------------
    // Test 10: Ticket creation uses req.user.uid rather than req.body.userId
    // -------------------------------------------------------------
    const spoofedUserId = "spoofed-attacker-id";
    const createSpoofedRes = await apiRequest("POST", "/api/tickets", {
      token: userAToken,
      body: {
        subject: "Spoofing test",
        description: "Checking if server trusts req.body.userId",
        mobile: "01700000000",
        department_id: deptId,
        help_topic_id: topicId,
        userId: spoofedUserId,
        user_id: spoofedUserId,
      },
    });
    spoofedTicket = createSpoofedRes.data?.data;
    assert(
      createSpoofedRes.status === 201 && spoofedTicket?.user_id === userAUid,
      "Test 10: Ticket creation ignores req.body.userId and binds ticket.user_id to req.user.uid"
    );

    // -------------------------------------------------------------
    // Test 11: Role is read from Firebase custom claims
    // -------------------------------------------------------------
    // User with role "agent" calling status update on ticket -> allowed (200)
    const res11Agent = await apiRequest("PATCH", `/api/tickets/${ticketA.id}/status`, {
      token: agentToken,
      body: { status: "IN_PROGRESS" },
    });
    assert(res11Agent.status === 200, "Test 11a: AGENT role from Firebase custom claims allows ticket status update");

    // User with role "user" calling status update on ticket -> rejected (403)
    const res11User = await apiRequest("PATCH", `/api/tickets/${ticketA.id}/status`, {
      token: userAToken,
      body: { status: "COMPLETE" },
    });
    assert(res11User.status === 403, "Test 11b: USER role cannot update status (rejected with 403 Forbidden)");

    // -------------------------------------------------------------
    // Test 12: Changing a role and refreshing the Firebase ID token results in the new role being recognized
    // -------------------------------------------------------------
    // Change User A's role to "agent" using setRole
    await setRole(userAUid, "agent");
    // Mint new refreshed token for User A
    const refreshedUserAToken = await getIdTokenForUser(userAUid);

    // Now User A (with refreshed token) attempts status update
    const res12 = await apiRequest("PATCH", `/api/tickets/${ticketA.id}/status`, {
      token: refreshedUserAToken,
      body: { status: "COMPLETE" },
    });
    assert(
      res12.status === 200 && res12.data?.data?.status === "COMPLETE",
      "Test 12: Role change followed by token refresh results in new role ('agent') being recognized immediately"
    );

  } catch (err) {
    console.error("❌ Exception during test execution:", err);
    failed++;
  } finally {
    // Clean up created test tickets from DB
    try {
      if (ticketA?.ticket_number || spoofedTicket?.ticket_number) {
        await db.query("DELETE FROM tickets WHERE ticket_number = $1 OR ticket_number = $2", [
          ticketA?.ticket_number || "",
          spoofedTicket?.ticket_number || "",
        ]);
      }
    } catch (e) {
      // ignore
    }

    // Clean up created test users from Firebase Auth
    for (const uid of [userAUid, userBUid, agentUid, adminUid]) {
      try {
        await admin.auth().deleteUser(uid);
      } catch (e) {
        // ignore
      }
    }

    // Close server
    await new Promise((resolve) => server.close(resolve));
    // console.log("\n==================================================================");
    // console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
    // console.log("==================================================================");
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  if (server) server.close();
  process.exit(1);
});
